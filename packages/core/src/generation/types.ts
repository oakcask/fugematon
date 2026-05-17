import type {
  CandidateEvaluation,
  CandidatePoolOracleSummary,
  DurationDistribution,
  EntrySupportInstabilitySummary,
  EntrySupportSevereIntervalSummary,
  FugueState,
  GenerationOutput,
  HarmonicPlan,
  NoteEvent,
  OrnamentPlacementReasons,
  PitchContourMotionSummary,
  SoloTextureSummary,
  StepwisePatternSummary,
} from "../events.js";

export type SubjectNote = {
  offsetTick: number;
  durationTicks: number;
  scaleDegree: number;
  accidental: number;
  importantTone: boolean;
  melodicRole: "tonic" | "passing" | "predominant" | "dominant";
};

export type Exposition = {
  notes: NoteEvent[];
  subjectEntries: GenerationOutput["diagnostics"]["subjectEntries"];
  sectionPlans: HarmonicPlan[];
  endTick: number;
  durationTicks: number;
};

export type FugueScore = Exposition & {
  candidateEvaluations: number;
  selectedCandidateEvaluations: CandidateEvaluation[];
  candidatePoolOracle: CandidatePoolOracleSummary;
  stateTransitions: FugueState[];
  stateChanges: {
    tick: number;
    state: FugueState;
  }[];
};

export type HarmonicDiagnostics = {
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
};

export type TextureDiagnostics = {
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
  ornamentCandidateCount: number;
  ornamentDensity: number;
  ornamentPlacementReasons: OrnamentPlacementReasons;
};

export type ActivePitch = {
  pitch: number;
  role: NoteEvent["role"];
};

export type ActiveVerticality = Map<import("../events.js").Voice, ActivePitch>;
