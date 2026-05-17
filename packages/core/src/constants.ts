export const GENERATOR_VERSION = 3;

export const TICKS_PER_QUARTER = 480;

export const VOICES = ["soprano", "alto", "tenor", "bass"] as const;

export const VOICE_RANGES = {
  soprano: { min: 60, max: 81 },
  alto: { min: 55, max: 74 },
  tenor: { min: 48, max: 67 },
  bass: { min: 36, max: 60 },
} as const;

export const DEFAULT_GENERATION_PARAMETERS = {
  strictness: 0.8,
  density: 0.5,
  subjectPresence: 0.7,
} as const;

export const PHASE_1_DIAGNOSTICS_PROFILE = {
  rangeViolations: 0,
  voiceCrossings: 0,
} as const;

export const PHASE_1_REPRESENTATIVE_SEEDS = [
  { seed: "bach-001", category: "fixed" },
  { seed: "fugue-smoke", category: "fixed" },
  { seed: "minor-entry", category: "boundary" },
  { seed: "wide-key", category: "boundary" },
] as const;

export const PHASE_3_LENGTH_TICKS = TICKS_PER_QUARTER * 270;

export const PHASE_3_DIAGNOSTICS_PROFILE = {
  rangeViolations: 0,
  voiceCrossings: 0,
  maxParallelPerfectsPerMinute: 12,
  minSubjectReturns: 2,
  minStrettoEntries: 2,
  maxGenerationMilliseconds: 1000,
} as const;

export const PHASE_3_REPRESENTATIVE_SEEDS = [
  { seed: "bach-001", category: "fixed" },
  { seed: "fugue-smoke", category: "fixed" },
  { seed: "minor-entry", category: "boundary" },
  { seed: "wide-key", category: "boundary" },
  { seed: "dense-entry", category: "boundary" },
  { seed: "stretto-smoke", category: "fixed" },
] as const;

export const PHASE_4_DIAGNOSTICS_PROFILE = {
  rangeViolations: 0,
  voiceCrossings: 0,
  subjectIdentityViolations: 0,
  answerPlanViolations: 0,
  keyMetadataMismatches: 0,
} as const;

export const PHASE_4_REPRESENTATIVE_SEEDS = PHASE_3_REPRESENTATIVE_SEEDS;

export const PHASE_5_LENGTH_TICKS = TICKS_PER_QUARTER * 270;

export const PHASE_5_REVIEW_SEEDS = [
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

export const PHASE_5_11_ROTATION_SEEDS = [
  { seed: "restless-line", category: "rotation" },
  { seed: "tight-stretto", category: "rotation" },
  { seed: "quiet-cadence", category: "rotation" },
  { seed: "angular-answer", category: "rotation" },
  { seed: "modal-answer", category: "rotation" },
  { seed: "modal-cadence", category: "rotation" },
  { seed: "contrary-answer", category: "adversarial" },
  { seed: "dense-modal", category: "adversarial" },
] as const;

export const PHASE_5_DIAGNOSTICS_PROFILE = {
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

export const PHASE_5_6_DIAGNOSTICS_PROFILE = {
  minCounterSubjectIdentityRetention: 0.85,
  minCounterSubjectInvertibilityScore: 0.6,
  minFreeCounterpointContourScore: 0.5,
  minRhythmicIndependenceScore: 0.05,
  minSupportTextureRepetitionScore: 0.9,
  minExpositionEntryStaggerScore: 1,
  maxAllVoiceSilenceGapCount: 0,
  minOrnamentDensity: 0.1,
} as const;

export const PHASE_5_7_DIAGNOSTICS_PROFILE = {
  minModalContextCount: 1,
  minModalCharacteristicToneHits: 1,
  minModalCadenceHits: 1,
  maxTonalCadenceOveruseWarnings: 0,
} as const;

export const PHASE_5_9_DIAGNOSTICS_PROFILE = {
  minCounterSubjectIdentityRetention: 0.58,
  minRhythmicIndependenceScore: 0.08,
  maxUnisonOverlapCount: 762,
  maxSameDirectionMotionCount: 661,
  maxSharedRhythmOverlapCount: 906,
  maxLeapRecoveryMisses: 31,
  maxSelectedCandidateTextureCost: 1051,
  maxAverageSelectedCandidateTextureCost: 805,
  maxSelectedCandidateMelodyCost: 315,
  maxAverageSelectedCandidateMelodyCost: 76,
  boundarySeeds: {
    "modal-dorian": {
      minCounterSubjectIdentityRetention: 0.58,
      minModalContextCount: 1,
      minModalCharacteristicToneHits: 1,
      minModalCadenceHits: 1,
    },
    "close-imitation": {
      minCounterSubjectIdentityRetention: 0.84,
      maxSharedRhythmOverlapCount: 814,
    },
    "sparse-cadence": {
      maxLeapRecoveryMisses: 13,
      minCounterSubjectIdentityRetention: 0.94,
    },
    "ornament-test": {
      minOrnamentDensity: 0.1,
      maxSelectedCandidateTextureCost: 997,
    },
  },
} as const;

export const PHASE_5_10_DIAGNOSTICS_PROFILE = {
  minRhythmicIndependenceScore: 0.08,
  maxUnisonOverlapCount: 762,
  maxSameDirectionMotionCount: 661,
  maxSharedRhythmOverlapCount: 906,
  maxShortStrongBeatEntryNoteCount: 33,
  maxEntrySupportInstabilityCount: 146,
  boundarySeeds: {
    "fugue-smoke": {
      maxShortStrongBeatEntryNoteCount: 19,
      maxEntrySupportInstabilityCount: 146,
    },
    "modal-dorian": {
      minCounterSubjectIdentityRetention: 0.58,
      maxEntrySupportInstabilityCount: 124,
    },
    "close-imitation": {
      maxShortStrongBeatEntryNoteCount: 31,
      maxSharedRhythmOverlapCount: 814,
    },
  },
} as const;

export const PHASE_5_11_DIAGNOSTICS_PROFILE = {
  minCounterSubjectIdentityRetention: 0.573,
  minRhythmicIndependenceScore: 0.079,
  maxUnisonOverlapCount: 762,
  maxSameDirectionMotionCount: 814,
  maxSharedRhythmOverlapCount: 906,
  maxLeapRecoveryMisses: 33,
  maxShortStrongBeatEntryNoteCount: 33,
  maxEntrySupportInstabilityCount: 160,
  maxEntrySupportInstabilityPerEntry: 4,
  maxConsecutiveEntrySupportInstabilities: 4,
  maxUnresolvedEntrySupportInstabilityCount: 160,
  minSelectedCandidateEvaluationCount: 1,
  followUpMargin: 0,
  modalRotationSeeds: {
    "angular-answer": {
      minCounterSubjectIdentityRetention: 0.573,
      maxSameDirectionMotionCount: 814,
      maxLeapRecoveryMisses: 33,
      minModalContextCount: 1,
    },
    "modal-answer": {
      minCounterSubjectIdentityRetention: 0.573,
      maxSameDirectionMotionCount: 814,
      maxLeapRecoveryMisses: 33,
      minModalContextCount: 1,
    },
    "modal-cadence": {
      minCounterSubjectIdentityRetention: 0.573,
      maxSameDirectionMotionCount: 814,
      maxLeapRecoveryMisses: 33,
      minModalContextCount: 1,
    },
    "dense-modal": {
      minCounterSubjectIdentityRetention: 0.573,
      maxSameDirectionMotionCount: 814,
      maxLeapRecoveryMisses: 33,
      minModalContextCount: 1,
    },
  },
} as const;

export const PHASE_6_DIAGNOSTICS_PROFILE = {
  maxLeapRecoveryMisses: 33,
  maxSamePitchOverlapCount: 40,
  maxSevereEntryIntervalCount: 108,
  maxUnresolvedSevereEntryIntervalCount: 100,
  maxUnsupportedSoloRunCount: 17,
  maxAbruptTextureDropCount: 17,
  maxSoloVoiceImbalance: 30,
  minOrnamentPlacementReasonCount: 1,
  maxExpositionDurationTicks: TICKS_PER_QUARTER * 20,
  maxFirstContinuationStartTick: TICKS_PER_QUARTER * 20,
} as const;

export const PHASE_7_DIAGNOSTICS_PROFILE = {
  maxFourBeatBassUpperSameDirectionRatio: 0.724,
  minFourBeatBassUpperContraryRatio: 0.276,
  maxEightBeatBassUpperSameDirectionRatio: 0.65,
  minEightBeatBassUpperContraryRatio: 0.35,
  maxFourBeatOuterVoiceSameDirectionRatio: 0.75,
  minFourBeatOuterVoiceContraryRatio: 0.25,
  minContourComparisonCount: 1,
} as const;
