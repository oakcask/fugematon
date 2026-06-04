import type { KeyMode, KeySignature, TimeSignature } from "../events.js";
import type { Xoshiro128StarStar } from "../prng.js";
import { DEFAULT_WRITING_PROFILE_ID, type WritingProfile } from "../writing-profile.js";
import { isKeyFeasibleForProfile } from "./constraint-domain.js";
import { positiveModulo } from "./shared.js";

const TONICS = ["C", "D", "E", "F", "G", "A", "B", "Bb", "Eb", "Ab", "Db", "F#"] as const;
const TONIC_PITCH_CLASSES = new Map<string, number>([
  ["C", 0],
  ["D", 2],
  ["E", 4],
  ["F", 5],
  ["G", 7],
  ["A", 9],
  ["B", 11],
  ["Bb", 10],
  ["Eb", 3],
  ["Ab", 8],
  ["Db", 1],
  ["F#", 6],
]);
const PITCH_CLASS_TONICS = new Map<number, KeySignature["tonic"]>(
  [...TONIC_PITCH_CLASSES.entries()].map(([tonic, pitchClass]) => [pitchClass, tonic]),
);
const MODAL_MODES = new Set<KeyMode>(["dorian", "mixolydian", "aeolian"]);

export function chooseKeySignature(
  rng: Xoshiro128StarStar,
  seed: string,
  writingProfile?: WritingProfile,
): KeySignature {
  const requestedMode = modalModeFromSeed(seed);
  const mode: KeyMode =
    requestedMode ??
    rng.chooseWeighted([
      { value: "major", weight: 55 },
      { value: "minor", weight: 45 },
      { value: "dorian", weight: 4 },
      { value: "mixolydian", weight: 3 },
      { value: "aeolian", weight: 3 },
    ]);

  if (writingProfile === undefined || writingProfile.id === DEFAULT_WRITING_PROFILE_ID) {
    return {
      tonic: TONICS[rng.nextInt(TONICS.length)]!,
      mode,
    };
  }

  const profileFeasibleMode = firstProfileFeasibleMode(mode, requestedMode, writingProfile);
  const feasibleTonics = TONICS.filter((tonic) =>
    isKeyFeasibleForProfile({ tonic, mode: profileFeasibleMode }, writingProfile),
  );

  return {
    tonic:
      feasibleTonics.length > 0
        ? feasibleTonics[rng.nextInt(feasibleTonics.length)]!
        : TONICS[rng.nextInt(TONICS.length)]!,
    mode: profileFeasibleMode,
  };
}

function firstProfileFeasibleMode(
  selectedMode: KeyMode,
  requestedMode: KeyMode | undefined,
  writingProfile: WritingProfile,
): KeyMode {
  const fallbackModes: readonly KeyMode[] =
    requestedMode === undefined
      ? [selectedMode, "major", "minor", "dorian", "mixolydian", "aeolian"]
      : [requestedMode, "major", "minor", "dorian", "mixolydian", "aeolian"];
  for (const mode of fallbackModes) {
    if (TONICS.some((tonic) => isKeyFeasibleForProfile({ tonic, mode }, writingProfile))) {
      return mode;
    }
  }
  return selectedMode;
}

function modalModeFromSeed(seed: string): KeyMode | undefined {
  const normalizedSeed = seed.toLowerCase();
  if (normalizedSeed.includes("dorian")) {
    return "dorian";
  }
  if (normalizedSeed.includes("mixolydian")) {
    return "mixolydian";
  }
  if (normalizedSeed.includes("aeolian") || normalizedSeed.includes("modal")) {
    return "aeolian";
  }
  return undefined;
}

export function chooseTimeSignature(rng: Xoshiro128StarStar): TimeSignature {
  return rng.chooseWeighted<TimeSignature>([
    { value: { numerator: 4, denominator: 4 }, weight: 80 },
    { value: { numerator: 3, denominator: 4 }, weight: 15 },
    { value: { numerator: 6, denominator: 8 }, weight: 5 },
  ]);
}

export function chooseTempo(rng: Xoshiro128StarStar): number {
  return rng.nextIntRange(66, 108);
}

export function tonicPitchClass(keySignature: KeySignature): number {
  const tonic = TONIC_PITCH_CLASSES.get(keySignature.tonic);
  if (tonic === undefined) {
    throw new Error(`unsupported tonic: ${keySignature.tonic}`);
  }
  return tonic;
}

export function transposeKey(keySignature: KeySignature, semitones: number): KeySignature {
  const tonic = PITCH_CLASS_TONICS.get(positiveModulo(tonicPitchClass(keySignature) + semitones, 12));
  if (tonic === undefined) {
    throw new Error(`unsupported transposed key from ${keySignature.tonic}`);
  }
  return {
    tonic,
    mode: keySignature.mode,
  };
}

export function isModalMode(mode: KeyMode): boolean {
  return MODAL_MODES.has(mode);
}

export function characteristicScaleDegree(mode: KeyMode): number | undefined {
  if (mode === "dorian") {
    return 5;
  }
  if (mode === "mixolydian") {
    return 6;
  }
  if (mode === "aeolian") {
    return 5;
  }
  return undefined;
}
