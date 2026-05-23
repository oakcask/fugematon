import type {
  CandidateEvaluation,
  LocalSentinelCandidateTraceSummary,
  LocalSentinelSummary,
  QualityVector,
  SentinelCandidateLink,
} from "../events.js";

export function buildLocalSentinelCandidateTraceSummary(
  selectedCandidateEvaluations: readonly CandidateEvaluation[],
  qualityVector: QualityVector,
): LocalSentinelCandidateTraceSummary {
  return {
    schemaVersion: 1,
    sentinelCandidateLinks: qualityVector.localSentinels.flatMap((sentinel) =>
      linkSentinelToSelectedCandidate(sentinel, selectedCandidateEvaluations, qualityVector),
    ),
  };
}

function linkSentinelToSelectedCandidate(
  sentinel: LocalSentinelSummary,
  selectedCandidateEvaluations: readonly CandidateEvaluation[],
  qualityVector: QualityVector,
): SentinelCandidateLink[] {
  const section = selectedCandidateEvaluations
    .flatMap((evaluation) => evaluation.explanations.sections)
    .find((candidateSection) => sectionContainsSentinel(candidateSection, sentinel));
  if (section === undefined) {
    return [];
  }

  const entry = selectedCandidateEvaluations
    .flatMap((evaluation) => evaluation.explanations.entries)
    .find((candidateEntry) => entryBelongsToSentinelSection(candidateEntry, section, sentinel));
  const severeInterval = qualityVector.entrySevereIntervals.find((interval) =>
    entrySevereIntervalMatchesSentinel(interval, sentinel),
  );

  return [
    {
      sentinelKind: sentinel.kind,
      sentinelStartTick: sentinel.startTick,
      sentinelDurationTicks: sentinel.durationTicks,
      sectionState: section.state,
      sectionStartTick: section.startTick,
      sectionDurationTicks: section.durationTicks,
      cadenceKind: section.cadenceKind,
      voicePair: sentinel.voicePair,
      voice: sentinel.voice,
      entryForm: entry?.form,
      entryStartTick: entry?.startTick,
      resolutionDeadlineTicks: severeInterval?.resolutionDeadlineTicks,
    },
  ];
}

function sectionContainsSentinel(
  section: CandidateEvaluation["explanations"]["sections"][number],
  sentinel: LocalSentinelSummary,
): boolean {
  return (
    sentinel.startTick >= section.startTick &&
    sentinel.startTick < section.startTick + section.durationTicks &&
    (sentinel.sectionRole === "mixed" || sentinel.sectionRole === section.state)
  );
}

function entryBelongsToSentinelSection(
  entry: CandidateEvaluation["explanations"]["entries"][number],
  section: CandidateEvaluation["explanations"]["sections"][number],
  sentinel: LocalSentinelSummary,
): boolean {
  return (
    entry.startTick >= section.startTick &&
    entry.startTick < section.startTick + section.durationTicks &&
    (sentinel.voice === undefined || entry.voice === sentinel.voice)
  );
}

function entrySevereIntervalMatchesSentinel(
  interval: QualityVector["entrySevereIntervals"][number],
  sentinel: LocalSentinelSummary,
): boolean {
  return interval.voice === sentinel.voice && interval.representativeTick === sentinel.startTick;
}
