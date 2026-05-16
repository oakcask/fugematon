import { TICKS_PER_QUARTER, VOICES } from "./constants.js";

export type Voice = (typeof VOICES)[number];

export type NoteEvent = {
  kind: "note";
  voice: Voice;
  startTick: number;
  durationTicks: number;
  pitch: number;
  velocity: number;
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
      payload: { state: string };
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

export type GenerationDiagnostics = {
  generatorVersion: number;
  seed: string;
  lengthTicks: number;
  eventCount: number;
  noteCount: number;
  stateTransitions: string[];
  rangeViolations: number;
  voiceCrossings: number;
  warnings: string[];
};

export type GenerationOutput = {
  events: ScoreEvent[];
  diagnostics: GenerationDiagnostics;
};
