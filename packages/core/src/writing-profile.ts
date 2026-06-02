import { TICKS_PER_QUARTER, VOICE_RANGES, VOICES } from "./constants.js";
import type { NoteEvent, Voice } from "./events.js";
import { positiveModulo, VOICE_PREFERRED_MAX, VOICE_REGISTER_TARGETS } from "./generation/shared.js";

export const DEFAULT_WRITING_PROFILE_ID = "four-voice-default";
export const WRITING_PROFILE_VERSION = 1;

export const WRITING_PROFILE_IDS = [
  DEFAULT_WRITING_PROFILE_ID,
  "piano-two-hand",
  "harpsichord-manual",
  "music-box-n20",
  "music-box-n40",
] as const;

export type WritingProfileId = (typeof WRITING_PROFILE_IDS)[number];

export type PitchRange = {
  min: number;
  max: number;
};

export type WritingProfileMetadata = {
  id: WritingProfileId;
  version: typeof WRITING_PROFILE_VERSION;
};

export type PianoTwoHandPlayability = {
  kind: "piano-two-hand";
  leftHandVoices: readonly Voice[];
  rightHandVoices: readonly Voice[];
  middleRegisterMin: number;
  middleRegisterMax: number;
  maxSameHandSpanSemitones: number;
  reviewLeapSemitones: number;
};

export type HarpsichordPlayability = {
  kind: "harpsichord-manual";
  maxSameHandSpanSemitones: number;
  reviewLeapSemitones: number;
};

export type MusicBoxMechanismPlayability = {
  kind: "music-box";
  maxSimultaneousNotes: number;
  minRepeatTickGap: number;
};

export type WritingProfile = WritingProfileMetadata & {
  absolutePitchSet: readonly number[];
  voiceRanges: Record<Voice, PitchRange>;
  registerTargets: Record<Voice, number>;
  preferredMaxByVoice?: Partial<Record<Voice, number>>;
  playability?: PianoTwoHandPlayability | HarpsichordPlayability | MusicBoxMechanismPlayability;
};

export type WritingProfileConstraintWindow = {
  tick: number;
  voices: Voice[];
  pitches: number[];
  spanSemitones?: number;
  hand?: "left" | "right";
  reason: string;
};

export type WritingProfileDiagnostics = {
  schemaVersion: 1;
  profileId: WritingProfileId;
  writingProfilePitchViolations: number;
  unavailablePitchClassCount: number;
  handSpanViolations: number;
  handAssignmentAmbiguityCount: number;
  sameHandLeapCost: number;
  musicBoxRepeatRateViolations: number;
  musicBoxSimultaneityViolations: number;
  windows: WritingProfileConstraintWindow[];
};

const FOUR_VOICE_ABSOLUTE_PITCH_SET = range(VOICE_RANGES.bass.min, VOICE_RANGES.soprano.max);

const MUSIC_BOX_N20_PITCH_SET = [
  60, 62, 64, 65, 67, 69, 71, 72, 74, 76, 77, 79, 81, 83, 84, 86, 88, 89, 91, 93,
] as const;
const MUSIC_BOX_N40_PITCH_SET = range(48, 87);

const WRITING_PROFILES: Record<WritingProfileId, WritingProfile> = {
  "four-voice-default": {
    id: "four-voice-default",
    version: WRITING_PROFILE_VERSION,
    absolutePitchSet: FOUR_VOICE_ABSOLUTE_PITCH_SET,
    voiceRanges: cloneVoiceRanges(VOICE_RANGES),
    registerTargets: { ...VOICE_REGISTER_TARGETS },
    preferredMaxByVoice: { ...VOICE_PREFERRED_MAX },
  },
  "piano-two-hand": {
    id: "piano-two-hand",
    version: WRITING_PROFILE_VERSION,
    absolutePitchSet: range(21, 108),
    voiceRanges: {
      soprano: { min: 60, max: 96 },
      alto: { min: 48, max: 84 },
      tenor: { min: 36, max: 72 },
      bass: { min: 21, max: 60 },
    },
    registerTargets: {
      soprano: 76,
      alto: 64,
      tenor: 52,
      bass: 40,
    },
    preferredMaxByVoice: {
      soprano: 88,
      alto: 76,
      tenor: 64,
      bass: 52,
    },
    playability: {
      kind: "piano-two-hand",
      leftHandVoices: ["bass", "tenor"],
      rightHandVoices: ["alto", "soprano"],
      middleRegisterMin: 55,
      middleRegisterMax: 67,
      maxSameHandSpanSemitones: 16,
      reviewLeapSemitones: 12,
    },
  },
  "harpsichord-manual": {
    id: "harpsichord-manual",
    version: WRITING_PROFILE_VERSION,
    absolutePitchSet: range(36, 96),
    voiceRanges: {
      soprano: { min: 60, max: 84 },
      alto: { min: 55, max: 76 },
      tenor: { min: 48, max: 67 },
      bass: { min: 36, max: 60 },
    },
    registerTargets: {
      soprano: 74,
      alto: 64,
      tenor: 52,
      bass: 40,
    },
    preferredMaxByVoice: {
      soprano: 84,
      alto: 72,
      tenor: 60,
      bass: 52,
    },
    playability: {
      kind: "harpsichord-manual",
      maxSameHandSpanSemitones: 17,
      reviewLeapSemitones: 14,
    },
  },
  "music-box-n20": {
    id: "music-box-n20",
    version: WRITING_PROFILE_VERSION,
    absolutePitchSet: MUSIC_BOX_N20_PITCH_SET,
    voiceRanges: {
      soprano: { min: 72, max: 93 },
      alto: { min: 67, max: 84 },
      tenor: { min: 60, max: 76 },
      bass: { min: 60, max: 72 },
    },
    registerTargets: {
      soprano: 84,
      alto: 76,
      tenor: 67,
      bass: 60,
    },
    preferredMaxByVoice: {
      soprano: 93,
      alto: 81,
      tenor: 74,
      bass: 67,
    },
    playability: {
      kind: "music-box",
      maxSimultaneousNotes: 4,
      minRepeatTickGap: TICKS_PER_QUARTER / 2,
    },
  },
  "music-box-n40": {
    id: "music-box-n40",
    version: WRITING_PROFILE_VERSION,
    absolutePitchSet: MUSIC_BOX_N40_PITCH_SET,
    voiceRanges: {
      soprano: { min: 67, max: 87 },
      alto: { min: 60, max: 79 },
      tenor: { min: 53, max: 72 },
      bass: { min: 48, max: 64 },
    },
    registerTargets: {
      soprano: 79,
      alto: 72,
      tenor: 60,
      bass: 52,
    },
    preferredMaxByVoice: {
      soprano: 87,
      alto: 76,
      tenor: 67,
      bass: 60,
    },
    playability: {
      kind: "music-box",
      maxSimultaneousNotes: 6,
      minRepeatTickGap: TICKS_PER_QUARTER / 3,
    },
  },
};

export function resolveWritingProfile(writingProfileId: string | undefined): WritingProfile {
  return WRITING_PROFILES[normalizeWritingProfileId(writingProfileId)];
}

export function resolveWritingProfileMetadata(writingProfileId: string | undefined): WritingProfileMetadata {
  const profile = resolveWritingProfile(writingProfileId);

  return {
    id: profile.id,
    version: profile.version,
  };
}

export function normalizeWritingProfileId(writingProfileId: string | undefined): WritingProfileId {
  if (writingProfileId === undefined) {
    return DEFAULT_WRITING_PROFILE_ID;
  }

  if (isWritingProfileId(writingProfileId)) {
    return writingProfileId;
  }

  throw new Error(
    `core.writing-profile.invalid-id: invalid writing profile; why=score reproducibility depends on a known writing-profile contract; action=use one of ${WRITING_PROFILE_IDS.join(", ")}`,
  );
}

export function isWritingProfileId(writingProfileId: string): writingProfileId is WritingProfileId {
  return WRITING_PROFILE_IDS.includes(writingProfileId as WritingProfileId);
}

export function registerTargetForVoice(profile: WritingProfile, voice: Voice): number {
  return profile.registerTargets[voice];
}

export function voiceRangeForProfile(profile: WritingProfile, voice: Voice): PitchRange {
  return profile.voiceRanges[voice];
}

export function isPitchAllowedByWritingProfile(profile: WritingProfile, pitch: number): boolean {
  return profile.absolutePitchSet.includes(pitch);
}

export function placePitchInWritingProfile(
  pitchClass: number,
  voice: Voice,
  registerTarget: number,
  profile: WritingProfile = WRITING_PROFILES[DEFAULT_WRITING_PROFILE_ID],
): number {
  let pitch = positiveModulo(pitchClass, 12);
  while (pitch < registerTarget - 6) {
    pitch += 12;
  }
  while (pitch > registerTarget + 6) {
    pitch -= 12;
  }

  const range = voiceRangeForProfile(profile, voice);
  let fitted = pitch;
  while (fitted < range.min) {
    fitted += 12;
  }
  while (fitted > range.max) {
    fitted -= 12;
  }
  while ((profile.preferredMaxByVoice?.[voice] ?? range.max) < fitted && fitted - 12 >= range.min) {
    fitted -= 12;
  }

  if (isPitchAllowedByWritingProfile(profile, fitted)) {
    return fitted;
  }

  const samePitchClass = profile.absolutePitchSet.filter(
    (candidate) => candidate >= range.min && candidate <= range.max && positiveModulo(candidate, 12) === pitchClass,
  );
  if (samePitchClass.length > 0) {
    return nearestPitch(samePitchClass, registerTarget);
  }

  const inVoiceRange = profile.absolutePitchSet.filter((candidate) => candidate >= range.min && candidate <= range.max);
  if (inVoiceRange.length > 0) {
    return nearestPitch(inVoiceRange, fitted);
  }

  return nearestPitch(profile.absolutePitchSet, fitted);
}

export function nearestWritingProfilePitchForPitchClass(
  pitchClass: number,
  targetPitch: number,
  voice: Voice,
  profile: WritingProfile,
): number {
  const range = voiceRangeForProfile(profile, voice);
  const samePitchClass = profile.absolutePitchSet.filter(
    (pitch) => pitch >= range.min && pitch <= range.max && positiveModulo(pitch, 12) === positiveModulo(pitchClass, 12),
  );
  if (samePitchClass.length > 0) {
    return nearestPitch(samePitchClass, targetPitch);
  }

  const inVoiceRange = profile.absolutePitchSet.filter((pitch) => pitch >= range.min && pitch <= range.max);
  return nearestPitch(inVoiceRange.length > 0 ? inVoiceRange : profile.absolutePitchSet, targetPitch);
}

export function constrainNotePitchToWritingProfile(note: NoteEvent, profile: WritingProfile): number {
  if (
    isPitchAllowedByWritingProfile(profile, note.pitch) &&
    note.pitch >= profile.voiceRanges[note.voice].min &&
    note.pitch <= profile.voiceRanges[note.voice].max
  ) {
    return note.pitch;
  }

  return nearestWritingProfilePitchForPitchClass(positiveModulo(note.pitch, 12), note.pitch, note.voice, profile);
}

export function constrainNotesToWritingProfile(notes: NoteEvent[], profile: WritingProfile): void {
  if (profile.id === DEFAULT_WRITING_PROFILE_ID) {
    return;
  }

  for (const note of notes) {
    note.pitch = constrainNotePitchToWritingProfile(note, profile);
  }
}

export function analyzeWritingProfileConstraints(
  notes: readonly NoteEvent[],
  profile: WritingProfile,
): WritingProfileDiagnostics {
  const allowedPitches = new Set(profile.absolutePitchSet);
  const allowedPitchClasses = new Set(profile.absolutePitchSet.map((pitch) => positiveModulo(pitch, 12)));
  const windows: WritingProfileConstraintWindow[] = [];
  let writingProfilePitchViolations = 0;
  let unavailablePitchClassCount = 0;

  for (const note of notes) {
    const range = profile.voiceRanges[note.voice];
    const pitchAllowed = allowedPitches.has(note.pitch) && note.pitch >= range.min && note.pitch <= range.max;
    if (!pitchAllowed) {
      writingProfilePitchViolations += 1;
      windows.push({
        tick: note.startTick,
        voices: [note.voice],
        pitches: [note.pitch],
        reason: "pitch is outside the active writing profile pitch set or voice range",
      });
    }
    if (!allowedPitchClasses.has(positiveModulo(note.pitch, 12))) {
      unavailablePitchClassCount += 1;
    }
  }

  const musicBox = profile.playability?.kind === "music-box" ? profile.playability : undefined;
  const musicBoxDiagnostics =
    musicBox === undefined
      ? { repeatRateViolations: 0, simultaneityViolations: 0 }
      : analyzeMusicBox(notes, musicBox, windows);
  const keyboardDiagnostics =
    profile.playability?.kind === "piano-two-hand" || profile.playability?.kind === "harpsichord-manual"
      ? analyzeKeyboardPlayability(notes, profile.playability, windows)
      : { handSpanViolations: 0, handAssignmentAmbiguityCount: 0, sameHandLeapCost: 0 };

  return {
    schemaVersion: 1,
    profileId: profile.id,
    writingProfilePitchViolations,
    unavailablePitchClassCount,
    handSpanViolations: keyboardDiagnostics.handSpanViolations,
    handAssignmentAmbiguityCount: keyboardDiagnostics.handAssignmentAmbiguityCount,
    sameHandLeapCost: keyboardDiagnostics.sameHandLeapCost,
    musicBoxRepeatRateViolations: musicBoxDiagnostics.repeatRateViolations,
    musicBoxSimultaneityViolations: musicBoxDiagnostics.simultaneityViolations,
    windows,
  };
}

function analyzeMusicBox(
  notes: readonly NoteEvent[],
  playability: MusicBoxMechanismPlayability,
  windows: WritingProfileConstraintWindow[],
): { repeatRateViolations: number; simultaneityViolations: number } {
  let repeatRateViolations = 0;
  let simultaneityViolations = 0;
  const checkpoints = noteCheckpoints(notes);

  for (const tick of checkpoints) {
    const active = activeNotesAt(notes, tick);
    if (active.length > playability.maxSimultaneousNotes) {
      simultaneityViolations += 1;
      windows.push({
        tick,
        voices: active.map((note) => note.voice),
        pitches: active.map((note) => note.pitch),
        reason: "active notes exceed the music-box mechanism simultaneity limit",
      });
    }
  }

  const byPitch = new Map<number, NoteEvent[]>();
  for (const note of notes) {
    const current = byPitch.get(note.pitch) ?? [];
    current.push(note);
    byPitch.set(note.pitch, current);
  }

  for (const pitchNotes of byPitch.values()) {
    pitchNotes.sort((left, right) => left.startTick - right.startTick || left.voice.localeCompare(right.voice));
    for (let index = 1; index < pitchNotes.length; index += 1) {
      const previous = pitchNotes[index - 1];
      const current = pitchNotes[index];
      if (previous === undefined || current === undefined) {
        continue;
      }
      if (current.startTick - previous.startTick < playability.minRepeatTickGap) {
        repeatRateViolations += 1;
        windows.push({
          tick: current.startTick,
          voices: [previous.voice, current.voice],
          pitches: [current.pitch],
          reason: "same music-box pitch repeats faster than the mechanism limit",
        });
      }
    }
  }

  return { repeatRateViolations, simultaneityViolations };
}

function analyzeKeyboardPlayability(
  notes: readonly NoteEvent[],
  playability: PianoTwoHandPlayability | HarpsichordPlayability,
  windows: WritingProfileConstraintWindow[],
): { handSpanViolations: number; handAssignmentAmbiguityCount: number; sameHandLeapCost: number } {
  let handSpanViolations = 0;
  let handAssignmentAmbiguityCount = 0;
  let sameHandLeapCost = 0;
  let previousCentroids: Partial<Record<"left" | "right", number>> = {};
  const checkpoints = noteCheckpoints(notes);

  for (const tick of checkpoints) {
    const active = activeNotesAt(notes, tick);
    const assigned = {
      left: [] as NoteEvent[],
      right: [] as NoteEvent[],
    };
    for (const note of active) {
      const assignment = assignHand(note, playability);
      assigned[assignment.hand].push(note);
      handAssignmentAmbiguityCount += Number(assignment.ambiguous);
    }

    for (const hand of ["left", "right"] as const) {
      const handNotes = assigned[hand];
      if (handNotes.length === 0) {
        continue;
      }
      const pitches = handNotes.map((note) => note.pitch);
      const span = Math.max(...pitches) - Math.min(...pitches);
      if (span > playability.maxSameHandSpanSemitones) {
        handSpanViolations += 1;
        windows.push({
          tick,
          voices: handNotes.map((note) => note.voice),
          pitches,
          spanSemitones: span,
          hand,
          reason: "same-hand active notes exceed the writing profile hand-span limit",
        });
      }

      const centroid = pitches.reduce((sum, pitch) => sum + pitch, 0) / pitches.length;
      const previousCentroid = previousCentroids[hand];
      if (previousCentroid !== undefined) {
        sameHandLeapCost += Math.max(
          0,
          Math.round(Math.abs(centroid - previousCentroid) - playability.reviewLeapSemitones),
        );
      }
      previousCentroids = { ...previousCentroids, [hand]: centroid };
    }
  }

  return { handSpanViolations, handAssignmentAmbiguityCount, sameHandLeapCost };
}

function assignHand(
  note: NoteEvent,
  playability: PianoTwoHandPlayability | HarpsichordPlayability,
): { hand: "left" | "right"; ambiguous: boolean } {
  if (playability.kind === "harpsichord-manual") {
    return {
      hand: note.pitch < 60 || note.voice === "bass" || note.voice === "tenor" ? "left" : "right",
      ambiguous: false,
    };
  }

  if (playability.leftHandVoices.includes(note.voice) && note.pitch <= playability.middleRegisterMax) {
    return { hand: "left", ambiguous: note.pitch >= playability.middleRegisterMin };
  }
  if (playability.rightHandVoices.includes(note.voice) && note.pitch >= playability.middleRegisterMin) {
    return { hand: "right", ambiguous: note.pitch <= playability.middleRegisterMax };
  }
  return { hand: note.pitch < 60 ? "left" : "right", ambiguous: true };
}

function noteCheckpoints(notes: readonly NoteEvent[]): number[] {
  return [...new Set(notes.flatMap((note) => [note.startTick, note.startTick + note.durationTicks]))].sort(
    (left, right) => left - right,
  );
}

function activeNotesAt(notes: readonly NoteEvent[], tick: number): NoteEvent[] {
  return notes.filter((note) => note.startTick <= tick && tick < note.startTick + note.durationTicks);
}

function nearestPitch(pitches: readonly number[], targetPitch: number): number {
  if (pitches.length === 0) {
    throw new Error(
      "core.writing-profile.empty-pitch-set: writing profile has no pitches; why=score generation cannot place constrained notes; action=define at least one absolute pitch for the writing profile",
    );
  }

  return pitches.reduce((best, pitch) => {
    const bestDistance = Math.abs(best - targetPitch);
    const distance = Math.abs(pitch - targetPitch);
    return distance < bestDistance || (distance === bestDistance && pitch < best) ? pitch : best;
  }, pitches[0]!);
}

function range(min: number, max: number): number[] {
  return Array.from({ length: max - min + 1 }, (_, index) => min + index);
}

function cloneVoiceRanges(ranges: typeof VOICE_RANGES): Record<Voice, PitchRange> {
  return Object.fromEntries(VOICES.map((voice) => [voice, { ...ranges[voice] }])) as Record<Voice, PitchRange>;
}
