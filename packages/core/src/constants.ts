import type { SelectionModel } from "./events.js";

export const GENERATOR_VERSION = 4;

export const TICKS_PER_QUARTER = 480;

export const VOICES = ["soprano", "alto", "tenor", "bass"] as const;

export const VOICE_RANGES = {
  soprano: { min: 60, max: 81 },
  alto: { min: 55, max: 74 },
  tenor: { min: 48, max: 67 },
  bass: { min: 36, max: 60 },
} as const;

export const DEFAULT_SELECTION_MODEL = "section-local-planner" satisfies SelectionModel;

export const EXPOSITION_DIAGNOSTICS_PROFILE = {
  rangeViolations: 0,
  voiceCrossings: 0,
} as const;

export const EXPOSITION_REPRESENTATIVE_SEEDS = [
  { seed: "bach-001", category: "fixed" },
  { seed: "fugue-smoke", category: "fixed" },
  { seed: "minor-entry", category: "boundary" },
  { seed: "wide-key", category: "boundary" },
] as const;

export const FUGUE_FORM_REVIEW_LENGTH_TICKS = TICKS_PER_QUARTER * 270;

export const FUGUE_FORM_DIAGNOSTICS_PROFILE = {
  rangeViolations: 0,
  voiceCrossings: 0,
  maxParallelPerfectsPerMinute: 12,
  minSubjectReturns: 2,
  minStrettoEntries: 2,
  maxGenerationMilliseconds: 1720,
} as const;

export const FUGUE_FORM_REPRESENTATIVE_SEEDS = [
  { seed: "bach-001", category: "fixed" },
  { seed: "fugue-smoke", category: "fixed" },
  { seed: "minor-entry", category: "boundary" },
  { seed: "wide-key", category: "boundary" },
  { seed: "dense-entry", category: "boundary" },
  { seed: "stretto-smoke", category: "fixed" },
] as const;

export const SUBJECT_ANSWER_PLAN_DIAGNOSTICS_PROFILE = {
  rangeViolations: 0,
  voiceCrossings: 0,
  subjectIdentityViolations: 0,
  answerPlanViolations: 0,
  keyMetadataMismatches: 0,
} as const;

export const SUBJECT_ANSWER_PLAN_REPRESENTATIVE_SEEDS = FUGUE_FORM_REPRESENTATIVE_SEEDS;

export const REVIEW_LENGTH_TICKS = TICKS_PER_QUARTER * 270;

export const REPRESENTATIVE_REVIEW_SEEDS = [
  { seed: "bach-001", category: "representative" },
  { seed: "fugue-smoke", category: "representative" },
  { seed: "minor-entry", category: "boundary" },
  { seed: "wide-key", category: "boundary" },
  { seed: "lyrical-line", category: "review" },
  { seed: "modal-dorian", category: "review" },
  { seed: "circle-fifths", category: "review" },
  { seed: "close-imitation", category: "review" },
  { seed: "sparse-cadence", category: "review" },
  { seed: "bright-answer", category: "review" },
  { seed: "dark-episode", category: "review" },
  { seed: "ornament-test", category: "review" },
  { seed: "long-arc", category: "review" },
  { seed: "contrary-motion", category: "review" },
] as const;

export const ROTATION_REVIEW_SEEDS = [
  { seed: "restless-line", category: "rotation" },
  { seed: "tight-stretto", category: "rotation" },
  { seed: "quiet-cadence", category: "rotation" },
  { seed: "angular-answer", category: "rotation" },
  { seed: "modal-answer", category: "rotation" },
  { seed: "modal-cadence", category: "rotation" },
  { seed: "contrary-answer", category: "adversarial" },
  { seed: "dense-modal", category: "adversarial" },
] as const;

export const COUNTERPOINT_HARMONY_DIAGNOSTICS_PROFILE = {
  rangeViolations: 0,
  voiceCrossings: 0,
  subjectIdentityViolations: 0,
  answerPlanViolations: 0,
  keyMetadataMismatches: 0,
  minCounterSubjectCoverage: 0.75,
  minFreeCounterpointCoverage: 0.75,
  fallbackPassageCount: 0,
  maxMelodicStagnationWarnings: 0,
  maxLeapRecoveryMissesPerMinute: 18,
  maxUnresolvedDissonanceCount: 0,
  maxStrongBeatDissonanceCount: 0,
  cadenceTargetMisses: 0,
  leadingToneResolutionMisses: 0,
  dominantResolutionMisses: 0,
  predominantDirectionMisses: 0,
  harmonicFunctionMismatches: 0,
  minControlledAmbiguityScore: 0.8,
  maxUnresolvedAmbiguityWarnings: 0,
  minStyleModulationFit: 0.8,
  maxFormRepetitionWarnings: 0,
  minEpisodeDirectionScore: 0.8,
  minStrettoClarityScore: 0.8,
} as const;

export const BEAUTY_TEXTURE_DIAGNOSTICS_PROFILE = {
  minCounterSubjectIdentityRetention: 0.82,
  minCounterSubjectInvertibilityScore: 0.6,
  minFreeCounterpointContourScore: 0.5,
  minRhythmicIndependenceScore: 0.05,
  minSupportTextureRepetitionScore: 0.9,
  minExpositionEntryStaggerScore: 1,
  maxAllVoiceSilenceGapCount: 0,
  minOrnamentDensity: 0.1,
} as const;

export const MODAL_CONTEXT_DIAGNOSTICS_PROFILE = {
  minModalContextCount: 1,
  minModalCharacteristicToneHits: 1,
  minModalCadenceHits: 1,
  maxTonalCadenceOveruseWarnings: 0,
} as const;

export const BASELINE_BEAUTY_DIAGNOSTICS_PROFILE = {
  minCounterSubjectIdentityRetention: 0.528,
  minRhythmicIndependenceScore: 0,
  maxUnisonOverlapCount: 830,
  maxSameDirectionMotionCount: 884,
  maxSharedRhythmOverlapCount: 1031,
  maxLeapRecoveryMisses: 46,
  maxSelectedCandidateTextureCost: 1173,
  maxAverageSelectedCandidateTextureCost: 952,
  maxSelectedCandidateMelodyCost: 385,
  maxAverageSelectedCandidateMelodyCost: 133,
  boundarySeeds: {
    "modal-dorian": {
      minCounterSubjectIdentityRetention: 0.58,
      minModalContextCount: 1,
      minModalCharacteristicToneHits: 1,
      minModalCadenceHits: 1,
    },
    "close-imitation": {
      minCounterSubjectIdentityRetention: 0.84,
      maxSharedRhythmOverlapCount: 817,
    },
    "sparse-cadence": {
      maxLeapRecoveryMisses: 22,
      minCounterSubjectIdentityRetention: 0.906,
    },
    "ornament-test": {
      minOrnamentDensity: 0.1,
      maxSelectedCandidateTextureCost: 1106,
    },
  },
} as const;

export const VOICE_INDEPENDENCE_DIAGNOSTICS_PROFILE = {
  minRhythmicIndependenceScore: 0,
  maxUnisonOverlapCount: 830,
  maxSameDirectionMotionCount: 884,
  maxSharedRhythmOverlapCount: 1031,
  maxShortStrongBeatEntryNoteCount: 42,
  maxEntrySupportInstabilityCount: 146,
  boundarySeeds: {
    "fugue-smoke": {
      maxShortStrongBeatEntryNoteCount: 42,
      maxEntrySupportInstabilityCount: 146,
    },
    "modal-dorian": {
      minCounterSubjectIdentityRetention: 0.58,
      maxEntrySupportInstabilityCount: 124,
    },
    "close-imitation": {
      maxShortStrongBeatEntryNoteCount: 33,
      maxSharedRhythmOverlapCount: 817,
    },
  },
} as const;

export const ROTATION_ROBUSTNESS_DIAGNOSTICS_PROFILE = {
  minCounterSubjectIdentityRetention: 0.528,
  minRhythmicIndependenceScore: 0,
  maxUnisonOverlapCount: 830,
  maxSameDirectionMotionCount: 884,
  maxSharedRhythmOverlapCount: 1031,
  maxLeapRecoveryMisses: 46,
  maxShortStrongBeatEntryNoteCount: 42,
  maxEntrySupportInstabilityCount: 160,
  maxEntrySupportInstabilityPerEntry: 4,
  maxConsecutiveEntrySupportInstabilities: 4,
  maxUnresolvedEntrySupportInstabilityCount: 160,
  minSelectedCandidateEvaluationCount: 1,
  followUpMargin: 0,
  modalRotationSeeds: {
    "angular-answer": {
      minCounterSubjectIdentityRetention: 0.563,
      maxSameDirectionMotionCount: 814,
      maxLeapRecoveryMisses: 46,
      minModalContextCount: 1,
    },
    "modal-answer": {
      minCounterSubjectIdentityRetention: 0.528,
      maxSameDirectionMotionCount: 814,
      maxLeapRecoveryMisses: 46,
      minModalContextCount: 1,
    },
    "modal-cadence": {
      minCounterSubjectIdentityRetention: 0.554,
      maxSameDirectionMotionCount: 814,
      maxLeapRecoveryMisses: 46,
      minModalContextCount: 1,
    },
    "dense-modal": {
      minCounterSubjectIdentityRetention: 0.572,
      maxSameDirectionMotionCount: 814,
      maxLeapRecoveryMisses: 34,
      minModalContextCount: 1,
    },
  },
} as const;

export const MELODY_TEXTURE_DIAGNOSTICS_PROFILE = {
  maxLeapRecoveryMisses: 46,
  maxSamePitchOverlapCount: 52,
  maxSevereEntryIntervalCount: 108,
  maxUnresolvedSevereEntryIntervalCount: 100,
  maxUnsupportedSoloRunCount: 17,
  maxAbruptTextureDropCount: 17,
  maxSoloVoiceImbalance: 30,
  minOrnamentPlacementReasonCount: 1,
  maxExpositionDurationTicks: TICKS_PER_QUARTER * 20,
  maxFirstContinuationStartTick: TICKS_PER_QUARTER * 20,
} as const;

export const CONTOUR_MOTION_DIAGNOSTICS_PROFILE = {
  maxFourBeatBassUpperSameDirectionRatio: 0.735,
  minFourBeatBassUpperContraryRatio: 0.265,
  maxEightBeatBassUpperSameDirectionRatio: 0.691,
  minEightBeatBassUpperContraryRatio: 0.309,
  maxFourBeatOuterVoiceSameDirectionRatio: 1,
  minFourBeatOuterVoiceContraryRatio: 0,
  minContourComparisonCount: 1,
} as const;
