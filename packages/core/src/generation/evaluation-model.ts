export const CANDIDATE_EVALUATION_FEATURE_VERSION = 7;
export const CANDIDATE_EVALUATION_MODEL_VERSION = 14;

export const CANDIDATE_EVALUATION_WEIGHTS = {
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
    lowerVoiceUnvocalLongSupportQuarter: 18,
    freeCounterpointStepwiseRunRatio: 8,
    freeCounterpointMonotoneStepRun: 2,
    freeCounterpointContour: 12,
    ornamentDensity: 6,
  },
  texture: {
    samePitchOverlap: 4,
    unisonOverlap: 8,
    sameDirectionMotion: 3,
    fourBeatBassUpperSameDirection: 2,
    eightBeatBassUpperSameDirection: 1,
    ascendingFifthTurnbackBassUpperSameDirection: 50,
    fourBeatOuterVoiceSameDirection: 1,
    sharedRhythmOverlap: 2,
    voiceIndependenceSelectionUnisonOverlap: 8,
    voiceIndependenceSelectionSharedRhythmOverlap: 4,
    voicePairLockstepSelectionSamePitchOverlap: 4,
    allVoiceSilenceGap: 25,
    rhythmicIndependence: 12,
    supportTextureRepetition: 8,
    expositionEntryStagger: 10,
    bassUpperContraryMotion: 1,
    outerVoiceContraryMotion: 1,
    lineAgency: 2,
    entryFormulaNovelty: 3,
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
    modalCadenceEntryInstability: 1,
    modalCadenceSevereEntryInterval: 2,
    modalCadenceUnresolvedSevereEntryInterval: 3,
    unresolvedDissonance: 100,
    predominantDirectionMiss: 30,
    unresolvedAmbiguity: 30,
    controlledAmbiguity: 10,
    styleModulationFit: 8,
  },
  form: {
    formRepetition: 50,
    episodeDirection: 10,
    strettoClarity: 10,
    longWindowDevelopment: 2,
  },
} as const;

export const CANDIDATE_SELECTION_RISK_WEIGHTS = {
  entryHarmony: {
    instability: 1.5,
    severeInterval: 3,
    unresolvedSevereInterval: 5,
    unresolvedDuration: 0.6,
  },
  stepwiseFixation: {
    selectedCost: 1.5,
  },
  voicePairLockstep: {
    selectedCost: 2.2,
    samePitchOverlap: 3,
    pitchClassUnisonDuration: 0.65,
    durationBasedLockstep: 0.85,
  },
  melodyPreservation: {
    leapRecoveryMiss: 20,
  },
  sectionLocalPlanner: {
    soloTextureRisk: 12,
  },
} as const;
