import type { KeySignature } from "../events.js";
import type { Xoshiro128StarStar } from "../prng.js";
import { melodicRoleForScaleDegree } from "./pitch.js";
import { SUBJECT_DEGREES, SUBJECT_DURATIONS } from "./shared.js";
import type { SubjectNote } from "./types.js";

const SUBJECT_TURNBACK_DEGREES = [0, 1, 2, 3, 4, 3, 1, 2] as const;
const SUBJECT_THIRD_LEAP_DEGREES = [0, 2, 1, 3, 4, 3, 2, 1] as const;

export function buildSubject(rng: Xoshiro128StarStar, keySignature: KeySignature): SubjectNote[] {
  const shape = rng.chooseWeighted<readonly number[]>([
    { value: SUBJECT_TURNBACK_DEGREES, weight: 3 },
    { value: SUBJECT_DEGREES, weight: stepwiseFifthClimbWeight(keySignature) },
    { value: SUBJECT_THIRD_LEAP_DEGREES, weight: 2 },
  ]);

  let offsetTick = 0;
  return shape.map((scaleDegree, index) => {
    const note = {
      offsetTick,
      durationTicks: SUBJECT_DURATIONS[index]!,
      scaleDegree,
      accidental: 0,
      importantTone: scaleDegree === 0 || scaleDegree === 4 || index === shape.length - 1,
      melodicRole: melodicRoleForScaleDegree(scaleDegree),
    };
    offsetTick += note.durationTicks;
    return note;
  });
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
