import { TICKS_PER_QUARTER } from "../constants.js";
import type { KeyMode, KeySignature, MeterContext, SelectionModel } from "../events.js";
import type { Xoshiro128StarStar } from "../prng.js";
import { characteristicScaleDegree, isModalMode } from "./key.js";
import { beatStrengthAtTick, createLegacyMeterContext } from "./meter.js";
import { melodicRoleForScaleDegree } from "./pitch.js";
import { SUBJECT_DEGREES, SUBJECT_DURATIONS } from "./shared.js";
import type { SubjectNote } from "./types.js";

type SubjectProfile = {
  degrees: readonly number[];
  durations: readonly number[];
};

type SubjectRhetoricPlan = SubjectProfile & {
  openingGesture: OpeningGesture["family"];
  climaxIndex: number;
  climaxDegree: number;
  approachContour: ApproachContour;
  tailMotion: TailMotion;
  rhythmFamily: RhythmProfile["family"];
  rejectionReasons: string[];
  selectionBias: number;
};

type OpeningGesture = {
  family: "stepwise-tonic" | "third-return" | "upper-neighbor" | "tonic-leap-fill" | "modal-color-neighbor";
  degrees: readonly [number, number, number];
};

type ApproachContour = "stepwise-ascent" | "neighbor-turn" | "leap-recovery" | "arched";
type TailMotion = "descending" | "ascending" | "repeated" | "cadential-drop";

type RhythmProfile = {
  family:
    | "quarter-pulse"
    | "held-opening"
    | "mid-held"
    | "tail-held"
    | "triple-pulse"
    | "triple-answer"
    | "triple-tail"
    | "compound-pulse"
    | "compound-answer"
    | "compound-tail";
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
  const profile =
    selectionModel === "baseline"
      ? rng.chooseWeighted(subjectProfileChoices(keySignature, selectionModel, meterContext))
      : chooseSubjectRhetoricPlan(rng, keySignature, meterContext);

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

function chooseSubjectRhetoricPlan(
  rng: Xoshiro128StarStar,
  keySignature: KeySignature,
  meterContext: MeterContext,
): SubjectRhetoricPlan {
  const candidates = Array.from({ length: 36 }, () =>
    buildSubjectRhetoricCandidate({
      opening: rng.chooseWeighted(openingGestureChoices(keySignature.mode)),
      climaxIndex: rng.chooseWeighted(climaxIndexChoices(meterContext)),
      approachContour: rng.chooseWeighted(approachContourChoices()),
      tailMotion: rng.chooseWeighted(tailMotionChoices(keySignature.mode)),
      rhythm: rng.chooseWeighted(rhythmProfileChoices(meterContext)),
      keySignature,
      preference: rng.nextFloat(),
    }),
  );
  const viable = candidates.filter((candidate) => candidate.rejectionReasons.length === 0);
  const pool = viable.length > 0 ? viable : candidates;

  return pool.reduce((best, candidate) =>
    scoreSubjectRhetoricPlan(candidate, keySignature, meterContext) >
    scoreSubjectRhetoricPlan(best, keySignature, meterContext)
      ? candidate
      : best,
  );
}

function buildSubjectRhetoricCandidate({
  opening,
  climaxIndex,
  approachContour,
  tailMotion,
  rhythm,
  keySignature,
  preference,
}: {
  opening: OpeningGesture;
  climaxIndex: number;
  approachContour: ApproachContour;
  tailMotion: TailMotion;
  rhythm: RhythmProfile;
  keySignature: KeySignature;
  preference: number;
}): SubjectRhetoricPlan {
  const characteristicDegree = characteristicScaleDegree(keySignature.mode);
  const modalClimax = opening.family === "modal-color-neighbor" && characteristicDegree !== undefined;
  const climaxDegree = modalClimax ? characteristicDegree : 4;
  const degrees = assembleSubjectDegrees({
    opening,
    climaxIndex,
    climaxDegree,
    approachContour,
    tailMotion,
    mode: keySignature.mode,
  });
  const rejectionReasons = subjectRhetoricRejectionReasons(degrees, rhythm.durations);
  const preferenceOffset = preference > 0.66 ? 1 : preference > 0.33 ? 0 : -1;
  const adjustedDegrees =
    rejectionReasons.length === 0 || preferenceOffset === 0
      ? degrees
      : degrees.map((degree, index) =>
          index === 6 ? clampDegree(degree + preferenceOffset, keySignature.mode) : degree,
        );

  return {
    degrees: adjustedDegrees,
    durations: rhythm.durations,
    openingGesture: opening.family,
    climaxIndex,
    climaxDegree,
    approachContour,
    tailMotion,
    rhythmFamily: rhythm.family,
    rejectionReasons: subjectRhetoricRejectionReasons(adjustedDegrees, rhythm.durations),
    selectionBias: preference,
  };
}

function assembleSubjectDegrees({
  opening,
  climaxIndex,
  climaxDegree,
  approachContour,
  tailMotion,
  mode,
}: {
  opening: OpeningGesture;
  climaxIndex: number;
  climaxDegree: number;
  approachContour: ApproachContour;
  tailMotion: TailMotion;
  mode: KeyMode;
}): number[] {
  const degrees = [...opening.degrees, 0, 0, 0, 0, 0];
  degrees[climaxIndex] = climaxDegree;

  for (let index = 3; index < 6; index += 1) {
    if (index === climaxIndex) {
      continue;
    }
    const previous = degrees[index - 1]!;
    if (index < climaxIndex) {
      degrees[index] = approachDegree(previous, climaxDegree, approachContour, mode);
    } else {
      degrees[index] = retreatDegree(previous, approachContour, mode);
    }
  }

  const [penultimate, final] = tailDegrees(tailMotion, degrees[5]!, mode);
  degrees[6] = penultimate;
  degrees[7] = final;

  if (!degrees.some((degree, index) => degree === 4 && (index === climaxIndex || index === 4 || index === 7))) {
    degrees[4] = 4;
  }

  return degrees.map((degree) => clampDegree(degree, mode));
}

function approachDegree(
  previous: number,
  climaxDegree: number,
  approachContour: ApproachContour,
  mode: KeyMode,
): number {
  if (approachContour === "leap-recovery") {
    return clampDegree(Math.min(climaxDegree - 1, previous + 2), mode);
  }
  if (approachContour === "neighbor-turn") {
    return clampDegree(previous <= 1 ? previous + 3 : previous - 1, mode);
  }
  if (approachContour === "arched") {
    return clampDegree(Math.min(climaxDegree - 1, previous + (previous < 2 ? 2 : 1)), mode);
  }
  return clampDegree(Math.min(climaxDegree - 1, previous + 1), mode);
}

function retreatDegree(previous: number, approachContour: ApproachContour, mode: KeyMode): number {
  if (approachContour === "neighbor-turn") {
    return clampDegree(previous > 3 ? 2 : previous + 1, mode);
  }
  if (approachContour === "leap-recovery") {
    return clampDegree(Math.max(1, previous - 2), mode);
  }
  return clampDegree(Math.max(1, previous - 1), mode);
}

function tailDegrees(tailMotion: TailMotion, previous: number, mode: KeyMode): readonly [number, number] {
  if (tailMotion === "ascending") {
    return [1, isModalMode(mode) ? 3 : 2];
  }
  if (tailMotion === "repeated") {
    const degree = previous <= 2 ? 2 : 3;
    return [degree, degree];
  }
  if (tailMotion === "cadential-drop") {
    return [3, 0];
  }
  return [Math.max(1, Math.min(3, previous - 1)), 1];
}

function subjectRhetoricRejectionReasons(degrees: readonly number[], durations: readonly number[]): string[] {
  const reasons: string[] = [];
  if (degrees.length !== 8 || durations.length !== 8) {
    reasons.push("subject must keep the eight-note entry contract");
  }
  if (degrees[0] !== 0) {
    reasons.push("subject must begin from tonic anchoring");
  }
  if (!degrees.some((degree) => degree === 4)) {
    reasons.push("subject must retain fifth-area answer pressure");
  }
  if (degrees.some((degree) => degree < 0 || degree > 6)) {
    reasons.push("subject range must stay within one modal heptachord");
  }
  if (hasUnrecoveredLeap(degrees)) {
    reasons.push("large melodic leap must recover by contrary motion");
  }
  if (maxConsecutiveRepeatedDegrees(degrees) > 2) {
    reasons.push("subject must avoid static repeated-degree rhetoric");
  }

  return reasons;
}

function hasUnrecoveredLeap(degrees: readonly number[]): boolean {
  for (let index = 1; index < degrees.length - 1; index += 1) {
    const interval = degrees[index]! - degrees[index - 1]!;
    if (Math.abs(interval) < 3) {
      continue;
    }
    const recovery = degrees[index + 1]! - degrees[index]!;
    if (recovery === 0 || Math.sign(recovery) === Math.sign(interval)) {
      return true;
    }
  }
  return false;
}

function maxConsecutiveRepeatedDegrees(degrees: readonly number[]): number {
  let maxRun = 1;
  let currentRun = 1;
  for (let index = 1; index < degrees.length; index += 1) {
    if (degrees[index] === degrees[index - 1]) {
      currentRun += 1;
      maxRun = Math.max(maxRun, currentRun);
    } else {
      currentRun = 1;
    }
  }
  return maxRun;
}

function scoreSubjectRhetoricPlan(
  plan: SubjectRhetoricPlan,
  keySignature: KeySignature,
  meterContext: MeterContext,
): number {
  const strongBeatStructuralCount = plan.degrees.reduce((count, degree, index) => {
    const offsetTick = plan.durations.slice(0, index).reduce((sum, duration) => sum + duration, 0);
    const strong = beatStrengthAtTick(offsetTick, meterContext) === "strong";
    return count + (strong && (degree === 0 || degree === 3 || degree === 4) ? 1 : 0);
  }, 0);
  const uniqueDegreeCount = new Set(plan.degrees).size;
  const modalColorBonus =
    isModalMode(keySignature.mode) && characteristicScaleDegree(keySignature.mode) !== undefined
      ? Number(plan.degrees.includes(characteristicScaleDegree(keySignature.mode)!)) * 2
      : 0;
  const answerPressureBonus = plan.degrees.some(
    (degree, index) => degree === 4 && (index === 3 || index === 4 || index === 5),
  )
    ? 2
    : 0;
  const meterBonus =
    meterContext.timeSignature.numerator === 6
      ? Number(plan.rhythmFamily.startsWith("compound")) * 2
      : meterContext.timeSignature.numerator === 3
        ? Number(plan.rhythmFamily.startsWith("triple")) * 2
        : Number(!plan.rhythmFamily.startsWith("triple") && !plan.rhythmFamily.startsWith("compound"));

  return (
    strongBeatStructuralCount +
    uniqueDegreeCount +
    modalColorBonus +
    answerPressureBonus +
    meterBonus -
    plan.rejectionReasons.length * 20 +
    plan.selectionBias * 1.5
  );
}

function openingGestureChoices(mode: KeyMode): { value: OpeningGesture; weight: number }[] {
  const choices: { value: OpeningGesture; weight: number }[] = [
    { value: { family: "stepwise-tonic", degrees: [0, 1, 2] }, weight: mode === "major" ? 0.75 : 1.25 },
    { value: { family: "third-return", degrees: [0, 2, 1] }, weight: 1.5 },
    { value: { family: "upper-neighbor", degrees: [0, 1, 3] }, weight: 1.5 },
    { value: { family: "tonic-leap-fill", degrees: [0, 3, 2] }, weight: 1 },
  ];
  const characteristicDegree = characteristicScaleDegree(mode);
  if (characteristicDegree !== undefined) {
    choices.push({
      value: { family: "modal-color-neighbor", degrees: [0, 2, characteristicDegree] },
      weight: 2,
    });
  }
  return choices;
}

function climaxIndexChoices(meterContext: MeterContext): { value: number; weight: number }[] {
  if (meterContext.timeSignature.numerator === 3) {
    return [
      { value: 3, weight: 1.2 },
      { value: 4, weight: 1.6 },
      { value: 5, weight: 1 },
    ];
  }
  if (meterContext.timeSignature.numerator === 6) {
    return [
      { value: 3, weight: 1 },
      { value: 4, weight: 1 },
      { value: 5, weight: 1.7 },
    ];
  }
  return [
    { value: 3, weight: 1.2 },
    { value: 4, weight: 1.4 },
    { value: 5, weight: 1.2 },
  ];
}

function approachContourChoices(): { value: ApproachContour; weight: number }[] {
  return [
    { value: "stepwise-ascent", weight: 1.5 },
    { value: "neighbor-turn", weight: 1.2 },
    { value: "leap-recovery", weight: 1 },
    { value: "arched", weight: 1 },
  ];
}

function tailMotionChoices(mode: KeyMode): { value: TailMotion; weight: number }[] {
  return [
    { value: "descending", weight: 1.4 },
    { value: "ascending", weight: isModalMode(mode) ? 1.2 : 0.9 },
    { value: "repeated", weight: 0.7 },
    { value: "cadential-drop", weight: 1 },
  ];
}

function rhythmProfileChoices(meterContext: MeterContext): { value: RhythmProfile; weight: number }[] {
  if (meterContext.timeSignature.numerator === 3) {
    return [
      { value: rhythmProfile("triple-pulse", SUBJECT_TRIPLE_DURATIONS), weight: 1.4 },
      { value: rhythmProfile("triple-answer", SUBJECT_TRIPLE_ANSWERED_DURATIONS), weight: 1.2 },
      { value: rhythmProfile("triple-tail", SUBJECT_TAIL_HELD_DURATIONS), weight: 0.8 },
    ];
  }
  if (meterContext.timeSignature.numerator === 6) {
    return [
      { value: rhythmProfile("compound-pulse", SUBJECT_COMPOUND_DURATIONS), weight: 1.4 },
      { value: rhythmProfile("compound-answer", SUBJECT_TRIPLE_ANSWERED_DURATIONS), weight: 0.8 },
      { value: rhythmProfile("compound-tail", SUBJECT_TAIL_HELD_DURATIONS), weight: 0.8 },
    ];
  }
  return [
    { value: rhythmProfile("quarter-pulse", SUBJECT_DURATIONS), weight: 0.8 },
    { value: rhythmProfile("held-opening", SUBJECT_HELD_OPENING_DURATIONS), weight: 1.2 },
    { value: rhythmProfile("mid-held", SUBJECT_MID_HELD_DURATIONS), weight: 1.2 },
    { value: rhythmProfile("tail-held", SUBJECT_TAIL_HELD_DURATIONS), weight: 1 },
  ];
}

function rhythmProfile(family: RhythmProfile["family"], durations: readonly number[]): RhythmProfile {
  return { family, durations };
}

function clampDegree(degree: number, mode: KeyMode): number {
  const maxDegree = isModalMode(mode) ? 6 : 5;
  return Math.max(0, Math.min(maxDegree, degree));
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
