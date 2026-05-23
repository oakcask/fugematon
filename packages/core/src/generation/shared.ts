import { TICKS_PER_QUARTER, VOICE_RANGES } from "../constants.js";
import type { DiagnosticIssue, NoteEvent, Voice } from "../events.js";

export const SUBJECT_DURATIONS = [
  TICKS_PER_QUARTER,
  TICKS_PER_QUARTER,
  TICKS_PER_QUARTER / 2,
  TICKS_PER_QUARTER / 2,
  TICKS_PER_QUARTER,
  TICKS_PER_QUARTER,
  TICKS_PER_QUARTER,
  TICKS_PER_QUARTER,
] as const;
export const SUBJECT_DEGREES = [0, 1, 2, 3, 4, 3, 2, 1] as const;
export const VOICE_ENTRY_ORDER: Voice[] = ["alto", "soprano", "tenor", "bass"];
export const VOICE_REGISTER_TARGETS: Record<Voice, number> = {
  soprano: 76,
  alto: 67,
  tenor: 52,
  bass: 40,
};
export const VOICE_PREFERRED_MAX: Record<Voice, number> = {
  soprano: 81,
  alto: 70,
  tenor: 59,
  bass: 47,
};
export const ENTRY_SPACING_TICKS = TICKS_PER_QUARTER * 4;
export const STRETTO_ENTRY_SPACING_TICKS = TICKS_PER_QUARTER * 2;
export const COUNTER_SUBJECT_DEGREES = [4, 2, 3, 1, 2, 0, 1, 0] as const;
export const FREE_COUNTERPOINT_DEGREES = [0, 1, 2, 1, 3, 2, 1, 0] as const;
export const MODAL_COUNTER_SUBJECT_DEGREES = [4, 5, 4, 3, 2, 1, 2, 0] as const;
export const MODAL_FREE_COUNTERPOINT_DEGREES = [0, 1, 2, 3, 5, 4, 3, 2] as const;

export function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

export function pitchClassDistance(leftPitch: number, rightPitch: number): number {
  const interval = positiveModulo(leftPitch - rightPitch, 12);
  return Math.min(interval, 12 - interval);
}

export function subjectDuration(subject: readonly { durationTicks: number }[]): number {
  return subject.reduce((duration, note) => duration + note.durationTicks, 0);
}

export function hasOverlap(
  notes: readonly NoteEvent[],
  voice: Voice,
  startTick: number,
  durationTicks: number,
): boolean {
  const endTick = startTick + durationTicks;
  return notes.some(
    (note) => note.voice === voice && note.startTick < endTick && startTick < note.startTick + note.durationTicks,
  );
}

export function placePitchInRegister(pitchClass: number, voice: Voice, registerTarget: number): number {
  let pitch = positiveModulo(pitchClass, 12);
  while (pitch < registerTarget - 6) {
    pitch += 12;
  }
  while (pitch > registerTarget + 6) {
    pitch -= 12;
  }

  const range = VOICE_RANGES[voice];
  let fitted = pitch;
  while (fitted < range.min) {
    fitted += 12;
  }
  while (fitted > range.max) {
    fitted -= 12;
  }
  while (fitted > VOICE_PREFERRED_MAX[voice] && fitted - 12 >= range.min) {
    fitted -= 12;
  }
  return fitted;
}

export function isEntryRole(role: NoteEvent["role"]): boolean {
  return role === "subject" || role === "answer" || role === "subject-fragment";
}

export function roundRatio(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export function countIssues(issues: readonly DiagnosticIssue[], code: DiagnosticIssue["code"]): number {
  return issues.filter((issue) => issue.code === code).length;
}

export function compareNoteEvents(left: NoteEvent, right: NoteEvent): number {
  if (left.startTick !== right.startTick) {
    return left.startTick - right.startTick;
  }

  return left.voice.localeCompare(right.voice);
}
