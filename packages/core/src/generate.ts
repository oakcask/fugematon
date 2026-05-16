import {
  DEFAULT_GENERATION_PARAMETERS,
  GENERATOR_VERSION,
  TICKS_PER_QUARTER,
} from "./constants.js";
import type {
  GenerationInput,
  GenerationOutput,
  GenerationParameters,
  KeyMode,
  KeySignature,
  ScoreEvent,
  TimeSignature,
} from "./events.js";
import { Xoshiro128StarStar } from "./prng.js";

const TONICS = ["C", "D", "E", "F", "G", "A", "B", "Bb", "Eb", "Ab", "Db", "F#"] as const;

export function generateScore(input: GenerationInput): GenerationOutput {
  validateInput(input);

  const rng = Xoshiro128StarStar.fromSeed(input.seed);
  const parameters = normalizeParameters(input.parameters);
  const keySignature = chooseKeySignature(rng);
  const timeSignature = chooseTimeSignature(rng);
  const bpm = chooseTempo(rng);

  const events: ScoreEvent[] = [
    {
      kind: "meta",
      type: "generator-version",
      tick: 0,
      payload: { version: GENERATOR_VERSION },
    },
    {
      kind: "meta",
      type: "timebase",
      tick: 0,
      payload: { ticksPerQuarter: TICKS_PER_QUARTER },
    },
    {
      kind: "meta",
      type: "tempo-change",
      tick: 0,
      payload: { bpm },
    },
    {
      kind: "meta",
      type: "time-signature",
      tick: 0,
      payload: timeSignature,
    },
    {
      kind: "meta",
      type: "key-signature",
      tick: 0,
      payload: keySignature,
    },
    {
      kind: "meta",
      type: "parameter-change",
      tick: 0,
      payload: { parameters },
    },
    {
      kind: "meta",
      type: "state-change",
      tick: 0,
      payload: { state: "phase-0" },
    },
    {
      kind: "meta",
      type: "score-end",
      tick: input.lengthTicks,
      payload: { lengthTicks: input.lengthTicks },
    },
  ];

  return {
    events,
    diagnostics: {
      generatorVersion: GENERATOR_VERSION,
      seed: input.seed,
      lengthTicks: input.lengthTicks,
      eventCount: events.length,
      noteCount: 0,
      stateTransitions: ["phase-0"],
      rangeViolations: 0,
      voiceCrossings: 0,
      warnings: [],
    },
  };
}

export function normalizeParameters(
  parameters: Partial<GenerationParameters> | undefined,
): GenerationParameters {
  const merged = {
    ...DEFAULT_GENERATION_PARAMETERS,
    ...parameters,
  };

  for (const [name, value] of Object.entries(merged)) {
    if (!Number.isFinite(value) || value < 0 || value > 1) {
      throw new Error(`${name} must be a finite number between 0 and 1`);
    }
  }

  return merged;
}

function chooseKeySignature(rng: Xoshiro128StarStar): KeySignature {
  const mode: KeyMode = rng.chooseWeighted([
    { value: "major", weight: 55 },
    { value: "minor", weight: 45 },
  ]);

  return {
    tonic: TONICS[rng.nextInt(TONICS.length)]!,
    mode,
  };
}

function chooseTimeSignature(rng: Xoshiro128StarStar): TimeSignature {
  return rng.chooseWeighted<TimeSignature>([
    { value: { numerator: 4, denominator: 4 }, weight: 80 },
    { value: { numerator: 3, denominator: 4 }, weight: 15 },
    { value: { numerator: 6, denominator: 8 }, weight: 5 },
  ]);
}

function chooseTempo(rng: Xoshiro128StarStar): number {
  return rng.nextIntRange(66, 108);
}

function validateInput(input: GenerationInput): void {
  if (input.seed.length === 0) {
    throw new Error("seed must not be empty");
  }

  if (!Number.isSafeInteger(input.lengthTicks) || input.lengthTicks <= 0) {
    throw new Error("lengthTicks must be a positive safe integer");
  }
}
