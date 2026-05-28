import type { TICKS_PER_QUARTER, VOICES } from "./constants.js";

export type Voice = (typeof VOICES)[number];

export type NoteRole = "subject" | "answer" | "subject-fragment" | "counter-subject" | "free-counterpoint" | "fallback";

export type BeatStrength = "strong" | "weak" | "offbeat";

export type EpisodeMotiveSource =
  | "subject-head"
  | "subject-tail"
  | "answer-form"
  | "counter-subject-head"
  | "counter-subject-tail"
  | "cadence-figure"
  | "prior-episode-figure";

export type EpisodeTransformationKind =
  | "fragmentation"
  | "sequence"
  | "inversion"
  | "contour-paraphrase"
  | "rhythmic-paraphrase"
  | "imitation"
  | "diminution"
  | "augmentation"
  | "cadential-continuation"
  | "generic";

export type EpisodeTargetFunction =
  | "connect-exposition-entries"
  | "prepare-subject-return"
  | "modulate-local-key"
  | "relax-after-density"
  | "extend-cadence"
  | "maintain-pedal-or-suspension";

export type EpisodeMotivicDerivation = {
  sourceMotive: EpisodeMotiveSource;
  transformationKind: EpisodeTransformationKind;
  targetFunction: EpisodeTargetFunction;
  sequenceDirection?: "ascending" | "descending" | "circle" | "parallel" | "none";
  preparesNextEntry: boolean;
  preparesCadence: boolean;
};

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
  motivicDerivation?: EpisodeMotivicDerivation;
};

export type TimeSignature = {
  numerator: 3 | 4 | 6;
  denominator: 4 | 8;
};

export type MeterContext = {
  timeSignature: TimeSignature;
  measureTicks: number;
  beatTicks: number;
  strongBeatIntervalTicks: number;
  weakBeatIntervalTicks: number;
  compound: boolean;
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
  meterContext: MeterContext;
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
      type: "score-end";
      tick: number;
      payload: { lengthTicks: number };
    };

export type ScoreEvent = NoteEvent | MetaEvent;

export type CurrentSelectionModel = "baseline" | "candidate-oracle-selection" | "section-local-planner";

export type SelectionModel = CurrentSelectionModel;

export function normalizeSelectionModel(selectionModel: SelectionModel): CurrentSelectionModel {
  return selectionModel;
}

export type GenerationInput = {
  seed: string;
  lengthTicks: number;
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
  featureVersion: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  evaluationModelVersion: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;
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
  phraseFamilyCandidateCount: number;
  selectedCandidateIndex: number;
  viableCandidateCount: number;
  hardFailureRejectedCandidateCount: number;
  selectedRisk: number;
  bestViableRisk: number;
  selectedReferenceStatus: "within-reference" | "below-reference" | "above-reference";
  bestViableReferenceStatus: "within-reference" | "below-reference" | "above-reference";
};

export type CandidateDiversityFacet =
  | "subjectStem"
  | "answerTransform"
  | "fragmentDerivation"
  | "phraseFunction"
  | "cadenceApproach"
  | "supportRole"
  | "sectionState";

export type CandidateDiversityValueSummary = {
  value: string;
  candidateCount: number;
  viableCandidateCount: number;
  selectedCount: number;
};

export type CandidateDiversityFacetSummary = {
  facet: CandidateDiversityFacet;
  candidateCount: number;
  viableCandidateCount: number;
  uniqueValueCount: number;
  viableUniqueValueCount: number;
  selectedValueCount: number;
  selectionHasViableAlternative: boolean;
  values: CandidateDiversityValueSummary[];
};

export type CandidateDiversityDescriptor = Record<CandidateDiversityFacet, string>;

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
  schemaVersion: 2 | 3 | 4 | 5;
  sectionCount: number;
  candidateCount: number;
  phraseFamilyCandidateCount: number;
  viableCandidateCount: number;
  hardFailureRejectedCandidateCount: number;
  candidateDiversity: CandidateDiversityFacetSummary[];
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

export type SurfaceBrillianceSignal =
  | "short-note-motion"
  | "support-motion-density"
  | "upper-register-activity"
  | "four-voice-density"
  | "modal-color"
  | "pivot-ambiguity"
  | "stretto-compression";

export type SurfaceBrillianceTradeoff =
  | "counter-subject-identity-tradeoff"
  | "entry-friction-tradeoff"
  | "lockstep-texture-tradeoff"
  | "low-ornament-support";

export type SurfaceBrillianceSummary = {
  schemaVersion: 1;
  score: number;
  shortNoteShare: number;
  attackDensityPerQuarter: number;
  supportMotionDensityPerQuarter: number;
  upperRegisterAttackShare: number;
  fourVoiceShare: number;
  modalColorShare: number;
  pivotAmbiguityShare: number;
  strettoShare: number;
  signals: SurfaceBrillianceSignal[];
  tradeoffs: SurfaceBrillianceTradeoff[];
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

export type ExposedFreeCounterpointSoloFunction =
  | "cadential-preparation"
  | "entry-preparation"
  | "pedal"
  | "solo-rhetoric"
  | "unsupported";

export type ExposedFreeCounterpointSoloWindow = {
  voice: Voice;
  startTick: number;
  endTick: number;
  durationTicks: number;
  state: FugueState | "unplanned";
  previousActiveVoiceCount: number;
  function: ExposedFreeCounterpointSoloFunction;
  classification: "function-explained" | "review-required";
};

export type ExposedFreeCounterpointSoloSummary = {
  schemaVersion: 1;
  reviewRequired: boolean;
  windowCount: number;
  reviewRequiredWindowCount: number;
  functionExplainedWindowCount: number;
  windows: ExposedFreeCounterpointSoloWindow[];
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

export type LowerVoiceVocalityDetail = {
  voice: "tenor" | "bass";
  startTick: number;
  durationTicks: number;
  pitch: number;
  role?: NoteRole;
  metricalHarmonyIntent?: MetricalHarmonyIntent;
  state?: FugueState;
};

export type LowerVoiceVocalityVoiceSummary = {
  voice: "tenor" | "bass";
  supportTransitionCount: number;
  singableConnectionCount: number;
  staticConnectionCount: number;
  largeLeapConnectionCount: number;
  connectionScore: number;
  longSupportCount: number;
  longSupportDurationTicks: number;
  unvocalLongSupportCount: number;
  unvocalLongSupportDurationTicks: number;
  score: number;
};

export type LowerVoiceVocalitySummary = {
  schemaVersion: 1;
  score: number;
  supportTransitionCount: number;
  singableConnectionCount: number;
  staticConnectionCount: number;
  largeLeapConnectionCount: number;
  connectionScore: number;
  longSupportCount: number;
  longSupportDurationTicks: number;
  unvocalLongSupportCount: number;
  unvocalLongSupportDurationTicks: number;
  voices: LowerVoiceVocalityVoiceSummary[];
  worstExamples: LowerVoiceVocalityDetail[];
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

export type AdjacentVoiceIntervalSummary = {
  higherVoice: Voice;
  lowerVoice: Voice;
  checkpointCount: number;
  medianSemitones: number;
  seventyFifthPercentileSemitones: number;
  overOctaveCount: number;
};

export type RegisterSpanSummary = {
  voice: Voice;
  noteCount: number;
  minPitch: number;
  maxPitch: number;
  spanSemitones: number;
};

export type FunctionalThinningSummary = {
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

export type StateGrammarPatternSummary = {
  pattern: FugueState[];
  count: number;
};

export type EntryPatternFamilySummary = {
  form: EntryForm;
  pattern: number[];
  count: number;
};

export type PhraseFunction =
  | "exposition"
  | "entry-preparation"
  | "episode-sequence"
  | "cadence-extension"
  | "stretto-compression"
  | "restatement";

export type SubjectStemFamilySummary = {
  form: Extract<EntryForm, "subject" | "subject-fragment">;
  pattern: number[];
  count: number;
  share: number;
};

export type AnswerTransformSummary = {
  answerKind: AnswerKind | "none";
  pattern: number[];
  count: number;
  share: number;
};

export type FragmentDerivationSummary = {
  transform: FragmentTransform | "none";
  phraseFunction: PhraseFunction;
  count: number;
  share: number;
};

export type PhraseFunctionSummary = {
  phraseFunction: PhraseFunction;
  count: number;
  share: number;
};

export type SectionStatePatternSummary = {
  pattern: FugueState[];
  count: number;
  share: number;
};

export type EpisodeMotivicDevelopmentBucket = {
  key: string;
  durationTicks: number;
  share: number;
};

export type EpisodeRepeatedFormulaSummary = {
  signature: string;
  count: number;
  durationTicks: number;
  sourceMotive: EpisodeMotiveSource | "mixed" | "unclassified";
  transformationKind: EpisodeTransformationKind | "mixed" | "unclassified";
};

export type EpisodeMotivicDevelopmentSummary = {
  schemaVersion: 1;
  subjectFreeDurationTicks: number;
  derivedDurationTicks: number;
  genericFreeCounterpointDurationTicks: number;
  derivationCoverage: number;
  transformationVariety: number;
  sourceMotiveConcentration: number;
  nextEntryPreparationTicks: number;
  cadencePreparationTicks: number;
  repeatedStockFormulaCount: number;
  reviewRequired: boolean;
  sourceMotiveDurations: EpisodeMotivicDevelopmentBucket[];
  transformationDurations: EpisodeMotivicDevelopmentBucket[];
  repeatedFormulas: EpisodeRepeatedFormulaSummary[];
};

export type MetricalHarmonyReviewSummary = {
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

export type MeterConsistencyWindow = {
  kind: "entry-start" | "subject-accent" | "harmonic-anchor" | "cadence-target" | "phrase-boundary";
  tick: number;
  measureOffsetTicks: number;
  beatStrength: BeatStrength;
  classification: "meter-confirming" | "compound-midpoint" | "pickup-or-cross-metric" | "review-required";
  voice?: Voice;
  state?: FugueState;
  form?: EntryForm;
};

export type MeterConsistencyReviewSummary = {
  schemaVersion: 1;
  status: "review-required";
  timeSignature: TimeSignature;
  measureTicks: number;
  beatTicks: number;
  compound: boolean;
  focusedWindowCount: number;
  downbeatEntryCount: number;
  offMeasureEntryCount: number;
  compoundMidpointCount: number;
  strongIntentOnNonDownbeatCount: number;
  cadenceTargetOffDownbeatCount: number;
  phraseBoundaryOffDownbeatCount: number;
  windows: MeterConsistencyWindow[];
};

export type TransitionRhythmSupportKind =
  | "held-support"
  | "cadential-support"
  | "suspension-support"
  | "directed-contour"
  | "sustained-pickup";

export type TransitionRhythmWindow = {
  startTick: number;
  durationTicks: number;
  measureStartTick: number;
  measureOffsetTicks: number;
  beatStrength: BeatStrength;
  state: Extract<FugueState, "episode">;
  boundaryKinds: Array<"entry-start" | "phrase-boundary" | "harmonic-anchor">;
  attackCount: number;
  shortAttackCount: number;
  activeVoiceCount: number;
  activeVoices: Voice[];
  roleMix: NoteRole[];
  supportKinds: TransitionRhythmSupportKind[];
  classification: "prepared-pickup" | "meter-confirming" | "review-required";
  response: "accepted-context" | "review-required";
};

export type TransitionRhythmReviewSummary = {
  schemaVersion: 1;
  focusedWindowCount: number;
  preparedPickupWindowCount: number;
  meterConfirmingWindowCount: number;
  reviewRequiredWindowCount: number;
  windows: TransitionRhythmWindow[];
};

export type TexturePlanningReviewSummary = {
  schemaVersion: 1;
  adjacentVoiceIntervals: AdjacentVoiceIntervalSummary[];
  registerSpans: RegisterSpanSummary[];
  functionalThinning: FunctionalThinningSummary;
  stateGrammarRepetition: {
    patternLength: number;
    uniquePatternCount: number;
    mostRepeatedPatternCount: number;
    topPatterns: StateGrammarPatternSummary[];
  };
  entryPatternFamilies: EntryPatternFamilySummary[];
  metricalHarmony: MetricalHarmonyReviewSummary;
};

export type PhraseRepetitionReviewSummary = {
  schemaVersion: 1;
  entryPatternFamilyConcentration: {
    entryCount: number;
    uniqueFamilyCount: number;
    topFamilyCount: number;
    topFamilyShare: number;
  };
  subjectStemFamilies: SubjectStemFamilySummary[];
  answerTransformFamilies: AnswerTransformSummary[];
  fragmentDerivations: FragmentDerivationSummary[];
  phraseFunctions: PhraseFunctionSummary[];
  sectionStatePatterns: {
    patternLength: number;
    uniquePatternCount: number;
    mostRepeatedPatternCount: number;
    topPatterns: SectionStatePatternSummary[];
  };
};

export type QualityVectorAxis =
  | "exactSamePitchUnisonDuration"
  | "pitchClassUnisonDuration"
  | "longestExactSamePitchSpan"
  | "longestPitchClassUnisonSpan"
  | "durationBasedLockstep"
  | "sopranoRepeatedNotePressure"
  | "entrySevereIntervalDuration"
  | "unresolvedEntrySevereIntervalDuration";

export type QualityVectorStatus = "within-profile" | "review-required";

export type QualityVectorGroupingKey = {
  styleProfile: StyleProfile | "mixed";
  sectionRole: FugueState | "mixed";
  voicePair?: string;
  voice?: Voice;
  entryRole?: EntryForm;
  register?: "low" | "middle" | "high";
};

export type QualityVectorAxisSummary = {
  axis: QualityVectorAxis;
  value: number;
  normalizedValue: number;
  expectedMax: number;
  weight: number;
  status: QualityVectorStatus;
  groupingKey: QualityVectorGroupingKey;
  topContributors: string[];
};

export type VoicePairUnisonSummary = {
  leftVoice: Voice;
  rightVoice: Voice;
  activeDurationTicks: number;
  exactSamePitchDurationTicks: number;
  pitchClassUnisonDurationTicks: number;
  durationBasedLockstepTicks: number;
  longestExactSamePitchSpanTicks: number;
  longestPitchClassUnisonSpanTicks: number;
  sectionRole: FugueState | "mixed";
  styleProfile: StyleProfile | "mixed";
};

export type VoicePairFunctionSummary = {
  leftVoice: Voice;
  rightVoice: Voice;
  subjectSupportLockstepTicks: number;
  cadenceSupportLockstepTicks: number;
  sequencePatternLockstepTicks: number;
  pedalLikeSupportLockstepTicks: number;
  mechanicalCouplingTicks: number;
  exactCollisionTicks: number;
  pitchClassColorDoublingTicks: number;
  functionalReinforcementTicks: number;
};

export type SopranoRepeatedNotePressureSummary = {
  voice: Extract<Voice, "soprano">;
  runCount: number;
  highRegisterRunCount: number;
  unreleasedRunCount: number;
  pressureDurationTicks: number;
  longestRunNoteCount: number;
  longestRunDurationTicks: number;
  register: "low" | "middle" | "high";
};

export type EntrySevereIntervalDurationSummary = {
  voice: Voice;
  form: EntryForm;
  state: FugueState;
  startTick: number;
  severeIntervalDurationTicks: number;
  unresolvedDurationTicks: number;
  resolutionDeadlineTicks: number;
  representativeTick: number;
};

export type EntrySonorityKind =
  | "open-consonance"
  | "pitch-class-unison-stack"
  | "adjacent-second-friction"
  | "exposed-seventh"
  | "tritone-exposure"
  | "passing-neighbor-motion"
  | "prepared-suspension"
  | "unresolved-accented-clash";

export type EntrySonoritySummary = {
  voice: Voice;
  form: EntryForm;
  state: FugueState;
  startTick: number;
  representativeTick: number;
  beatStrength: "strong" | "weak";
  supportVoices: Voice[];
  kinds: EntrySonorityKind[];
  pitchClassUnisonStackCount: number;
  adjacentSecondFrictionCount: number;
  exposedSeventhCount: number;
  tritoneExposureCount: number;
  preparedOrPassingCount: number;
  unresolvedAccentedClashCount: number;
  resolutionDirection: "up" | "down" | "mixed" | "none";
  resolutionDeadlineTicks: number;
};

export type EntryFormulaRecurrenceSummary = {
  formulaKey: string;
  recurrenceCount: number;
  representativeTick: number;
  entryVoice: Voice;
  state: FugueState;
  beatStrength: "strong" | "weak";
  supportVoices: Voice[];
  kinds: EntrySonorityKind[];
  resolutionDirection: "up" | "down" | "mixed" | "none";
  judgement: "reduced" | "review-required" | "functionally-justified";
};

export type FragmentFunctionEvidenceSummary = {
  fragmentSectionCount: number;
  uniqueFunctionCount: number;
  topFunctionShare: number;
  topFunctions: {
    functionKey: string;
    count: number;
    share: number;
  }[];
  transformationClaims: {
    functionKey: string;
    count: number;
    transformationKinds: string[];
    judgement: "developed" | "underdeveloped" | "review-required";
  }[];
};

export type CounterSubjectWindowSummary = {
  entryStartTick: number;
  entryVoice: Voice;
  counterSubjectVoice?: Voice;
  retentionKind: "recognizable" | "altered" | "weak";
  rhythmPattern: number[];
  contourClass: string;
  supportCollisionCount: number;
  preservationJudgement: "preserved" | "tradeoff" | "weak";
};

export type HarmonicSonorityClassification =
  | "thin-unrooted-support"
  | "pitch-class-doubling-only"
  | "non-chord-structural-support";

export type HarmonicSonorityWindow = {
  startTick: number;
  durationTicks: number;
  state: FugueState | "mixed";
  localKey: KeySignature;
  harmonicFunction: HarmonicFunction;
  voices: Voice[];
  roles: NoteRole[];
  pitchClasses: number[];
  chordTonePitchClasses: number[];
  nonChordPitchClasses: number[];
  rootPresent: boolean;
  completeTriad: boolean;
  activeVoiceCount: number;
  structuralIntentMismatchCount: number;
  pitchClassUnisonStackCount: number;
  classification: HarmonicSonorityClassification;
  symptom: string;
  response: "review-required" | "generator-response-required";
};

export type HarmonicSonorityReviewSummary = {
  schemaVersion: 1;
  focusedWindowCount: number;
  reviewRequiredWindowCount: number;
  generatorResponseWindowCount: number;
  thinUnrootedWindowCount: number;
  pitchClassDoublingWindowCount: number;
  nonChordStructuralWindowCount: number;
  windows: HarmonicSonorityWindow[];
};

export type VoicePairSpanClassification =
  | "mechanical-coupling"
  | "pitch-class-reinforcement"
  | "exact-collision"
  | "cadence-support"
  | "sequence-support"
  | "subject-support"
  | "color-doubling";

export type VoicePairSpanSummary = {
  leftVoice: Voice;
  rightVoice: Voice;
  startTick: number;
  durationTicks: number;
  sectionRole: FugueState | "mixed";
  classification: VoicePairSpanClassification;
  symptom: string;
};

export type MetricExplanationSummary = {
  axis: QualityVectorAxis;
  representativeTick: number;
  sectionRole: FugueState | "mixed";
  voicePair?: string;
  voice?: Voice;
  symptom: string;
  classification: string;
  adoptionMeaning: "musical-improvement" | "diagnostic-reclassification" | "review-required";
};

export type ScoreBeautyEvidenceSummary = {
  schemaVersion: 1;
  lineAgency: {
    independentSpanCount: number;
    reinforcingSpanCount: number;
    reviewRequiredSpanCount: number;
    agencyRatio: number;
  };
  entryFormulaNovelty: {
    totalFormulaCount: number;
    reviewRequiredFormulaCount: number;
    justifiedFormulaCount: number;
    noveltyRatio: number;
  };
  counterSubjectSurvivability: {
    preservedWindowCount: number;
    tradeoffWindowCount: number;
    weakWindowCount: number;
    preservationRatio: number;
  };
  longWindowDevelopment: {
    fragmentClaimCount: number;
    developedClaimCount: number;
    reviewRequiredClaimCount: number;
    topFunctionShare: number;
  };
};

export type EntryBoundaryContinuityWindow = {
  entryVoice: Voice;
  entryOrderIndex: number;
  form: EntryForm;
  state: FugueState;
  startTick: number;
  alreadyEnteredVoices: Voice[];
  outsideOnsetVoices: Voice[];
  outsideEndedAtEntryVoices: Voice[];
  carriedOutsideVoices: Voice[];
  suspendedOrResolvingOutsideVoices: Voice[];
  delayedOutsideVoices: Voice[];
  staggeredContinuationVoices: Voice[];
  preparedCollectiveArticulation: boolean;
  unsupportedEntryLocalThinning: boolean;
  classification:
    | "continuity-supported"
    | "one-voice-carry-with-outside-reset"
    | "synchronized-reset"
    | "prepared-collective-articulation"
    | "unsupported-entry-local-thinning";
};

export type EntryBoundaryContinuitySummary = {
  schemaVersion: 4;
  firstBassEntryWindow?: EntryBoundaryContinuityWindow;
  firstBassEntrySynchronizedReset: boolean;
  bassEntryWindowCount: number;
  importantEntryWindowCount: number;
  nonBassEntryWindowCount: number;
  synchronizedResetCount: number;
  continuitySupportedCount: number;
  oneVoiceCarryWithOutsideResetCount: number;
  preparedCollectiveArticulationCount: number;
  unsupportedEntryLocalThinningCount: number;
  windows: EntryBoundaryContinuityWindow[];
};

export type BassAnswerTailTextureWindow = {
  seed?: string;
  firstBassAnswerStartTick: number;
  firstBassAnswerTailStartTick: number;
  firstBassAnswerEndTick: number;
  windowEndTick: number;
  zeroOutsideVoiceTicks: number;
  bassOnlyFreeCounterpointTicks: number;
  oneOutsideVoiceTicks: number;
  supportRhythmClassification:
    | "no-upper-support"
    | "held-or-meter-anchored-support"
    | "motivic-dotted-rhythm"
    | "unmotivated-tail-fragmentation";
  supportRhythmReviewRequired: boolean;
  supportRhythmOnsetCount: number;
  dottedSupportTicks: number;
  offGridSupportTicks: number;
  minOutsideVoiceCount: number;
  activeOutsideVoices: Voice[];
  classification: "supported-tail" | "review-required";
};

export type BassAnswerTailTextureSummary = {
  schemaVersion: 3;
  reviewRequired: boolean;
  bassOnlyFreeCounterpointWindowCount: number;
  zeroOutsideVoiceWindowCount: number;
  oneOutsideVoiceWindowCount: number;
  supportRhythmReviewRequiredWindowCount: number;
  windows: BassAnswerTailTextureWindow[];
};

export type LocalSentinelKind =
  | "long-exact-same-pitch-unison"
  | "long-pitch-class-unison"
  | "high-soprano-repeated-note-pressure"
  | "unresolved-entry-severe-interval";

export type LocalSentinelSummary = {
  kind: LocalSentinelKind;
  severity: "review-required";
  seed?: string;
  startTick: number;
  durationTicks: number;
  voicePair?: string;
  voice?: Voice;
  sectionRole: FugueState | "mixed";
  symptom: string;
  classification?: VoicePairSpanClassification;
};

export type QualityVector = {
  schemaVersion: 5;
  modelVersion: 5;
  axes: QualityVectorAxisSummary[];
  voicePairUnisons: VoicePairUnisonSummary[];
  voicePairFunctions: VoicePairFunctionSummary[];
  voicePairSpans: VoicePairSpanSummary[];
  sopranoRepeatedNotePressure: SopranoRepeatedNotePressureSummary;
  entrySevereIntervals: EntrySevereIntervalDurationSummary[];
  entrySonorities: EntrySonoritySummary[];
  entryFormulaRecurrences: EntryFormulaRecurrenceSummary[];
  fragmentFunctionEvidence: FragmentFunctionEvidenceSummary;
  counterSubjectWindows: CounterSubjectWindowSummary[];
  harmonicSonorities: HarmonicSonorityReviewSummary;
  metricExplanations: MetricExplanationSummary[];
  scoreBeautyEvidence: ScoreBeautyEvidenceSummary;
  localSentinels: LocalSentinelSummary[];
};

export type SentinelCandidateLink = {
  sentinelKind: LocalSentinelKind;
  sentinelStartTick: number;
  sentinelDurationTicks: number;
  sectionState: FugueState;
  sectionStartTick: number;
  sectionDurationTicks: number;
  cadenceKind: CadenceKind;
  voicePair?: string;
  voice?: Voice;
  entryForm?: EntryForm;
  entryStartTick?: number;
  resolutionDeadlineTicks?: number;
};

export type LocalSentinelCandidateTraceSummary = {
  schemaVersion: 1;
  sentinelCandidateLinks: SentinelCandidateLink[];
};

export type PhraseConvergenceReviewFindingCode =
  | "legacy-default-selection-model"
  | "mechanical-section-pattern-repetition"
  | "low-section-pattern-diversity"
  | "entry-pattern-family-concentration"
  | "subject-stem-family-concentration"
  | "subject-fragment-family-concentration";

export type PhraseConvergenceReviewFinding = {
  code: PhraseConvergenceReviewFindingCode;
  severity: "review-required";
  metric: string;
  actual: number | string;
  expected: string;
  message: string;
};

export type PhraseConvergenceReviewSummary = {
  schemaVersion: 1;
  selectionModel: SelectionModel;
  reviewRequired: boolean;
  metrics: {
    mostRepeatedFourSectionPatternCount: number;
    uniqueFourSectionPatternCount: number;
    topEntryPatternFamilyShare: number;
    topSubjectStemFamilyShare: number;
    topSubjectFragmentFamilyShare: number;
  };
  findings: PhraseConvergenceReviewFinding[];
};

export type PhraseDevelopmentJudgement = "new-material" | "function-bearing-recurrence" | "mechanical-reuse";

export type PhraseDevelopmentWindow = {
  startTick: number;
  state: FugueState;
  form: Extract<EntryForm, "subject" | "subject-fragment">;
  entryVoice: Voice;
  stemPattern: number[];
  phraseFunction: PhraseFunction;
  cadenceKind: CadenceKind;
  localKey: KeySignature;
  recentStemReuseCount: number;
  changedEntryVoice: boolean;
  changedLocalKey: boolean;
  changedPhraseFunction: boolean;
  judgement: PhraseDevelopmentJudgement;
};

export type PhraseDevelopmentReviewSummary = {
  schemaVersion: 1;
  reviewRequired: boolean;
  windowCount: number;
  mechanicalReuseWindowCount: number;
  functionBearingWindowCount: number;
  topSubjectStemFamilyShare: number;
  topSubjectFragmentFamilyShare: number;
  windows: PhraseDevelopmentWindow[];
};

export type DissonanceTriageWindow = {
  startTick: number;
  state: FugueState | "mixed";
  voices: Voice[];
  roles: NoteRole[];
  metricalHarmonyIntents: MetricalHarmonyIntent[];
  classification:
    | "weak-passing-semitone-clash"
    | "passing-neighbor-offbeat-semitone-clash"
    | "entry-adjacent-second-friction"
    | "unresolved-accented-entry-clash";
  response: "review-required";
};

export type DissonanceTriageSummary = {
  schemaVersion: 1;
  weakPassingSemitoneClashTicks: number;
  passingNeighborOffbeatSemitoneClashTicks: number;
  entryAdjacentSecondFrictionCount: number;
  unresolvedAccentedEntryClashCount: number;
  windows: DissonanceTriageWindow[];
};

export type HarmonicContinuityWindow = {
  startTick: number;
  durationTicks: number;
  state: Extract<FugueState, "episode">;
  localKey: KeySignature;
  targetKey: KeySignature;
  ambiguityIntent: AmbiguityIntent;
  sequencePattern?: SequencePattern;
  fragmentTransform?: FragmentTransform;
  nextState?: FugueState;
  structuralBeatCount: number;
  bassRootSupportCount: number;
  chordToneSupportCount: number;
  structuralBeatMismatchCount: number;
  thinStructuralBeatCount: number;
  classification: "audible-progression" | "review-required";
  response: "accepted-context" | "generator-response-required";
};

export type HarmonicContinuitySummary = {
  schemaVersion: 1;
  focusedWindowCount: number;
  reviewRequiredWindowCount: number;
  audibleProgressionWindowCount: number;
  windows: HarmonicContinuityWindow[];
};

export type ScoreWindowAcceptanceKind =
  | "important-entry-continuity"
  | "harmonic-continuity"
  | "harmonic-sonority"
  | "transition-rhythm"
  | "dissonance-triage"
  | "active-voice-pair-span"
  | "counter-subject-survival"
  | "phrase-development"
  | "metric-explanation";

export type ScoreWindowAcceptanceResponse =
  | "accepted-context"
  | "review-required"
  | "generator-response-required"
  | "diagnostic-context";

export type ScoreWindowAcceptanceWindow = {
  kind: ScoreWindowAcceptanceKind;
  startTick: number;
  durationTicks?: number;
  state: FugueState | "mixed";
  voices: Voice[];
  roles: NoteRole[];
  classification: string;
  metric?: string;
  symptom: string;
  theoryBasis: "counterpoint" | "harmony" | "fugue-form" | "diagnostic-truthfulness";
  response: ScoreWindowAcceptanceResponse;
};

export type ScoreWindowAcceptanceSummary = {
  schemaVersion: 1;
  importantEntryWindowCount: number;
  harmonicContinuityWindowCount: number;
  harmonicSonorityWindowCount: number;
  transitionRhythmWindowCount: number;
  dissonanceWindowCount: number;
  activeVoicePairSpanCount: number;
  counterSubjectWindowCount: number;
  phraseDevelopmentWindowCount: number;
  metricExplanationCount: number;
  reviewRequiredWindowCount: number;
  generatorResponseWindowCount: number;
  acceptedContextWindowCount: number;
  diagnosticContextWindowCount: number;
  windows: ScoreWindowAcceptanceWindow[];
};

export type GenerationDiagnostics = {
  generatorVersion: number;
  selectionModel: SelectionModel;
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
  exposedFreeCounterpointSolo: ExposedFreeCounterpointSoloSummary;
  pitchContourMotion: PitchContourMotionSummary;
  lowerVoiceVocality: LowerVoiceVocalitySummary;
  stepwisePattern: StepwisePatternSummary;
  surfaceBrilliance: SurfaceBrillianceSummary;
  texturePlanningReview: TexturePlanningReviewSummary;
  meterConsistencyReview: MeterConsistencyReviewSummary;
  phraseRepetitionReview: PhraseRepetitionReviewSummary;
  episodeMotivicDevelopment: EpisodeMotivicDevelopmentSummary;
  entryBoundaryContinuity: EntryBoundaryContinuitySummary;
  bassAnswerTailTexture: BassAnswerTailTextureSummary;
  qualityVector: QualityVector;
  localSentinelCandidateTrace: LocalSentinelCandidateTraceSummary;
  phraseConvergenceReview: PhraseConvergenceReviewSummary;
  phraseDevelopmentReview: PhraseDevelopmentReviewSummary;
  dissonanceTriage: DissonanceTriageSummary;
  harmonicContinuity: HarmonicContinuitySummary;
  transitionRhythmReview: TransitionRhythmReviewSummary;
  scoreWindowAcceptance: ScoreWindowAcceptanceSummary;
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
