import type {
  CandidateEvaluation,
  Phase13LocalSentinelSummary,
  Phase13QReviewSummary,
  Phase13QSentinelCandidateLink,
  Phase13QualityVector,
} from "../events.js";

export function buildPhase13QReviewSummary(
  selectedCandidateEvaluations: readonly CandidateEvaluation[],
  qualityVector: Phase13QualityVector,
): Phase13QReviewSummary {
  return {
    schemaVersion: 1,
    sentinelCandidateLinks: qualityVector.localSentinels.flatMap((sentinel) =>
      linkSentinelToSelectedCandidate(sentinel, selectedCandidateEvaluations, qualityVector),
    ),
  };
}

function linkSentinelToSelectedCandidate(
  sentinel: Phase13LocalSentinelSummary,
  selectedCandidateEvaluations: readonly CandidateEvaluation[],
  qualityVector: Phase13QualityVector,
): Phase13QSentinelCandidateLink[] {
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
  sentinel: Phase13LocalSentinelSummary,
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
  sentinel: Phase13LocalSentinelSummary,
): boolean {
  return (
    entry.startTick >= section.startTick &&
    entry.startTick < section.startTick + section.durationTicks &&
    (sentinel.voice === undefined || entry.voice === sentinel.voice)
  );
}

function entrySevereIntervalMatchesSentinel(
  interval: Phase13QualityVector["entrySevereIntervals"][number],
  sentinel: Phase13LocalSentinelSummary,
): boolean {
  return interval.voice === sentinel.voice && interval.representativeTick === sentinel.startTick;
}
