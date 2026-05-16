import type { KeyMode, KeySignature } from "../events.js";
import { tonicPitchClass } from "./key.js";
import { positiveModulo } from "./shared.js";
import type { SubjectNote } from "./types.js";

const MODE_SCALE_INTERVALS: Record<KeyMode, readonly number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  aeolian: [0, 2, 3, 5, 7, 8, 10],
};

export function pitchClassForSubjectNote(note: SubjectNote, keySignature: KeySignature): number {
  return scaleDegreePitchClass(note.scaleDegree, note.accidental, keySignature);
}

export function scaleDegreePitchClass(scaleDegree: number, accidental: number, keySignature: KeySignature): number {
  const intervals = MODE_SCALE_INTERVALS[keySignature.mode];
  const octave = Math.floor(scaleDegree / intervals.length);
  const scaleIndex = positiveModulo(scaleDegree, intervals.length);
  return positiveModulo(tonicPitchClass(keySignature) + intervals[scaleIndex]! + octave * 12 + accidental, 12);
}

export function melodicRoleForScaleDegree(scaleDegree: number): SubjectNote["melodicRole"] {
  const normalized = positiveModulo(scaleDegree, 7);
  if (normalized === 0) {
    return "tonic";
  }
  if (normalized === 3) {
    return "predominant";
  }
  if (normalized === 4) {
    return "dominant";
  }
  return "passing";
}
