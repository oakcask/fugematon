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
    .find(
      (candidateSection) =>
        sentinel.startTick >= candidateSection.startTick &&
        sentinel.startTick < candidateSection.startTick + candidateSection.durationTicks &&
        (sentinel.sectionRole === "mixed" || sentinel.sectionRole === candidateSection.state),
    );
  if (section === undefined) {
    return [];
  }

  const entry = selectedCandidateEvaluations
    .flatMap((evaluation) => evaluation.explanations.entries)
    .find(
      (candidateEntry) =>
        candidateEntry.startTick >= section.startTick &&
        candidateEntry.startTick < section.startTick + section.durationTicks &&
        (sentinel.voice === undefined || candidateEntry.voice === sentinel.voice),
    );
  const severeInterval = qualityVector.entrySevereIntervals.find(
    (interval) => interval.voice === sentinel.voice && interval.startTick === sentinel.startTick,
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
