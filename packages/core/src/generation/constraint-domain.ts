import type { HarmonicFunction, KeyMode, KeySignature, NoteEvent, Voice } from "../events.js";
import {
  placePitchInWritingProfile,
  registerTargetForVoice,
  voiceRangeForProfile,
  type WritingProfile,
} from "../writing-profile.js";
import { positiveModulo } from "./shared.js";

export type ConstraintDomain = {
  writingProfile: WritingProfile;
  allowedPitchClasses: ReadonlySet<number>;
  voicePitchDomains: Readonly<Record<Voice, readonly number[]>>;
};

const TONIC_PITCH_CLASSES = new Map<KeySignature["tonic"], number>([
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

const MODE_SCALE_INTERVALS: Record<KeyMode, readonly number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  aeolian: [0, 2, 3, 5, 7, 8, 10],
};

const ENTRY_VOICES: readonly Voice[] = ["alto", "soprano", "tenor", "bass"];
const SUBJECT_FEASIBILITY_DEGREES = [0, 1, 2, 3, 4, 3, 2, 1] as const;
const HARMONIC_ANCHOR_FUNCTIONS: readonly HarmonicFunction[] = ["tonic", "predominant", "dominant", "cadential-tonic"];

export function buildConstraintDomain(writingProfile: WritingProfile): ConstraintDomain {
  return {
    writingProfile,
    allowedPitchClasses: profileSupportedPitchClasses(writingProfile),
    voicePitchDomains: {
      soprano: voicePitchDomain(writingProfile, "soprano"),
      alto: voicePitchDomain(writingProfile, "alto"),
      tenor: voicePitchDomain(writingProfile, "tenor"),
      bass: voicePitchDomain(writingProfile, "bass"),
    },
  };
}

export function profileSupportedPitchClasses(writingProfile: WritingProfile): ReadonlySet<number> {
  return new Set(writingProfile.absolutePitchSet.map((pitch) => positiveModulo(pitch, 12)));
}

export function voicePitchDomain(writingProfile: WritingProfile, voice: Voice, pitchClass?: number): readonly number[] {
  const range = voiceRangeForProfile(writingProfile, voice);
  return writingProfile.absolutePitchSet
    .filter(
      (pitch) =>
        pitch >= range.min &&
        pitch <= range.max &&
        (pitchClass === undefined || positiveModulo(pitch, 12) === positiveModulo(pitchClass, 12)),
    )
    .sort((left, right) => left - right);
}

export function isPitchClassSupportedByVoice(domain: ConstraintDomain, voice: Voice, pitchClass: number): boolean {
  return domain.voicePitchDomains[voice].some((pitch) => positiveModulo(pitch, 12) === positiveModulo(pitchClass, 12));
}

export function filterPitchDomainByAdjacentOrder(input: {
  domain: ConstraintDomain;
  voice: Voice;
  candidatePitches: readonly number[];
  activeNotes: readonly Pick<NoteEvent, "voice" | "pitch">[];
}): readonly number[] {
  const higher = adjacentHigherVoice(input.voice);
  const lower = adjacentLowerVoice(input.voice);
  const higherPitch = higher === undefined ? undefined : activePitchForVoice(input.activeNotes, higher);
  const lowerPitch = lower === undefined ? undefined : activePitchForVoice(input.activeNotes, lower);

  return input.candidatePitches.filter(
    (pitch) => (higherPitch === undefined || pitch <= higherPitch) && (lowerPitch === undefined || pitch >= lowerPitch),
  );
}

export function isKeyFeasibleForProfile(keySignature: KeySignature, writingProfile: WritingProfile): boolean {
  return (
    isSubjectDegreePlanFeasibleForProfile(SUBJECT_FEASIBILITY_DEGREES, keySignature, writingProfile) &&
    isHarmonicAnchorFeasibleForProfile(keySignature, writingProfile)
  );
}

export function isHarmonicAnchorFeasibleForProfile(
  keySignature: KeySignature,
  writingProfile: WritingProfile,
): boolean {
  const domain = buildConstraintDomain(writingProfile);

  return HARMONIC_ANCHOR_FUNCTIONS.every((harmonicFunction) => {
    const rootPitchClass = scaleDegreePitchClassInKey(rootDegreeForFunction(harmonicFunction), 0, keySignature);
    const chordTonePitchClasses = chordScaleDegreesForFunction(harmonicFunction).map((degree) =>
      scaleDegreePitchClassInKey(degree, 0, keySignature),
    );

    return (
      isPitchClassSupportedByVoice(domain, "bass", rootPitchClass) &&
      chordTonePitchClasses.every(
        (pitchClass) =>
          domain.allowedPitchClasses.has(positiveModulo(pitchClass, 12)) &&
          ENTRY_VOICES.some((voice) => isPitchClassSupportedByVoice(domain, voice, pitchClass)),
      )
    );
  });
}

export function isSubjectDegreePlanFeasibleForProfile(
  degrees: readonly number[],
  keySignature: KeySignature,
  writingProfile: WritingProfile,
): boolean {
  const domain = buildConstraintDomain(writingProfile);
  const subjectPitchClasses = degrees.map((degree) => scaleDegreePitchClassInKey(degree, 0, keySignature));
  const answerKindIsTonal = degrees.some((degree) => degree === 4);
  const answerDegrees = answerKindIsTonal ? degrees.map((degree) => (degree === 4 ? 3 : degree)) : degrees;
  const answerKey = transposeKeyForDomain(keySignature, 7);
  const answerPitchClasses = answerDegrees.map((degree) => scaleDegreePitchClassInKey(degree, 0, answerKey));

  return ENTRY_VOICES.every((voice, index) => {
    const pitchClasses = index % 2 === 0 ? subjectPitchClasses : answerPitchClasses;
    return pitchClasses.every((pitchClass) => isPitchClassSupportedByVoice(domain, voice, pitchClass));
  });
}

export function isSubjectEntryPlanFeasibleForProfile(
  degrees: readonly number[],
  durations: readonly number[],
  keySignature: KeySignature,
  writingProfile: WritingProfile,
  entrySpacingTicks: number,
): boolean {
  if (!isSubjectDegreePlanFeasibleForProfile(degrees, keySignature, writingProfile)) {
    return false;
  }

  const entryNotes = ENTRY_VOICES.flatMap((voice, entryIndex) => {
    const subjectDegrees = entryIndex % 2 === 0 ? degrees : answerDegreesForDomain(degrees);
    const localKey = entryIndex % 2 === 0 ? keySignature : transposeKeyForDomain(keySignature, 7);
    let offsetTick = 0;
    return subjectDegrees.map((degree, noteIndex) => {
      const durationTicks = durations[noteIndex] ?? 0;
      const pitchClass = scaleDegreePitchClassInKey(degree, 0, localKey);
      const note = {
        voice,
        startTick: entryIndex * entrySpacingTicks + offsetTick,
        durationTicks,
        pitch: placePitchInWritingProfile(
          pitchClass,
          voice,
          registerTargetForVoice(writingProfile, voice),
          writingProfile,
        ),
      };
      offsetTick += durationTicks;
      return note;
    });
  });

  return entryNotes.every((note) => {
    const lowerVoice = adjacentLowerVoice(note.voice);
    if (lowerVoice === undefined) {
      return true;
    }
    return entryNotes
      .filter(
        (other) =>
          other.voice === lowerVoice &&
          note.startTick < other.startTick + other.durationTicks &&
          other.startTick < note.startTick + note.durationTicks,
      )
      .every((other) => note.pitch >= other.pitch);
  });
}

export function scaleDegreePitchClassInKey(
  scaleDegree: number,
  accidental: number,
  keySignature: KeySignature,
): number {
  const intervals = MODE_SCALE_INTERVALS[keySignature.mode];
  const tonic = TONIC_PITCH_CLASSES.get(keySignature.tonic);
  if (tonic === undefined) {
    throw new Error(`unsupported tonic: ${keySignature.tonic}`);
  }

  const octave = Math.floor(scaleDegree / intervals.length);
  const scaleIndex = positiveModulo(scaleDegree, intervals.length);
  return positiveModulo(tonic + intervals[scaleIndex]! + octave * 12 + accidental, 12);
}

function transposeKeyForDomain(keySignature: KeySignature, semitones: number): KeySignature {
  const tonic = TONIC_PITCH_CLASSES.get(keySignature.tonic);
  if (tonic === undefined) {
    throw new Error(`unsupported tonic: ${keySignature.tonic}`);
  }

  const transposedTonic = PITCH_CLASS_TONICS.get(positiveModulo(tonic + semitones, 12));
  if (transposedTonic === undefined) {
    throw new Error(`unsupported transposed key from ${keySignature.tonic}`);
  }

  return {
    tonic: transposedTonic,
    mode: keySignature.mode,
  };
}

function answerDegreesForDomain(degrees: readonly number[]): readonly number[] {
  const answerKindIsTonal = degrees.some((degree) => degree === 4);
  return answerKindIsTonal ? degrees.map((degree) => (degree === 4 ? 3 : degree)) : degrees;
}

function chordScaleDegreesForFunction(harmonicFunction: HarmonicFunction): readonly number[] {
  const rootDegree = rootDegreeForFunction(harmonicFunction);
  return [rootDegree, rootDegree + 2, rootDegree + 4];
}

function rootDegreeForFunction(harmonicFunction: HarmonicFunction): number {
  if (harmonicFunction === "predominant") {
    return 3;
  }
  if (harmonicFunction === "dominant") {
    return 4;
  }
  return 0;
}

function adjacentHigherVoice(voice: Voice): Voice | undefined {
  if (voice === "bass") {
    return "tenor";
  }
  if (voice === "tenor") {
    return "alto";
  }
  if (voice === "alto") {
    return "soprano";
  }
  return undefined;
}

function adjacentLowerVoice(voice: Voice): Voice | undefined {
  if (voice === "soprano") {
    return "alto";
  }
  if (voice === "alto") {
    return "tenor";
  }
  if (voice === "tenor") {
    return "bass";
  }
  return undefined;
}

function activePitchForVoice(
  activeNotes: readonly Pick<NoteEvent, "voice" | "pitch">[],
  voice: Voice,
): number | undefined {
  return activeNotes.find((note) => note.voice === voice)?.pitch;
}
