import { TICKS_PER_QUARTER } from "../constants.js";
import type { KeySignature, MeterContext, SelectionModel } from "../events.js";
import type { Xoshiro128StarStar } from "../prng.js";
import { isModalMode } from "./key.js";
import { beatStrengthAtTick, createLegacyMeterContext } from "./meter.js";
import { melodicRoleForScaleDegree } from "./pitch.js";
import { SUBJECT_DEGREES, SUBJECT_DURATIONS } from "./shared.js";
import type { SubjectNote } from "./types.js";

type SubjectProfile = {
  degrees: readonly number[];
  durations: readonly number[];
};

const SUBJECT_TURNBACK_DEGREES = [0, 1, 2, 3, 4, 3, 1, 2] as const;
const SUBJECT_THIRD_LEAP_DEGREES = [0, 2, 1, 3, 4, 3, 2, 1] as const;
const SUBJECT_UPPER_NEIGHBOR_DEGREES = [0, 1, 3, 2, 4, 3, 2, 1] as const;
const SUBJECT_EARLY_CLIMAX_DEGREES = [0, 1, 3, 4, 2, 3, 2, 1] as const;
const SUBJECT_LATE_CLIMAX_DEGREES = [0, 2, 3, 1, 2, 4, 3, 1] as const;
const SUBJECT_ANSWERED_TAIL_DEGREES = [0, 2, 1, 3, 4, 2, 3, 1] as const;

const SUBJECT_HELD_OPENING_DURATIONS = [
  TICKS_PER_QUARTER * 2,
  TICKS_PER_QUARTER / 2,
  TICKS_PER_QUARTER / 2,
  TICKS_PER_QUARTER,
  TICKS_PER_QUARTER,
  TICKS_PER_QUARTER / 2,
  TICKS_PER_QUARTER / 2,
  TICKS_PER_QUARTER,
] as const;
const SUBJECT_MID_HELD_DURATIONS = [
  TICKS_PER_QUARTER,
  TICKS_PER_QUARTER * 2,
  TICKS_PER_QUARTER / 2,
  TICKS_PER_QUARTER / 2,
  TICKS_PER_QUARTER,
  TICKS_PER_QUARTER,
  TICKS_PER_QUARTER / 2,
  TICKS_PER_QUARTER / 2,
] as const;
const SUBJECT_TAIL_HELD_DURATIONS = [
  TICKS_PER_QUARTER,
  TICKS_PER_QUARTER / 2,
  TICKS_PER_QUARTER / 2,
  TICKS_PER_QUARTER,
  TICKS_PER_QUARTER,
  TICKS_PER_QUARTER * 2,
  TICKS_PER_QUARTER / 2,
  TICKS_PER_QUARTER / 2,
] as const;
const SUBJECT_TRIPLE_DURATIONS = [
  TICKS_PER_QUARTER,
  TICKS_PER_QUARTER / 2,
  TICKS_PER_QUARTER / 2,
  TICKS_PER_QUARTER,
  TICKS_PER_QUARTER,
  TICKS_PER_QUARTER / 2,
  TICKS_PER_QUARTER / 2,
  TICKS_PER_QUARTER,
] as const;
const SUBJECT_TRIPLE_ANSWERED_DURATIONS = [
  TICKS_PER_QUARTER,
  TICKS_PER_QUARTER,
  TICKS_PER_QUARTER / 2,
  TICKS_PER_QUARTER / 2,
  TICKS_PER_QUARTER,
  TICKS_PER_QUARTER / 2,
  TICKS_PER_QUARTER / 2,
  TICKS_PER_QUARTER,
] as const;
const SUBJECT_COMPOUND_DURATIONS = [
  TICKS_PER_QUARTER + TICKS_PER_QUARTER / 2,
  TICKS_PER_QUARTER / 2,
  TICKS_PER_QUARTER / 2,
  TICKS_PER_QUARTER / 2,
  TICKS_PER_QUARTER + TICKS_PER_QUARTER / 2,
  TICKS_PER_QUARTER / 2,
  TICKS_PER_QUARTER / 2,
  TICKS_PER_QUARTER / 2,
] as const;

export function buildSubject(
  rng: Xoshiro128StarStar,
  keySignature: KeySignature,
  selectionModel: SelectionModel = "baseline",
  meterContext: MeterContext = createLegacyMeterContext(),
): SubjectNote[] {
  const profile = rng.chooseWeighted(subjectProfileChoices(keySignature, selectionModel, meterContext));

  let offsetTick = 0;
  return profile.degrees.map((scaleDegree, index) => {
    const note = {
      offsetTick,
      durationTicks: profile.durations[index]!,
      scaleDegree,
      accidental: 0,
      importantTone: scaleDegree === 0 || scaleDegree === 4 || index === profile.degrees.length - 1,
      melodicRole: melodicRoleForScaleDegree(scaleDegree),
      metricalHarmonyIntent: subjectMetricalHarmonyIntent(
        offsetTick,
        scaleDegree,
        index,
        profile.degrees,
        meterContext,
      ),
    };
    offsetTick += note.durationTicks;
    return note;
  });
}

function subjectProfileChoices(
  keySignature: KeySignature,
  selectionModel: SelectionModel,
  meterContext: MeterContext,
): { value: SubjectProfile; weight: number }[] {
  if (meterContext.timeSignature.numerator === 3) {
    return [
      { value: subjectProfile(SUBJECT_TURNBACK_DEGREES, SUBJECT_TRIPLE_DURATIONS), weight: 2 },
      { value: subjectProfile(SUBJECT_UPPER_NEIGHBOR_DEGREES, SUBJECT_TRIPLE_DURATIONS), weight: 2 },
      { value: subjectProfile(SUBJECT_EARLY_CLIMAX_DEGREES, SUBJECT_TRIPLE_ANSWERED_DURATIONS), weight: 1.5 },
      { value: subjectProfile(SUBJECT_ANSWERED_TAIL_DEGREES, SUBJECT_TRIPLE_ANSWERED_DURATIONS), weight: 1.5 },
    ];
  }

  if (meterContext.timeSignature.numerator === 6) {
    return [
      { value: subjectProfile(SUBJECT_TURNBACK_DEGREES, SUBJECT_COMPOUND_DURATIONS), weight: 2 },
      { value: subjectProfile(SUBJECT_ANSWERED_TAIL_DEGREES, SUBJECT_COMPOUND_DURATIONS), weight: 2 },
      { value: subjectProfile(SUBJECT_UPPER_NEIGHBOR_DEGREES, SUBJECT_COMPOUND_DURATIONS), weight: 1.5 },
    ];
  }

  const legacyChoices = [
    { value: subjectProfile(SUBJECT_TURNBACK_DEGREES, SUBJECT_DURATIONS), weight: 3 },
    { value: subjectProfile(SUBJECT_DEGREES, SUBJECT_DURATIONS), weight: stepwiseFifthClimbWeight(keySignature) },
    { value: subjectProfile(SUBJECT_THIRD_LEAP_DEGREES, SUBJECT_DURATIONS), weight: 2 },
  ];

  if (selectionModel !== "section-local-planner") {
    return legacyChoices;
  }

  if (isModalMode(keySignature.mode)) {
    return [
      ...legacyChoices,
      { value: subjectProfile(SUBJECT_UPPER_NEIGHBOR_DEGREES, SUBJECT_DURATIONS), weight: 1.25 },
    ];
  }

  return [
    { value: subjectProfile(SUBJECT_TURNBACK_DEGREES, SUBJECT_DURATIONS), weight: 1.5 },
    { value: subjectProfile(SUBJECT_DEGREES, SUBJECT_DURATIONS), weight: stepwiseFifthClimbWeight(keySignature) },
    { value: subjectProfile(SUBJECT_THIRD_LEAP_DEGREES, SUBJECT_DURATIONS), weight: 0.75 },
    { value: subjectProfile(SUBJECT_UPPER_NEIGHBOR_DEGREES, SUBJECT_DURATIONS), weight: 1.75 },
    { value: subjectProfile(SUBJECT_EARLY_CLIMAX_DEGREES, SUBJECT_HELD_OPENING_DURATIONS), weight: 2.5 },
    { value: subjectProfile(SUBJECT_LATE_CLIMAX_DEGREES, SUBJECT_MID_HELD_DURATIONS), weight: 2.5 },
    { value: subjectProfile(SUBJECT_ANSWERED_TAIL_DEGREES, SUBJECT_TAIL_HELD_DURATIONS), weight: 1.75 },
  ];
}

function subjectProfile(degrees: readonly number[], durations: readonly number[]): SubjectProfile {
  return { degrees, durations };
}

function subjectMetricalHarmonyIntent(
  offsetTick: number,
  scaleDegree: number,
  index: number,
  shape: readonly number[],
  meterContext: MeterContext,
): SubjectNote["metricalHarmonyIntent"] {
  const beatStrength = beatStrengthAtTick(offsetTick, meterContext);
  if (beatStrength === "strong") {
    return scaleDegree === 0 ? "structural-root-support" : "structural-chord-tone";
  }
  if (beatStrength === "weak") {
    const previous = shape[index - 1];
    const next = shape[index + 1];
    if (previous !== undefined && next !== undefined && previous === next) {
      return "weak-neighbor-tone";
    }
    return "weak-passing-tone";
  }
  return "offbeat-motion";
}

function stepwiseFifthClimbWeight(keySignature: KeySignature): number {
  if (keySignature.mode === "minor") {
    return 3;
  }
  if (keySignature.mode === "major") {
    return 0.25;
  }
  return 1;
}
