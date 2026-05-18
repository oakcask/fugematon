import type { TICKS_PER_QUARTER, VOICES } from "./constants.js";

export type Voice = (typeof VOICES)[number];

export type NoteRole = "subject" | "answer" | "subject-fragment" | "counter-subject" | "free-counterpoint" | "fallback";

export type BeatStrength = "strong" | "weak" | "offbeat";

export type MetricalHarmonyIntent =
  | "structural-chord-tone"
  | "structural-root-support"
  | "strong-non-chord-tone"
  | "weak-passing-tone"
  | "weak-neighbor-tone"
  | "weak-chord-tone"
  | "offbeat-motion";

export type NoteEvent = {
  kind: "note";
  voice: Voice;
  startTick: number;
  durationTicks: number;
  pitch: number;
  velocity: number;
  role?: NoteRole;
  metricalHarmonyIntent?: MetricalHarmonyIntent;
};

export type TimeSignature = {
  numerator: 3 | 4 | 6;
  denominator: 4 | 8;
};

export type KeyMode = "major" | "minor" | "dorian" | "mixolydian" | "aeolian";

export type KeySignature = {
  tonic: string;
  mode: KeyMode;
};

export type FugueState = "exposition" | "episode" | "subject-return" | "stretto-like";

export type EntryForm = "subject" | "answer" | "subject-fragment";

export type AnswerKind = "true" | "tonal";

export type HarmonicFunction = "tonic" | "predominant" | "dominant" | "cadential-tonic";

export type CadenceKind = "authentic" | "half" | "deceptive" | "evaded" | "modulatory" | "modal";

export type StyleProfile = "strict-classical" | "hybrid" | "popular-tolerant";

export type AmbiguityIntent = "none" | "deceptive-motion" | "evaded-cadence" | "pivot-harmony";

export type SequencePattern = "ascending-step" | "descending-step" | "circle-fifths" | "parallel-shift";

export type FragmentTransform = "sequence" | "contrary-motion" | "inversion";

export type HarmonicAnchor = {
  tick: number;
  localKey: KeySignature;
  function: HarmonicFunction;
  cadenceTarget: boolean;
};

export type HarmonicPlan = {
  state: FugueState;
  startTick: number;
  durationTicks: number;
  localKey: KeySignature;
  departureKey: KeySignature;
  targetKey: KeySignature;
  styleProfile: StyleProfile;
  cadenceKind: CadenceKind;
  ambiguityIntent: AmbiguityIntent;
  ambiguityRecoveryTick?: number;
  parallelKeyShift: boolean;
  sequencePattern?: SequencePattern;
  fragmentTransform?: FragmentTransform;
  anchors: HarmonicAnchor[];
};

export type PlannedEntry = {
  voice: Voice;
  form: EntryForm;
  state: FugueState;
  startTick: number;
  globalKey: KeySignature;
  localKey: KeySignature;
  answerKind?: AnswerKind;
  registerTarget: number;
  expectedDegreePattern: number[];
  actualPitchClassSequence: number[];
  metricalIntentPattern: PlannedEntryMetricalIntent[];
};

export type PlannedEntryMetricalIntent = {
  offsetTick: number;
  beatStrength: BeatStrength;
  scaleDegree: number;
  harmonicFunction: HarmonicFunction;
  intent: MetricalHarmonyIntent;
  chordTone: boolean;
};

export type MetaEvent =
  | {
      kind: "meta";
      type: "generator-version";
      tick: number;
      payload: { version: number };
    }
  | {
      kind: "meta";
      type: "timebase";
      tick: number;
      payload: { ticksPerQuarter: typeof TICKS_PER_QUARTER };
    }
  | {
      kind: "meta";
      type: "tempo-change";
      tick: number;
      payload: { bpm: number };
    }
  | {
      kind: "meta";
      type: "time-signature";
      tick: number;
      payload: TimeSignature;
    }
  | {
      kind: "meta";
      type: "key-signature";
      tick: number;
      payload: KeySignature;
    }
  | {
      kind: "meta";
      type: "state-change";
      tick: number;
      payload: { state: FugueState };
    }
  | {
      kind: "meta";
      type: "parameter-change";
      tick: number;
      payload: { parameters: GenerationParameters };
    }
  | {
      kind: "meta";
      type: "score-end";
      tick: number;
      payload: { lengthTicks: number };
    };

export type ScoreEvent = NoteEvent | MetaEvent;

export type GenerationParameters = {
  strictness: number;
  density: number;
  subjectPresence: number;
};

export type SelectionModel = "baseline" | "phase10-oracle-selection" | "phase10-section-local-planner";

export type GenerationInput = {
  seed: string;
  lengthTicks: number;
  parameters?: Partial<GenerationParameters>;
  selectionModel?: SelectionModel;
};

export type DiagnosticIssueCode =
  | "range-violation"
  | "voice-crossing"
  | "parallel-perfect"
  | "subject-identity-violation"
  | "answer-plan-violation"
  | "key-metadata-mismatch"
  | "melodic-stagnation"
  | "leap-recovery-miss"
  | "texture-independence-warning"
  | "exposition-entry-density-warning"
  | "silence-gap-warning";

export type DiagnosticIssue = {
  code: DiagnosticIssueCode;
  severity: "warning";
  tick: number;
  voices: Voice[];
  pitches: Partial<Record<Voice, number>>;
  message: string;
};

export type ScoreDimension = {
  cost: number;
  reward: number;
  features: Record<string, number>;
};

export type CandidateEntryExplanation = {
  voice: Voice;
  form: EntryForm;
  state: FugueState;
  startTick: number;
  instabilityCount: number;
  severeIntervalCount: number;
  unresolvedSevereIntervalCount: number;
};

export type CandidateVoicePairExplanation = {
  leftVoice: Voice;
  rightVoice: Voice;
  samePitchOverlapCount: number;
  unisonOverlapCount: number;
  sharedRhythmOverlapCount: number;
  sameDirectionMotionCount: number;
};

export type CandidateVoiceExplanation = {
  voice: Voice;
  leapRecoveryMisses: number;
  repeatedPitchRunCount: number;
};

export type CandidateSectionExplanation = {
  state: FugueState;
  startTick: number;
  durationTicks: number;
  cadenceKind: CadenceKind;
  cadenceTargetCount: number;
  soloTextureRisk: number;
};

export type CandidateEvaluationExplanations = {
  entries: CandidateEntryExplanation[];
  voicePairs: CandidateVoicePairExplanation[];
  voices: CandidateVoiceExplanation[];
  sections: CandidateSectionExplanation[];
};

export type CandidateEvaluation = {
  featureVersion: 1 | 2 | 3 | 4;
  evaluationModelVersion: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  totalCost: number;
  hardFailures: DiagnosticIssueCode[];
  explanations: CandidateEvaluationExplanations;
  dimensions: {
    counterpoint: ScoreDimension;
    melody: ScoreDimension;
    texture: ScoreDimension;
    subjectClarity: ScoreDimension;
    harmony: ScoreDimension;
    form: ScoreDimension;
  };
};

export type CandidatePoolOracleBlocker =
  | "entry-harmony"
  | "voice-pair-lockstep"
  | "melody-leap-recovery"
  | "stepwise-pattern-fixation"
  | "section-solo-texture"
  | "metrical-harmony"
  | "bass-root-support"
  | "register-blending"
  | "functional-thinning"
  | "section-grammar-repetition";

export type CandidatePoolOracleClassification = "selection-model" | "generator-or-section-planner";

export type CandidatePoolOracleRepresentative = {
  state: FugueState;
  startTick: number;
  durationTicks: number;
  candidateCount: number;
  selectedCandidateIndex: number;
  viableCandidateCount: number;
  hardFailureRejectedCandidateCount: number;
  selectedRisk: number;
  bestViableRisk: number;
  selectedReferenceStatus: "within-reference" | "below-reference" | "above-reference";
  bestViableReferenceStatus: "within-reference" | "below-reference" | "above-reference";
};

export type CandidatePoolOracleBlockerSummary = {
  blocker: CandidatePoolOracleBlocker;
  referenceAxes: string[];
  classification: CandidatePoolOracleClassification;
  observedSectionCount: number;
  selectionModelSectionCount: number;
  generatorOrSectionPlannerSectionCount: number;
  viableImprovementCount: number;
  selectedRiskTotal: number;
  bestViableRiskTotal: number;
  selectionOnlyUpperBoundRiskReduction: number;
  selectionOnlyUpperBoundRiskReductionRate: number;
  generatorNeededRate: number;
  selectedRiskMax: number;
  bestViableRiskMin: number;
  representative: CandidatePoolOracleRepresentative;
};

export type CandidatePoolOracleSummary = {
  schemaVersion: 2 | 3;
  sectionCount: number;
  candidateCount: number;
  viableCandidateCount: number;
  hardFailureRejectedCandidateCount: number;
  blockerClassifications: CandidatePoolOracleBlockerSummary[];
};

export type DurationDistribution = {
  whole: number;
  half: number;
  quarter: number;
  eighth: number;
  sixteenth: number;
  dotted: number;
  triplet: number;
  other: number;
};

export type EntrySupportInstabilitySummary = {
  voice: Voice;
  form: EntryForm;
  state: FugueState;
  startTick: number;
  instabilityCount: number;
  maxConsecutiveInstabilities: number;
  unresolvedInstabilityCount: number;
};

export type EntrySupportSevereIntervalSummary = {
  voice: Voice;
  form: EntryForm;
  state: FugueState;
  startTick: number;
  severeIntervalCount: number;
  unresolvedSevereIntervalCount: number;
};

export type SoloTextureSummary = {
  soloRunCount: number;
  unsupportedSoloRunCount: number;
  abruptTextureDropCount: number;
  soloVoiceImbalance: number;
};

export type OrnamentPlacementReasons = {
  entryEnding: number;
  cadenceApproach: number;
  heldNote: number;
  phraseBoundary: number;
  total: number;
};

export type PitchContourWindowSummary = {
  windowTicks: number;
  bassUpperComparisonCount: number;
  bassUpperSameDirectionRatio: number;
  bassUpperContraryRatio: number;
  outerVoiceComparisonCount: number;
  outerVoiceSameDirectionRatio: number;
  outerVoiceContraryRatio: number;
};

export type PitchContourMotionSummary = {
  fourBeat: PitchContourWindowSummary;
  eightBeat: PitchContourWindowSummary;
};

export type StepwisePatternRoleSummary = {
  role: NoteRole;
  noteCount: number;
  intervalCount: number;
  stepwiseRunRatio: number;
  ascendingStepRatio: number;
  descendingStepRatio: number;
  maxMonotoneStepRun: number;
  repeatedDegreePatternCount: number;
  rolePatternEntropy: number;
};

export type StepwisePatternSectionSummary = StepwisePatternRoleSummary & {
  state: FugueState;
  startTick: number;
  durationTicks: number;
};

export type StepwisePatternSummary = {
  degreePatternLength: number;
  roles: StepwisePatternRoleSummary[];
  sections: StepwisePatternSectionSummary[];
};

export type Phase11AdjacentVoiceIntervalSummary = {
  higherVoice: Voice;
  lowerVoice: Voice;
  checkpointCount: number;
  medianSemitones: number;
  seventyFifthPercentileSemitones: number;
  overOctaveCount: number;
};

export type Phase11RegisterSpanSummary = {
  voice: Voice;
  noteCount: number;
  minPitch: number;
  maxPitch: number;
  spanSemitones: number;
};

export type Phase11FunctionalThinningSummary = {
  nonCadentialRunCount: number;
  oneVoiceRunCount: number;
  twoVoiceRunCount: number;
  annotatedRunCount: number;
  unsupportedRunCount: number;
  entryPreparationRunCount: number;
  cadentialPreparationRunCount: number;
  echoRunCount: number;
  pedalRunCount: number;
  suspensionPreparationRunCount: number;
  totalDurationTicks: number;
  maxDurationTicks: number;
};

export type Phase11StatePatternSummary = {
  pattern: FugueState[];
  count: number;
};

export type Phase11EntryPatternFamilySummary = {
  form: EntryForm;
  pattern: number[];
  count: number;
};

export type Phase12PhraseFunction =
  | "exposition"
  | "entry-preparation"
  | "episode-sequence"
  | "cadence-extension"
  | "stretto-compression"
  | "restatement";

export type Phase12SubjectStemFamilySummary = {
  form: Extract<EntryForm, "subject" | "subject-fragment">;
  pattern: number[];
  count: number;
  share: number;
};

export type Phase12AnswerTransformSummary = {
  answerKind: AnswerKind | "none";
  pattern: number[];
  count: number;
  share: number;
};

export type Phase12FragmentDerivationSummary = {
  transform: FragmentTransform | "none";
  phraseFunction: Phase12PhraseFunction;
  count: number;
  share: number;
};

export type Phase12PhraseFunctionSummary = {
  phraseFunction: Phase12PhraseFunction;
  count: number;
  share: number;
};

export type Phase12SectionStatePatternSummary = {
  pattern: FugueState[];
  count: number;
  share: number;
};

export type Phase11MetricalHarmonySummary = {
  strongBeatCheckpointCount: number;
  strongBeatChordToneSupportCount: number;
  strongBeatChordToneMismatchCount: number;
  strongBeatBassRootSupportCount: number;
  strongBeatStructuralIntentCount: number;
  strongBeatStructuralIntentMismatchCount: number;
  weakBeatCheckpointCount: number;
  weakBeatChordToneMismatchCount: number;
  weakBeatNonChordToneIntentCount: number;
  weakBeatResolvedNonChordToneCount: number;
  weakBeatUnresolvedNonChordToneCount: number;
};

export type Phase11ReviewSummary = {
  schemaVersion: 1;
  adjacentVoiceIntervals: Phase11AdjacentVoiceIntervalSummary[];
  registerSpans: Phase11RegisterSpanSummary[];
  functionalThinning: Phase11FunctionalThinningSummary;
  stateGrammarRepetition: {
    patternLength: number;
    uniquePatternCount: number;
    mostRepeatedPatternCount: number;
    topPatterns: Phase11StatePatternSummary[];
  };
  entryPatternFamilies: Phase11EntryPatternFamilySummary[];
  metricalHarmony: Phase11MetricalHarmonySummary;
};

export type Phase12ReviewSummary = {
  schemaVersion: 1;
  entryPatternFamilyConcentration: {
    entryCount: number;
    uniqueFamilyCount: number;
    topFamilyCount: number;
    topFamilyShare: number;
  };
  subjectStemFamilies: Phase12SubjectStemFamilySummary[];
  answerTransformFamilies: Phase12AnswerTransformSummary[];
  fragmentDerivations: Phase12FragmentDerivationSummary[];
  phraseFunctions: Phase12PhraseFunctionSummary[];
  sectionStatePatterns: {
    patternLength: number;
    uniquePatternCount: number;
    mostRepeatedPatternCount: number;
    topPatterns: Phase12SectionStatePatternSummary[];
  };
};

export type GenerationDiagnostics = {
  generatorVersion: number;
  seed: string;
  lengthTicks: number;
  generatedUntilTick: number;
  eventCount: number;
  noteCount: number;
  candidateEvaluations: number;
  selectedCandidateEvaluations: CandidateEvaluation[];
  candidatePoolOracle: CandidatePoolOracleSummary;
  stateTransitions: FugueState[];
  subjectEntries: PlannedEntry[];
  sectionPlans: HarmonicPlan[];
  rangeViolations: number;
  voiceCrossings: number;
  parallelPerfects: number;
  subjectIdentityViolations: number;
  answerPlanViolations: number;
  keyMetadataMismatches: number;
  counterSubjectCoverage: number;
  freeCounterpointCoverage: number;
  counterSubjectIdentityRetention: number;
  counterSubjectInvertibilityScore: number;
  freeCounterpointContourScore: number;
  rhythmicIndependenceScore: number;
  supportTextureRepetitionScore: number;
  expositionEntryStaggerScore: number;
  samePitchOverlapCount: number;
  unisonOverlapCount: number;
  sameDirectionMotionCount: number;
  sharedRhythmOverlapCount: number;
  shortStrongBeatEntryNoteCount: number;
  entrySupportInstabilityCount: number;
  entrySupportInstabilityDetails: EntrySupportInstabilitySummary[];
  severeEntryIntervalCount: number;
  unresolvedSevereEntryIntervalCount: number;
  entrySupportSevereIntervalDetails: EntrySupportSevereIntervalSummary[];
  durationDistribution: DurationDistribution;
  repeatedPitchRunCount: number;
  allVoiceSilenceGapCount: number;
  soloTexture: SoloTextureSummary;
  pitchContourMotion: PitchContourMotionSummary;
  stepwisePattern: StepwisePatternSummary;
  phase11Review: Phase11ReviewSummary;
  phase12Review: Phase12ReviewSummary;
  ornamentCandidateCount: number;
  ornamentDensity: number;
  ornamentPlacementReasons: OrnamentPlacementReasons;
  fallbackPassageCount: number;
  melodicStagnationWarnings: number;
  leapRecoveryMisses: number;
  unresolvedDissonanceCount: number;
  strongBeatDissonanceCount: number;
  cadenceTargetMisses: number;
  cadenceTargetHits: number;
  leadingToneResolutionMisses: number;
  dominantResolutionMisses: number;
  predominantDirectionMisses: number;
  harmonicFunctionMismatches: number;
  harmonicFunctionMatches: number;
  controlledAmbiguityScore: number;
  unresolvedAmbiguityWarnings: number;
  ambiguityRecoveries: number;
  styleModulationFit: number;
  parallelKeyShiftCount: number;
  formRepetitionWarnings: number;
  episodeDirectionScore: number;
  strettoClarityScore: number;
  modalContextCount: number;
  modalCharacteristicToneHits: number;
  modalCadenceHits: number;
  tonalCadenceOveruseWarnings: number;
  issues: DiagnosticIssue[];
  warnings: string[];
};

export type GenerationOutput = {
  events: ScoreEvent[];
  diagnostics: GenerationDiagnostics;
};
