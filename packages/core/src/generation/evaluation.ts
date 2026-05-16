import type { CandidateEvaluation, NoteEvent } from "../events.js";
import { analyzeScore } from "./diagnostics.js";
import type { Exposition } from "./types.js";

export function evaluateCandidate(previousNotes: readonly NoteEvent[], candidate: Exposition): CandidateEvaluation {
  const recentNotes = previousNotes.slice(-64);
  const diagnostics = analyzeScore(
    [...recentNotes, ...candidate.notes],
    candidate.subjectEntries,
    candidate.sectionPlans,
  );

  const hardFailures = diagnostics.issues
    .filter(
      (issue) =>
        issue.code === "range-violation" ||
        issue.code === "voice-crossing" ||
        issue.code === "subject-identity-violation" ||
        issue.code === "answer-plan-violation" ||
        issue.code === "key-metadata-mismatch",
    )
    .map((issue) => issue.code);
  const counterpoint = {
    cost: diagnostics.parallelPerfects * 10,
    reward:
      diagnostics.counterSubjectCoverage * 20 +
      diagnostics.freeCounterpointCoverage * 10 +
      diagnostics.counterSubjectInvertibilityScore * 8,
    features: {
      counterSubjectCoverage: diagnostics.counterSubjectCoverage,
      freeCounterpointCoverage: diagnostics.freeCounterpointCoverage,
      counterSubjectInvertibilityScore: diagnostics.counterSubjectInvertibilityScore,
      parallelPerfects: diagnostics.parallelPerfects,
    },
  };
  const melody = {
    cost: diagnostics.leapRecoveryMisses * 35 + diagnostics.melodicStagnationWarnings * 25,
    reward: diagnostics.freeCounterpointContourScore * 12 + diagnostics.ornamentDensity * 6,
    features: {
      leapRecoveryMisses: diagnostics.leapRecoveryMisses,
      melodicStagnationWarnings: diagnostics.melodicStagnationWarnings,
      freeCounterpointContourScore: diagnostics.freeCounterpointContourScore,
      ornamentDensity: diagnostics.ornamentDensity,
    },
  };
  const texture = {
    cost:
      diagnostics.samePitchOverlapCount * 4 +
      diagnostics.unisonOverlapCount * 8 +
      diagnostics.sameDirectionMotionCount * 3 +
      diagnostics.sharedRhythmOverlapCount * 2 +
      diagnostics.allVoiceSilenceGapCount * 25,
    reward:
      diagnostics.rhythmicIndependenceScore * 12 +
      diagnostics.supportTextureRepetitionScore * 8 +
      diagnostics.expositionEntryStaggerScore * 10,
    features: {
      rhythmicIndependenceScore: diagnostics.rhythmicIndependenceScore,
      supportTextureRepetitionScore: diagnostics.supportTextureRepetitionScore,
      expositionEntryStaggerScore: diagnostics.expositionEntryStaggerScore,
      samePitchOverlapCount: diagnostics.samePitchOverlapCount,
      sharedRhythmOverlapCount: diagnostics.sharedRhythmOverlapCount,
      allVoiceSilenceGapCount: diagnostics.allVoiceSilenceGapCount,
    },
  };
  const subjectClarity = {
    cost: diagnostics.subjectIdentityViolations * 10_000 + diagnostics.answerPlanViolations * 1_000,
    reward: diagnostics.counterSubjectIdentityRetention * 10,
    features: {
      subjectIdentityViolations: diagnostics.subjectIdentityViolations,
      answerPlanViolations: diagnostics.answerPlanViolations,
      counterSubjectIdentityRetention: diagnostics.counterSubjectIdentityRetention,
    },
  };
  const harmony = {
    cost:
      diagnostics.unresolvedDissonanceCount * 100 +
      diagnostics.strongBeatDissonanceCount * 50 +
      diagnostics.predominantDirectionMisses * 30 +
      diagnostics.unresolvedAmbiguityWarnings * 30,
    reward:
      diagnostics.controlledAmbiguityScore * 10 +
      diagnostics.styleModulationFit * 8 +
      diagnostics.harmonicFunctionMatches,
    features: {
      unresolvedDissonanceCount: diagnostics.unresolvedDissonanceCount,
      predominantDirectionMisses: diagnostics.predominantDirectionMisses,
      controlledAmbiguityScore: diagnostics.controlledAmbiguityScore,
      styleModulationFit: diagnostics.styleModulationFit,
      modalContextCount: diagnostics.modalContextCount,
      modalCharacteristicToneHits: diagnostics.modalCharacteristicToneHits,
      modalCadenceHits: diagnostics.modalCadenceHits,
      tonalCadenceOveruseWarnings: diagnostics.tonalCadenceOveruseWarnings,
    },
  };
  const form = {
    cost: diagnostics.formRepetitionWarnings * 50,
    reward: diagnostics.episodeDirectionScore * 10 + diagnostics.strettoClarityScore * 10,
    features: {
      formRepetitionWarnings: diagnostics.formRepetitionWarnings,
      episodeDirectionScore: diagnostics.episodeDirectionScore,
      strettoClarityScore: diagnostics.strettoClarityScore,
    },
  };
  const totalCost =
    hardFailures.length * 10_000 +
    counterpoint.cost -
    counterpoint.reward +
    melody.cost -
    melody.reward +
    texture.cost -
    texture.reward +
    subjectClarity.cost -
    subjectClarity.reward +
    harmony.cost -
    harmony.reward +
    form.cost -
    form.reward;

  return {
    totalCost: Math.round(totalCost * 1000) / 1000,
    hardFailures,
    dimensions: {
      counterpoint,
      melody,
      texture,
      subjectClarity,
      harmony,
      form,
    },
  };
}
