import type { CandidateEvaluation, NoteEvent } from "../events.js";
import {
  buildPhase7CandidateRiskContexts,
  explainCandidateRiskContexts,
  type Phase7CandidateRiskContexts,
} from "./candidate-risk-contexts.js";
import { analyzeScore } from "./diagnostics.js";
import type { Exposition } from "./types.js";

const EVALUATION_WEIGHTS = {
  hardFailure: 10_000,
  counterpoint: {
    parallelPerfect: 10,
    counterSubjectCoverage: 20,
    freeCounterpointCoverage: 10,
    counterSubjectInvertibility: 8,
  },
  melody: {
    leapRecoveryMiss: 35,
    melodicStagnation: 25,
    freeCounterpointContour: 12,
    ornamentDensity: 6,
  },
  texture: {
    samePitchOverlap: 4,
    unisonOverlap: 8,
    sameDirectionMotion: 3,
    fourBeatBassUpperSameDirection: 2,
    eightBeatBassUpperSameDirection: 1,
    fourBeatOuterVoiceSameDirection: 1,
    sharedRhythmOverlap: 2,
    voiceIndependenceSelectionUnisonOverlap: 8,
    voiceIndependenceSelectionSharedRhythmOverlap: 4,
    allVoiceSilenceGap: 25,
    rhythmicIndependence: 12,
    supportTextureRepetition: 8,
    expositionEntryStagger: 10,
    bassUpperContraryMotion: 1,
    outerVoiceContraryMotion: 1,
  },
  subjectClarity: {
    subjectIdentityViolation: 10_000,
    answerPlanViolation: 1_000,
    counterSubjectIdentityRetention: 30,
    modalCounterSubjectIdentitySelection: 20,
  },
  harmony: {
    entryInstability: 1,
    severeEntryInterval: 1,
    unresolvedSevereEntryInterval: 2,
    unresolvedDissonance: 100,
    strongBeatDissonance: 50,
    predominantDirectionMiss: 30,
    unresolvedAmbiguity: 30,
    controlledAmbiguity: 10,
    styleModulationFit: 8,
    harmonicFunctionMatch: 1,
  },
  form: {
    formRepetition: 50,
    episodeDirection: 10,
    strettoClarity: 10,
  },
} as const;

export function evaluateCandidate(previousNotes: readonly NoteEvent[], candidate: Exposition): CandidateEvaluation {
  const recentNotes = previousNotes.slice(-64);
  const candidateNotes = [...recentNotes, ...candidate.notes];
  const diagnostics = analyzeScore(candidateNotes, candidate.subjectEntries, candidate.sectionPlans);
  const riskContexts = buildPhase7CandidateRiskContexts(candidateNotes, candidate, diagnostics);
  const explanations = explainCandidateRiskContexts(riskContexts);

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
    cost: diagnostics.parallelPerfects * EVALUATION_WEIGHTS.counterpoint.parallelPerfect,
    reward:
      diagnostics.counterSubjectCoverage * EVALUATION_WEIGHTS.counterpoint.counterSubjectCoverage +
      diagnostics.freeCounterpointCoverage * EVALUATION_WEIGHTS.counterpoint.freeCounterpointCoverage +
      diagnostics.counterSubjectInvertibilityScore * EVALUATION_WEIGHTS.counterpoint.counterSubjectInvertibility,
    features: {
      counterSubjectCoverage: diagnostics.counterSubjectCoverage,
      freeCounterpointCoverage: diagnostics.freeCounterpointCoverage,
      counterSubjectInvertibilityScore: diagnostics.counterSubjectInvertibilityScore,
      parallelPerfects: diagnostics.parallelPerfects,
    },
  };
  const melody = {
    cost:
      diagnostics.leapRecoveryMisses * EVALUATION_WEIGHTS.melody.leapRecoveryMiss +
      diagnostics.melodicStagnationWarnings * EVALUATION_WEIGHTS.melody.melodicStagnation,
    reward:
      diagnostics.freeCounterpointContourScore * EVALUATION_WEIGHTS.melody.freeCounterpointContour +
      diagnostics.ornamentDensity * EVALUATION_WEIGHTS.melody.ornamentDensity,
    features: {
      leapRecoveryMisses: diagnostics.leapRecoveryMisses,
      melodicStagnationWarnings: diagnostics.melodicStagnationWarnings,
      freeCounterpointContourScore: diagnostics.freeCounterpointContourScore,
      ornamentDensity: diagnostics.ornamentDensity,
    },
  };
  const voiceIndependenceSelectionCost =
    diagnostics.unisonOverlapCount * EVALUATION_WEIGHTS.texture.voiceIndependenceSelectionUnisonOverlap +
    diagnostics.sharedRhythmOverlapCount * EVALUATION_WEIGHTS.texture.voiceIndependenceSelectionSharedRhythmOverlap;
  const texture = {
    cost:
      diagnostics.samePitchOverlapCount * EVALUATION_WEIGHTS.texture.samePitchOverlap +
      diagnostics.unisonOverlapCount * EVALUATION_WEIGHTS.texture.unisonOverlap +
      diagnostics.sameDirectionMotionCount * EVALUATION_WEIGHTS.texture.sameDirectionMotion +
      diagnostics.pitchContourMotion.fourBeat.bassUpperSameDirectionRatio *
        EVALUATION_WEIGHTS.texture.fourBeatBassUpperSameDirection +
      diagnostics.pitchContourMotion.eightBeat.bassUpperSameDirectionRatio *
        EVALUATION_WEIGHTS.texture.eightBeatBassUpperSameDirection +
      diagnostics.pitchContourMotion.fourBeat.outerVoiceSameDirectionRatio *
        EVALUATION_WEIGHTS.texture.fourBeatOuterVoiceSameDirection +
      diagnostics.sharedRhythmOverlapCount * EVALUATION_WEIGHTS.texture.sharedRhythmOverlap +
      diagnostics.allVoiceSilenceGapCount * EVALUATION_WEIGHTS.texture.allVoiceSilenceGap,
    reward:
      diagnostics.rhythmicIndependenceScore * EVALUATION_WEIGHTS.texture.rhythmicIndependence +
      diagnostics.supportTextureRepetitionScore * EVALUATION_WEIGHTS.texture.supportTextureRepetition +
      diagnostics.expositionEntryStaggerScore * EVALUATION_WEIGHTS.texture.expositionEntryStagger +
      diagnostics.pitchContourMotion.fourBeat.bassUpperContraryRatio *
        EVALUATION_WEIGHTS.texture.bassUpperContraryMotion +
      diagnostics.pitchContourMotion.eightBeat.bassUpperContraryRatio *
        EVALUATION_WEIGHTS.texture.bassUpperContraryMotion +
      diagnostics.pitchContourMotion.fourBeat.outerVoiceContraryRatio *
        EVALUATION_WEIGHTS.texture.outerVoiceContraryMotion,
    features: {
      rhythmicIndependenceScore: diagnostics.rhythmicIndependenceScore,
      supportTextureRepetitionScore: diagnostics.supportTextureRepetitionScore,
      expositionEntryStaggerScore: diagnostics.expositionEntryStaggerScore,
      samePitchOverlapCount: diagnostics.samePitchOverlapCount,
      unisonOverlapCount: diagnostics.unisonOverlapCount,
      sameDirectionMotionCount: diagnostics.sameDirectionMotionCount,
      fourBeatBassUpperSameDirectionRatio: diagnostics.pitchContourMotion.fourBeat.bassUpperSameDirectionRatio,
      fourBeatBassUpperContraryRatio: diagnostics.pitchContourMotion.fourBeat.bassUpperContraryRatio,
      eightBeatBassUpperSameDirectionRatio: diagnostics.pitchContourMotion.eightBeat.bassUpperSameDirectionRatio,
      eightBeatBassUpperContraryRatio: diagnostics.pitchContourMotion.eightBeat.bassUpperContraryRatio,
      fourBeatOuterVoiceSameDirectionRatio: diagnostics.pitchContourMotion.fourBeat.outerVoiceSameDirectionRatio,
      fourBeatOuterVoiceContraryRatio: diagnostics.pitchContourMotion.fourBeat.outerVoiceContraryRatio,
      sharedRhythmOverlapCount: diagnostics.sharedRhythmOverlapCount,
      selectedVoiceIndependenceSelectionCost: voiceIndependenceSelectionCost,
      shortStrongBeatEntryNoteCount: diagnostics.shortStrongBeatEntryNoteCount,
      entrySupportInstabilityCount: diagnostics.entrySupportInstabilityCount,
      allVoiceSilenceGapCount: diagnostics.allVoiceSilenceGapCount,
    },
  };
  const subjectClarity = {
    cost:
      diagnostics.subjectIdentityViolations * EVALUATION_WEIGHTS.subjectClarity.subjectIdentityViolation +
      diagnostics.answerPlanViolations * EVALUATION_WEIGHTS.subjectClarity.answerPlanViolation,
    reward:
      diagnostics.counterSubjectIdentityRetention * EVALUATION_WEIGHTS.subjectClarity.counterSubjectIdentityRetention +
      modalCounterSubjectIdentitySelectionReward(
        diagnostics.counterSubjectIdentityRetention,
        diagnostics.modalContextCount,
      ),
    features: {
      subjectIdentityViolations: diagnostics.subjectIdentityViolations,
      answerPlanViolations: diagnostics.answerPlanViolations,
      counterSubjectIdentityRetention: diagnostics.counterSubjectIdentityRetention,
      selectedModalCounterSubjectIdentityReward: modalCounterSubjectIdentitySelectionReward(
        diagnostics.counterSubjectIdentityRetention,
        diagnostics.modalContextCount,
      ),
    },
  };
  const entryHarmonyRiskCost = scoreBalancedEntryHarmonyRisk(riskContexts);
  const harmony = {
    cost:
      entryHarmonyRiskCost +
      diagnostics.unresolvedDissonanceCount * EVALUATION_WEIGHTS.harmony.unresolvedDissonance +
      diagnostics.strongBeatDissonanceCount * EVALUATION_WEIGHTS.harmony.strongBeatDissonance +
      diagnostics.predominantDirectionMisses * EVALUATION_WEIGHTS.harmony.predominantDirectionMiss +
      diagnostics.unresolvedAmbiguityWarnings * EVALUATION_WEIGHTS.harmony.unresolvedAmbiguity,
    reward:
      diagnostics.controlledAmbiguityScore * EVALUATION_WEIGHTS.harmony.controlledAmbiguity +
      diagnostics.styleModulationFit * EVALUATION_WEIGHTS.harmony.styleModulationFit +
      diagnostics.harmonicFunctionMatches * EVALUATION_WEIGHTS.harmony.harmonicFunctionMatch,
    features: {
      unresolvedDissonanceCount: diagnostics.unresolvedDissonanceCount,
      predominantDirectionMisses: diagnostics.predominantDirectionMisses,
      controlledAmbiguityScore: diagnostics.controlledAmbiguityScore,
      styleModulationFit: diagnostics.styleModulationFit,
      modalContextCount: diagnostics.modalContextCount,
      modalCharacteristicToneHits: diagnostics.modalCharacteristicToneHits,
      modalCadenceHits: diagnostics.modalCadenceHits,
      tonalCadenceOveruseWarnings: diagnostics.tonalCadenceOveruseWarnings,
      entrySupportInstabilityCount: diagnostics.entrySupportInstabilityCount,
      severeEntryIntervalCount: diagnostics.severeEntryIntervalCount,
      unresolvedSevereEntryIntervalCount: diagnostics.unresolvedSevereEntryIntervalCount,
      selectedEntryHarmonyRiskCost: entryHarmonyRiskCost,
    },
  };
  const form = {
    cost: diagnostics.formRepetitionWarnings * EVALUATION_WEIGHTS.form.formRepetition,
    reward:
      diagnostics.episodeDirectionScore * EVALUATION_WEIGHTS.form.episodeDirection +
      diagnostics.strettoClarityScore * EVALUATION_WEIGHTS.form.strettoClarity,
    features: {
      formRepetitionWarnings: diagnostics.formRepetitionWarnings,
      episodeDirectionScore: diagnostics.episodeDirectionScore,
      strettoClarityScore: diagnostics.strettoClarityScore,
    },
  };
  const totalCost =
    hardFailures.length * EVALUATION_WEIGHTS.hardFailure +
    counterpoint.cost -
    counterpoint.reward +
    melody.cost -
    melody.reward +
    texture.cost -
    texture.reward +
    voiceIndependenceSelectionCost +
    subjectClarity.cost -
    subjectClarity.reward +
    harmony.cost -
    harmony.reward +
    form.cost -
    form.reward;

  return {
    featureVersion: 1,
    evaluationModelVersion: 4,
    totalCost: Math.round(totalCost * 1000) / 1000,
    hardFailures,
    explanations,
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

function modalCounterSubjectIdentitySelectionReward(
  counterSubjectIdentityRetention: number,
  modalContextCount: number,
): number {
  if (modalContextCount === 0) {
    return 0;
  }

  return counterSubjectIdentityRetention * EVALUATION_WEIGHTS.subjectClarity.modalCounterSubjectIdentitySelection;
}

function scoreBalancedEntryHarmonyRisk(contexts: Phase7CandidateRiskContexts): number {
  return contexts.entryIntervalSupport.entries.reduce(
    (sum, entry) =>
      sum +
      entry.instabilityCount * EVALUATION_WEIGHTS.harmony.entryInstability +
      entry.severeIntervalCount * EVALUATION_WEIGHTS.harmony.severeEntryInterval +
      entry.unresolvedSevereIntervalCount * EVALUATION_WEIGHTS.harmony.unresolvedSevereEntryInterval,
    0,
  );
}
