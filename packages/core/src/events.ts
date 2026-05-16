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

export type KeyMode = "major" | "minor";

export type KeySignature = {
  tonic: string;
  mode: KeyMode;
};

export type FugueState = "exposition" | "episode" | "subject-return" | "stretto-like";

export type EntryForm = "subject" | "answer" | "subject-fragment";

export type AnswerKind = "true" | "tonal";

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
  | "leap-recovery-miss";

export type DiagnosticIssue = {
  code: DiagnosticIssueCode;
  severity: "warning";
  tick: number;
  voices: Voice[];
  pitches: Partial<Record<Voice, number>>;
  message: string;
};

export type GenerationDiagnostics = {
  generatorVersion: number;
  seed: string;
  lengthTicks: number;
  generatedUntilTick: number;
  eventCount: number;
  noteCount: number;
  candidateEvaluations: number;
  stateTransitions: FugueState[];
  subjectEntries: PlannedEntry[];
  rangeViolations: number;
  voiceCrossings: number;
  parallelPerfects: number;
  subjectIdentityViolations: number;
  answerPlanViolations: number;
  keyMetadataMismatches: number;
  counterSubjectCoverage: number;
  freeCounterpointCoverage: number;
  fallbackPassageCount: number;
  melodicStagnationWarnings: number;
  leapRecoveryMisses: number;
  issues: DiagnosticIssue[];
  warnings: string[];
};

export type GenerationOutput = {
  events: ScoreEvent[];
  diagnostics: GenerationDiagnostics;
};
