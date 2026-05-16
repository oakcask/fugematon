import type { TICKS_PER_QUARTER, VOICES } from "./constants.js";

export type Voice = (typeof VOICES)[number];

export type NoteRole = "subject" | "answer" | "subject-fragment" | "counter-subject" | "free-counterpoint" | "fallback";

export type NoteEvent = {
  kind: "note";
  voice: Voice;
  startTick: number;
  durationTicks: number;
  pitch: number;
  velocity: number;
  role?: NoteRole;
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

export type GenerationInput = {
  seed: string;
  lengthTicks: number;
  parameters?: Partial<GenerationParameters>;
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

export type CandidateEvaluation = {
  totalCost: number;
  hardFailures: DiagnosticIssueCode[];
  dimensions: {
    counterpoint: ScoreDimension;
    melody: ScoreDimension;
    texture: ScoreDimension;
    subjectClarity: ScoreDimension;
    harmony: ScoreDimension;
    form: ScoreDimension;
  };
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

export type GenerationDiagnostics = {
  generatorVersion: number;
  seed: string;
  lengthTicks: number;
  generatedUntilTick: number;
  eventCount: number;
  noteCount: number;
  candidateEvaluations: number;
  selectedCandidateEvaluations: CandidateEvaluation[];
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
