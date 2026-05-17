import { TICKS_PER_QUARTER, VOICE_RANGES } from "../constants.js";
import type { KeyMode, KeySignature, NoteEvent, Voice } from "../events.js";
import { isModalMode } from "./key.js";
import { melodicRoleForScaleDegree, scaleDegreePitchClass } from "./pitch.js";
import {
  COUNTER_SUBJECT_DEGREES,
  compareNoteEvents,
  FREE_COUNTERPOINT_DEGREES,
  hasOverlap,
  MODAL_COUNTER_SUBJECT_DEGREES,
  MODAL_FREE_COUNTERPOINT_DEGREES,
  placePitchInRegister,
  VOICE_ENTRY_ORDER,
  VOICE_REGISTER_TARGETS,
} from "./shared.js";
import type { Exposition, SubjectNote } from "./types.js";

export type ContinuityCounterpointInput = {
  startTick: number;
  durationTicks: number;
  localKey: KeySignature;
};

export type ContinuityTexturePlan = ContinuityCounterpointInput & {
  voices: Voice[];
};

export function addCounterpointTexture(
  notes: Exposition["notes"],
  subject: readonly SubjectNote[],
  entry: {
    enteringVoice: Voice;
    startTick: number;
    durationTicks: number;
    localKey: KeySignature;
    eligibleVoices?: readonly Voice[];
  },
): void {
  const eligibleVoices = entry.eligibleVoices ?? VOICE_ENTRY_ORDER.filter((voice) => voice !== entry.enteringVoice);
  const counterSubjectVoice = chooseTextureVoice(
    notes,
    entry.enteringVoice,
    entry.startTick,
    entry.durationTicks,
    eligibleVoices,
  );
  if (counterSubjectVoice !== undefined) {
    addPatternCounterpoint(notes, subject, {
      voice: counterSubjectVoice,
      startTick: entry.startTick,
      maxDurationTicks: entry.durationTicks,
      localKey: entry.localKey,
      degrees: counterSubjectDegreesForMode(entry.localKey.mode),
      velocity: 70,
      role: "counter-subject",
    });
  }

  for (const voice of eligibleVoices) {
    if (voice === entry.enteringVoice || voice === counterSubjectVoice) {
      continue;
    }

    addPatternCounterpoint(notes, subject, {
      voice,
      startTick: entry.startTick,
      maxDurationTicks: entry.durationTicks,
      localKey: entry.localKey,
      degrees: freeCounterpointDegreesForMode(entry.localKey.mode),
      velocity: 62,
      role: "free-counterpoint",
    });
  }

  if (entry.eligibleVoices !== undefined) {
    repairTextureVoiceCrossings(notes, entry.startTick, entry.durationTicks);
  }
}

export function chooseTextureVoice(
  notes: readonly NoteEvent[],
  enteringVoice: Voice,
  startTick: number,
  durationTicks: number,
  eligibleVoices: readonly Voice[],
): Voice | undefined {
  const startIndex = VOICE_ENTRY_ORDER.indexOf(enteringVoice);
  const candidates = [...VOICE_ENTRY_ORDER.slice(startIndex + 1), ...VOICE_ENTRY_ORDER.slice(0, startIndex)].filter(
    (voice) => voice !== enteringVoice && eligibleVoices.includes(voice),
  );

  return candidates.find((voice) => !hasOverlap(notes, voice, startTick, durationTicks));
}

export function addPatternCounterpoint(
  notes: Exposition["notes"],
  subject: readonly SubjectNote[],
  pattern: {
    voice: Voice;
    startTick: number;
    maxDurationTicks: number;
    localKey: KeySignature;
    degrees: readonly number[];
    velocity: number;
    role: NoteEvent["role"];
  },
): void {
  let elapsedTicks = 0;
  for (let index = 0; index < subject.length && elapsedTicks < pattern.maxDurationTicks; index += 1) {
    const subjectNote = subject[index]!;
    const durationTicks = Math.min(subjectNote.durationTicks, pattern.maxDurationTicks - elapsedTicks);
    const startTick = pattern.startTick + elapsedTicks;
    if (hasOverlap(notes, pattern.voice, startTick, durationTicks)) {
      elapsedTicks += subjectNote.durationTicks;
      continue;
    }

    const degree = pattern.degrees[index % pattern.degrees.length]!;
    if (pattern.role === "free-counterpoint" && durationTicks >= TICKS_PER_QUARTER) {
      const firstDurationTicks = Math.floor(durationTicks / 2);
      addTextureNote(notes, pattern, degree, startTick, firstDurationTicks);
      addTextureNote(
        notes,
        pattern,
        pattern.degrees[(index + 1) % pattern.degrees.length]!,
        startTick + firstDurationTicks,
        durationTicks - firstDurationTicks,
      );
    } else {
      addTextureNote(notes, pattern, degree, startTick, durationTicks);
    }
    elapsedTicks += subjectNote.durationTicks;
  }
}

export function addTextureNote(
  notes: Exposition["notes"],
  pattern: {
    voice: Voice;
    localKey: KeySignature;
    velocity: number;
    role: NoteEvent["role"];
  },
  degree: number,
  startTick: number,
  durationTicks: number,
): void {
  const previous = notes
    .filter((note) => note.voice === pattern.voice && note.startTick <= startTick)
    .sort(compareNoteEvents)
    .at(-1);
  let pitchClass = scaleDegreePitchClass(degree, 0, pattern.localKey);
  let pitch = placePitchInRegister(pitchClass, pattern.voice, VOICE_REGISTER_TARGETS[pattern.voice]);
  if (previous?.pitch === pitch && pattern.role === "free-counterpoint") {
    pitchClass = scaleDegreePitchClass(degree + 1, 0, pattern.localKey);
    pitch = placePitchInRegister(pitchClass, pattern.voice, VOICE_REGISTER_TARGETS[pattern.voice]);
  }
  if (previous !== undefined && (pattern.role === "free-counterpoint" || pattern.role === "counter-subject")) {
    pitch = fitPitchNearPrevious(pitchClass, pattern.voice, previous.pitch);
  }
  notes.push({
    kind: "note",
    voice: pattern.voice,
    startTick,
    durationTicks,
    pitch,
    velocity: pattern.velocity,
    role: pattern.role,
  });
}

export function fitPitchNearPrevious(pitchClass: number, voice: Voice, previousPitch: number): number {
  const range = VOICE_RANGES[voice];
  const preferredMin = Math.max(range.min, VOICE_REGISTER_TARGETS[voice] - 6);
  let pitch = placePitchInRegister(pitchClass, voice, VOICE_REGISTER_TARGETS[voice]);
  while (pitch - previousPitch > 5 && pitch - 12 >= preferredMin) {
    pitch -= 12;
  }
  while (previousPitch - pitch > 5 && pitch + 12 <= range.max) {
    pitch += 12;
  }
  return pitch;
}

function repairTextureVoiceCrossings(notes: Exposition["notes"], startTick: number, durationTicks: number): void {
  const endTick = startTick + durationTicks;
  const checkpoints = [
    ...new Set(notes.flatMap((note) => [note.startTick, note.startTick + note.durationTicks])),
  ].filter((tick) => startTick <= tick && tick < endTick);
  const adjacentPairs: readonly (readonly [higher: Voice, lower: Voice])[] = [
    ["soprano", "alto"],
    ["alto", "tenor"],
    ["tenor", "bass"],
  ];

  for (const tick of checkpoints) {
    for (const [higher, lower] of adjacentPairs) {
      const higherNote = activeNoteAt(notes, higher, tick);
      const lowerNote = activeNoteAt(notes, lower, tick);
      if (
        higherNote === undefined ||
        lowerNote === undefined ||
        higherNote.pitch >= lowerNote.pitch ||
        !isTextureRole(higherNote.role) ||
        !isTextureRole(lowerNote.role)
      ) {
        continue;
      }

      if (canMoveDownWithoutCrossing(notes, lowerNote, lowerNote.pitch - 12)) {
        lowerNote.pitch -= 12;
      } else if (canMoveUpWithoutCrossing(notes, higherNote, higherNote.pitch + 12)) {
        higherNote.pitch += 12;
      }
    }
  }
}

function activeNoteAt(notes: readonly NoteEvent[], voice: Voice, tick: number): NoteEvent | undefined {
  return notes.find(
    (note) => note.voice === voice && note.startTick <= tick && tick < note.startTick + note.durationTicks,
  );
}

function canMoveDownWithoutCrossing(notes: readonly NoteEvent[], note: NoteEvent, pitch: number): boolean {
  return pitch >= VOICE_RANGES[note.voice].min && keepsAdjacentVoiceOrder(notes, note, pitch);
}

function canMoveUpWithoutCrossing(notes: readonly NoteEvent[], note: NoteEvent, pitch: number): boolean {
  return pitch <= VOICE_RANGES[note.voice].max && keepsAdjacentVoiceOrder(notes, note, pitch);
}

function keepsAdjacentVoiceOrder(notes: readonly NoteEvent[], note: NoteEvent, pitch: number): boolean {
  const endTick = note.startTick + note.durationTicks;
  const checkpoints = [
    note.startTick,
    ...notes
      .flatMap((candidate) => [candidate.startTick, candidate.startTick + candidate.durationTicks])
      .filter((tick) => note.startTick < tick && tick < endTick),
  ];

  return checkpoints.every((tick) => {
    const soprano = note.voice === "soprano" ? pitch : activeNoteAt(notes, "soprano", tick)?.pitch;
    const alto = note.voice === "alto" ? pitch : activeNoteAt(notes, "alto", tick)?.pitch;
    const tenor = note.voice === "tenor" ? pitch : activeNoteAt(notes, "tenor", tick)?.pitch;
    const bass = note.voice === "bass" ? pitch : activeNoteAt(notes, "bass", tick)?.pitch;

    return (
      (soprano === undefined || alto === undefined || soprano >= alto) &&
      (alto === undefined || tenor === undefined || alto >= tenor) &&
      (tenor === undefined || bass === undefined || tenor >= bass)
    );
  });
}

function isTextureRole(role: NoteEvent["role"] | undefined): boolean {
  return role === "counter-subject" || role === "free-counterpoint";
}

export function addContinuityCounterpoint(notes: Exposition["notes"], input: ContinuityCounterpointInput): void {
  const plan = buildContinuityTexturePlan(notes, input);
  if (plan.voices.length === 0) {
    return;
  }

  for (const voice of plan.voices) {
    addContinuityLine(notes, voice, plan);
  }
}

export function buildContinuityTexturePlan(
  notes: readonly NoteEvent[],
  input: ContinuityCounterpointInput,
): ContinuityTexturePlan {
  if (input.durationTicks <= 0) {
    return { ...input, voices: [] };
  }

  const voice = VOICE_ENTRY_ORDER.find(
    (candidate) => !hasOverlap(notes, candidate, input.startTick, input.durationTicks),
  );

  return {
    ...input,
    voices: voice === undefined ? [] : [voice],
  };
}

function addContinuityLine(notes: Exposition["notes"], voice: Voice, plan: ContinuityCounterpointInput): void {
  const degrees = freeCounterpointDegreesForMode(plan.localKey.mode);
  const fillerSubject = degrees.map((scaleDegree, index) => ({
    offsetTick: index * (TICKS_PER_QUARTER / 2),
    durationTicks: TICKS_PER_QUARTER / 2,
    scaleDegree,
    accidental: 0,
    importantTone: false,
    melodicRole: melodicRoleForScaleDegree(scaleDegree),
  }));
  addPatternCounterpoint(notes, fillerSubject, {
    voice,
    startTick: plan.startTick,
    maxDurationTicks: plan.durationTicks,
    localKey: plan.localKey,
    degrees,
    velocity: 58,
    role: "free-counterpoint",
  });
}

export function fillAllVoiceSilenceGaps(notes: Exposition["notes"], keySignature: KeySignature): void {
  const checkpoints = [...new Set(notes.flatMap((note) => [note.startTick, note.startTick + note.durationTicks]))].sort(
    (left, right) => left - right,
  );
  for (let index = 0; index < checkpoints.length - 1; index += 1) {
    const startTick = checkpoints[index]!;
    const endTick = checkpoints[index + 1]!;
    if (endTick <= startTick) {
      continue;
    }
    const hasActiveNote = notes.some(
      (note) => note.startTick < endTick && startTick < note.startTick + note.durationTicks,
    );
    if (hasActiveNote) {
      continue;
    }
    addTextureNote(
      notes,
      {
        voice: VOICE_ENTRY_ORDER[index % VOICE_ENTRY_ORDER.length]!,
        localKey: keySignature,
        velocity: 54,
        role: "free-counterpoint",
      },
      freeCounterpointDegreesForMode(keySignature.mode)[index % FREE_COUNTERPOINT_DEGREES.length]!,
      startTick,
      endTick - startTick,
    );
  }
}

export function counterSubjectDegreesForMode(mode: KeyMode): readonly number[] {
  return isModalMode(mode) ? MODAL_COUNTER_SUBJECT_DEGREES : COUNTER_SUBJECT_DEGREES;
}

export function freeCounterpointDegreesForMode(mode: KeyMode): readonly number[] {
  return isModalMode(mode) ? MODAL_FREE_COUNTERPOINT_DEGREES : FREE_COUNTERPOINT_DEGREES;
}
