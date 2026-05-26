import { TICKS_PER_QUARTER, VOICE_RANGES } from "../constants.js";
import type {
  HarmonicPlan,
  KeyMode,
  KeySignature,
  MetricalHarmonyIntent,
  NoteEvent,
  PlannedEntry,
  Voice,
} from "../events.js";
import { isFocusedHarmonicContinuityPlan } from "./harmonic-continuity-review.js";
import {
  beatStrengthAtTick,
  chordScaleDegreesForFunction,
  chordTonePitchClasses,
  metricalHarmonyIntentForDegree,
  nearestHarmonicAnchor,
  rootDegreeForFunction,
} from "./harmony.js";
import { isModalMode } from "./key.js";
import { melodicRoleForScaleDegree, scaleDegreePitchClass } from "./pitch.js";
import {
  COUNTER_SUBJECT_DEGREES,
  compareNoteEvents,
  FREE_COUNTERPOINT_DEGREES,
  hasOverlap,
  MODAL_COUNTER_SUBJECT_DEGREES,
  MODAL_FREE_COUNTERPOINT_DEGREES,
  pitchClassDistance,
  placePitchInRegister,
  positiveModulo,
  VOICE_ENTRY_ORDER,
  VOICE_REGISTER_TARGETS,
} from "./shared.js";
import { collectUnsupportedExposedFreeCounterpointSoloRuns } from "./solo-texture.js";
import type { Exposition, SubjectNote } from "./types.js";

export type ContinuityCounterpointInput = {
  startTick: number;
  durationTicks: number;
  localKey: KeySignature;
  harmonicPlan?: HarmonicPlan;
  maxVoiceCount?: number;
  voiceOrder?: readonly Voice[];
  lineKind?: ContinuityLineKind;
};

export type ContinuityTexturePlan = ContinuityCounterpointInput & {
  voices: Voice[];
};

export type ContinuityLineKind = "linear" | "oblique-support";

type FunctionalSupportRun = {
  startTick: number;
  endTick: number;
};

type EntryCounterpointTextureInput = {
  enteringVoice: Voice;
  startTick: number;
  durationTicks: number;
  localKey: KeySignature;
  eligibleVoices?: readonly Voice[];
  harmonicPlan?: HarmonicPlan;
  counterSubjectSupportRepair?: boolean;
};

type TextureNotePattern = {
  voice: Voice;
  localKey: KeySignature;
  velocity: number;
  role: NoteEvent["role"];
  harmonicPlan?: HarmonicPlan;
  metricalHarmonyIntent?: MetricalHarmonyIntent;
  counterSubjectSupportRepair?: boolean;
  freeCounterpointPhraseVariation?: boolean;
  strictSemitoneAvoidance?: boolean;
  preserveDurations?: boolean;
};

const LONG_REST_PHRASE_CLOSURE_TICKS = TICKS_PER_QUARTER * 2;
const PHRASE_CLOSURE_CADENCE_PROXIMITY_TICKS = TICKS_PER_QUARTER;

export function addCounterpointTexture(
  notes: Exposition["notes"],
  subject: readonly SubjectNote[],
  entry: EntryCounterpointTextureInput,
): void {
  const eligibleVoices = entry.eligibleVoices ?? defaultEntryTextureVoices(entry.enteringVoice);
  const counterSubjectVoice = chooseTextureVoice(
    notes,
    entry.enteringVoice,
    entry.startTick,
    entry.durationTicks,
    eligibleVoices,
  );

  addEntryCounterSubject(notes, subject, entry, counterSubjectVoice);
  addEntryFreeCounterpoint(notes, subject, entry, eligibleVoices, counterSubjectVoice);

  if (entry.eligibleVoices !== undefined) {
    repairTextureVoiceCrossings(notes, entry.startTick, entry.durationTicks);
  }
}

function defaultEntryTextureVoices(enteringVoice: Voice): Voice[] {
  return VOICE_ENTRY_ORDER.filter((voice) => voice !== enteringVoice);
}

function addEntryCounterSubject(
  notes: Exposition["notes"],
  subject: readonly SubjectNote[],
  entry: EntryCounterpointTextureInput,
  counterSubjectVoice: Voice | undefined,
): void {
  if (counterSubjectVoice === undefined) {
    return;
  }

  addPatternCounterpoint(notes, subject, {
    voice: counterSubjectVoice,
    startTick: entry.startTick,
    maxDurationTicks: entry.durationTicks,
    localKey: entry.localKey,
    degrees: entryCounterSubjectDegrees(subject, entry.localKey.mode),
    velocity: 70,
    role: "counter-subject",
    harmonicPlan: entry.harmonicPlan,
  });
}

function addEntryFreeCounterpoint(
  notes: Exposition["notes"],
  subject: readonly SubjectNote[],
  entry: EntryCounterpointTextureInput,
  eligibleVoices: readonly Voice[],
  counterSubjectVoice: Voice | undefined,
): void {
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
      harmonicPlan: entry.harmonicPlan,
      counterSubjectSupportRepair: entry.counterSubjectSupportRepair,
      freeCounterpointPhraseVariation: entry.counterSubjectSupportRepair,
    });
  }
}

export function softenBassEntryBoundaryResets(
  notes: Exposition["notes"],
  entries: readonly PlannedEntry[],
  previousNotes: readonly NoteEvent[],
): void {
  for (const entry of entries) {
    if (!isPostExpositionBassSubjectOrAnswerEntry(entry)) {
      continue;
    }
    softenEntryBoundaryResetAt(notes, entry.voice, entry.startTick, previousNotes);
  }
}

export function softenFirstBassEntryBoundaryReset(notes: Exposition["notes"], entries: readonly PlannedEntry[]): void {
  const entry = entries.find(isFirstExpositionBassAnswerEntry);
  if (entry === undefined) {
    return;
  }

  softenEntryBoundaryResetAt(notes, entry.voice, entry.startTick, notes);
}

export function softenImportantEntryBoundaryResets(
  notes: Exposition["notes"],
  entries: readonly PlannedEntry[],
  previousNotes: readonly NoteEvent[],
): void {
  for (const entry of entries) {
    if (entry.form === "subject-fragment") {
      continue;
    }
    softenEntryBoundaryResetAt(notes, entry.voice, entry.startTick, previousNotes);
  }
}

function isPostExpositionBassSubjectOrAnswerEntry(entry: PlannedEntry): boolean {
  return entry.voice === "bass" && entry.state !== "exposition" && entry.form !== "subject-fragment";
}

function isFirstExpositionBassAnswerEntry(entry: PlannedEntry): boolean {
  return entry.voice === "bass" && entry.state === "exposition" && entry.form === "answer";
}

function softenEntryBoundaryResetAt(
  notes: Exposition["notes"],
  entryVoice: Voice,
  entryStartTick: number,
  previousNotes: readonly NoteEvent[],
): void {
  const outsideStartingNotes = outsideVoiceOnsetsAtEntry(notes, entryVoice, entryStartTick);
  if (!hasThreeOutsideVoiceOnsets(outsideStartingNotes)) {
    return;
  }

  for (const note of chooseBoundaryResetNotesToDelay(outsideStartingNotes, previousNotes, entryStartTick)) {
    const delayTicks = boundaryResetDelayTicks(note);
    if (delayTicks <= 0) {
      continue;
    }

    const carriedNote = latestNoteEndingAtBoundary(notes, note.voice, entryStartTick);
    if (carriedNote !== undefined) {
      carriedNote.durationTicks += delayTicks;
    }
    note.startTick += delayTicks;
    note.durationTicks -= delayTicks;
  }
}

function outsideVoiceOnsetsAtEntry(
  notes: readonly NoteEvent[],
  entryVoice: Voice,
  entryStartTick: number,
): NoteEvent[] {
  return notes.filter((note) => note.voice !== entryVoice && note.startTick === entryStartTick);
}

function hasThreeOutsideVoiceOnsets(notes: readonly NoteEvent[]): boolean {
  return new Set(notes.map((note) => note.voice)).size >= 3;
}

function boundaryResetDelayTicks(note: NoteEvent): number {
  return Math.min(TICKS_PER_QUARTER / 2, Math.floor(note.durationTicks / 2));
}

function latestNoteEndingAtBoundary(
  notes: readonly NoteEvent[],
  voice: Voice,
  entryStartTick: number,
): NoteEvent | undefined {
  return notes
    .filter(
      (candidate) =>
        candidate.voice === voice &&
        candidate.startTick < entryStartTick &&
        candidate.startTick + candidate.durationTicks === entryStartTick,
    )
    .sort(compareNoteEvents)
    .at(-1);
}

function chooseBoundaryResetNotesToDelay(
  notes: readonly NoteEvent[],
  previousNotes: readonly NoteEvent[],
  entryStartTick: number,
): NoteEvent[] {
  return boundaryResetDelayCandidates(notes, previousNotes, entryStartTick).slice(0, 2);
}

function boundaryResetDelayCandidates(
  notes: readonly NoteEvent[],
  previousNotes: readonly NoteEvent[],
  entryStartTick: number,
): NoteEvent[] {
  return [...notes].sort((left, right) => {
    const rolePriority = boundaryResetRolePriority(left.role) - boundaryResetRolePriority(right.role);
    if (rolePriority !== 0) {
      return rolePriority;
    }

    return (
      latestPreviousVoiceDistance(previousNotes, left.voice, entryStartTick) -
      latestPreviousVoiceDistance(previousNotes, right.voice, entryStartTick)
    );
  });
}

function boundaryResetRolePriority(role: NoteEvent["role"] | undefined): number {
  if (role === "free-counterpoint") {
    return 0;
  }
  if (role === "counter-subject") {
    return 1;
  }
  if (role === undefined) {
    return 2;
  }
  return 3;
}

function latestPreviousVoiceDistance(
  previousNotes: readonly NoteEvent[],
  voice: Voice,
  entryStartTick: number,
): number {
  const previous = previousNotes
    .filter((note) => note.voice === voice && note.startTick < entryStartTick)
    .sort(compareNoteEvents)
    .at(-1);
  if (previous === undefined) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.abs(entryStartTick - (previous.startTick + previous.durationTicks));
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
    harmonicPlan?: HarmonicPlan;
    counterSubjectSupportRepair?: boolean;
    freeCounterpointPhraseVariation?: boolean;
    strictSemitoneAvoidance?: boolean;
    preserveDurations?: boolean;
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
    if (
      pattern.role === "free-counterpoint" &&
      pattern.preserveDurations !== true &&
      durationTicks >= TICKS_PER_QUARTER
    ) {
      addFreeCounterpointPatternNote(notes, pattern, index, degree, startTick, durationTicks);
    } else {
      addTextureNote(notes, pattern, degree, startTick, durationTicks);
    }
    elapsedTicks += subjectNote.durationTicks;
  }
}

function addFreeCounterpointPatternNote(
  notes: Exposition["notes"],
  pattern: Parameters<typeof addPatternCounterpoint>[2],
  index: number,
  degree: number,
  startTick: number,
  durationTicks: number,
): void {
  const variant = freeCounterpointPhraseVariant(pattern, index);
  if (variant === 1 || variant === 3) {
    addTextureNote(notes, pattern, degree, startTick, durationTicks);
    return;
  }

  const firstDurationTicks = Math.floor(durationTicks / 2);
  addTextureNote(notes, pattern, degree, startTick, firstDurationTicks);
  addTextureNote(
    notes,
    pattern,
    pattern.degrees[(index + 1) % pattern.degrees.length]!,
    startTick + firstDurationTicks,
    durationTicks - firstDurationTicks,
  );
}

function freeCounterpointPhraseVariant(pattern: Parameters<typeof addPatternCounterpoint>[2], index: number): number {
  if (pattern.freeCounterpointPhraseVariation !== true) {
    return 0;
  }

  const voiceOffset = VOICE_ENTRY_ORDER.indexOf(pattern.voice);
  const stateOffset =
    pattern.harmonicPlan?.state === "stretto-like" ? 3 : pattern.harmonicPlan?.state === "subject-return" ? 2 : 1;
  return positiveModulo(Math.floor(pattern.startTick / TICKS_PER_QUARTER) + index + voiceOffset + stateOffset, 4);
}

export function addTextureNote(
  notes: Exposition["notes"],
  pattern: TextureNotePattern,
  degree: number,
  startTick: number,
  durationTicks: number,
): void {
  const previous = previousTextureNote(notes, pattern.voice, startTick);
  let pitchClass = scaleDegreePitchClass(degree, 0, pattern.localKey);
  let pitch = placePitchInRegister(pitchClass, pattern.voice, VOICE_REGISTER_TARGETS[pattern.voice]);
  if (previous?.pitch === pitch && pattern.role === "free-counterpoint") {
    pitchClass = scaleDegreePitchClass(degree + 1, 0, pattern.localKey);
    pitch = placePitchInRegister(pitchClass, pattern.voice, VOICE_REGISTER_TARGETS[pattern.voice]);
  }
  if (previous !== undefined && (pattern.role === "free-counterpoint" || pattern.role === "counter-subject")) {
    pitch = fitPitchNearPrevious(pitchClass, pattern.voice, previous.pitch);
  }
  pitch = weakDissonanceSafePitch(notes, pattern, startTick, durationTicks, pitch);
  pitch = counterSubjectSafePitch(notes, pattern, startTick, durationTicks, pitch);
  notes.push({
    kind: "note",
    voice: pattern.voice,
    startTick,
    durationTicks,
    pitch,
    velocity: pattern.velocity,
    role: pattern.role,
    metricalHarmonyIntent:
      pattern.metricalHarmonyIntent ??
      metricalHarmonyIntentForDegree({
        degree,
        tick: startTick,
        voice: pattern.voice,
        harmonicPlan: pattern.harmonicPlan,
      }),
  });
}

function weakDissonanceSafePitch(
  notes: readonly NoteEvent[],
  pattern: TextureNotePattern,
  startTick: number,
  durationTicks: number,
  pitch: number,
): number {
  if (
    pattern.role !== "free-counterpoint" ||
    pattern.harmonicPlan === undefined ||
    (pattern.strictSemitoneAvoidance !== true && startTick < pattern.harmonicPlan.startTick + TICKS_PER_QUARTER * 6) ||
    (pattern.strictSemitoneAvoidance !== true && startTick % (TICKS_PER_QUARTER * 2) === 0) ||
    !createsSemitoneAtTick(notes, pattern.voice, startTick, pitch)
  ) {
    return pitch;
  }

  const anchor = nearestHarmonicAnchor(startTick, [pattern.harmonicPlan]);
  if (anchor === undefined) {
    return pitch;
  }

  const chordTonePitchClassesAtTick = chordTonePitchClasses(anchor.localKey, anchor.function);
  const noteShape = textureNoteShape(pattern, startTick, durationTicks, pitch);
  const candidates = nearbyChordTonePitches({
    pitch,
    voice: pattern.voice,
    steps: [-4, -3, -2, -1, 1, 2, 3, 4],
    chordTonePitchClasses: chordTonePitchClassesAtTick,
  })
    .filter((candidatePitch) => keepsAdjacentVoiceOrder(notes, noteShape, candidatePitch))
    .filter((candidatePitch) => !createsSemitoneAtTick(notes, pattern.voice, startTick, candidatePitch))
    .filter((candidatePitch) => !createsPitchClassUnisonAtTick(notes, pattern.voice, startTick, candidatePitch));

  return nearestPitch(candidates, pitch) ?? pitch;
}

function counterSubjectSafePitch(
  notes: readonly NoteEvent[],
  pattern: TextureNotePattern,
  startTick: number,
  durationTicks: number,
  pitch: number,
): number {
  if (
    pattern.role !== "free-counterpoint" ||
    pattern.counterSubjectSupportRepair !== true ||
    pattern.harmonicPlan === undefined ||
    !createsCounterSubjectSupportCollision(notes, pattern.voice, startTick, durationTicks, pitch)
  ) {
    return pitch;
  }

  const anchor = nearestHarmonicAnchor(startTick, [pattern.harmonicPlan]);
  if (anchor === undefined) {
    return pitch;
  }
  const chordTonePitchClassesAtTick = chordTonePitchClasses(anchor.localKey, anchor.function);
  const previous = previousTextureNote(notes, pattern.voice, startTick);
  const noteShape = textureNoteShape(pattern, startTick, durationTicks, pitch);
  const candidates = nearbyChordTonePitches({
    pitch,
    voice: pattern.voice,
    steps: [-5, -4, -3, -2, -1, 1, 2, 3, 4, 5],
    chordTonePitchClasses: chordTonePitchClassesAtTick,
  })
    .filter((candidatePitch) => previous === undefined || Math.abs(candidatePitch - previous.pitch) <= 4)
    .filter((candidatePitch) => keepsAdjacentVoiceOrder(notes, noteShape, candidatePitch))
    .filter(
      (candidatePitch) =>
        !createsCounterSubjectSupportCollision(notes, pattern.voice, startTick, durationTicks, candidatePitch),
    )
    .filter((candidatePitch) => !createsSemitoneAtTick(notes, pattern.voice, startTick, candidatePitch))
    .filter((candidatePitch) => !createsPitchClassUnisonAtTick(notes, pattern.voice, startTick, candidatePitch));

  return nearestPitch(candidates, pitch) ?? pitch;
}

function previousTextureNote(notes: readonly NoteEvent[], voice: Voice, startTick: number): NoteEvent | undefined {
  return notes
    .filter((note) => note.voice === voice && note.startTick <= startTick)
    .sort(compareNoteEvents)
    .at(-1);
}

function textureNoteShape(
  pattern: TextureNotePattern,
  startTick: number,
  durationTicks: number,
  pitch: number,
): NoteEvent {
  return {
    kind: "note",
    voice: pattern.voice,
    startTick,
    durationTicks,
    pitch,
    velocity: pattern.velocity,
    role: pattern.role,
  };
}

function nearbyChordTonePitches(input: {
  pitch: number;
  voice: Voice;
  steps: readonly number[];
  chordTonePitchClasses: readonly number[];
}): number[] {
  const range = VOICE_RANGES[input.voice];
  return input.steps
    .map((step) => input.pitch + step)
    .filter((candidatePitch) => input.chordTonePitchClasses.includes(positiveModulo(candidatePitch, 12)))
    .filter((candidatePitch) => candidatePitch >= range.min)
    .filter((candidatePitch) => candidatePitch <= range.max);
}

function nearestPitch(candidates: readonly number[], targetPitch: number): number | undefined {
  return [...candidates].sort((left, right) => Math.abs(left - targetPitch) - Math.abs(right - targetPitch))[0];
}

function createsCounterSubjectSupportCollision(
  notes: readonly NoteEvent[],
  voice: Voice,
  startTick: number,
  durationTicks: number,
  pitch: number,
): boolean {
  return notes.some(
    (note) =>
      note.role === "counter-subject" &&
      note.voice !== voice &&
      note.startTick < startTick + durationTicks &&
      startTick < note.startTick + note.durationTicks &&
      pitchClassDistance(pitch, note.pitch) <= 2,
  );
}

function createsSemitoneAtTick(notes: readonly NoteEvent[], voice: Voice, tick: number, pitch: number): boolean {
  return VOICE_ENTRY_ORDER.some((otherVoice) => {
    if (otherVoice === voice) {
      return false;
    }
    const other = activeNoteAt(notes, otherVoice, tick);
    return other !== undefined && isSemitoneInterval(pitch, other.pitch);
  });
}

function isSemitoneInterval(leftPitch: number, rightPitch: number): boolean {
  const interval = positiveModulo(leftPitch - rightPitch, 12);
  return interval === 1 || interval === 11;
}

function createsPitchClassUnisonAtTick(
  notes: readonly NoteEvent[],
  voice: Voice,
  tick: number,
  pitch: number,
): boolean {
  return VOICE_ENTRY_ORDER.some((otherVoice) => {
    if (otherVoice === voice) {
      return false;
    }
    const other = activeNoteAt(notes, otherVoice, tick);
    return other !== undefined && positiveModulo(pitch - other.pitch, 12) === 0;
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

  for (const [index, voice] of plan.voices.entries()) {
    addContinuityLine(notes, voice, plan, index);
  }
}

export function buildContinuityTexturePlan(
  notes: readonly NoteEvent[],
  input: ContinuityCounterpointInput,
): ContinuityTexturePlan {
  if (input.durationTicks <= 0) {
    return { ...input, voices: [] };
  }

  const maxVoiceCount = input.maxVoiceCount ?? 1;
  const voiceOrder = input.voiceOrder === undefined ? VOICE_ENTRY_ORDER : uniqueVoiceOrder(input.voiceOrder);
  const voices = voiceOrder
    .filter((candidate) => VOICE_ENTRY_ORDER.includes(candidate))
    .filter((candidate) => !hasOverlap(notes, candidate, input.startTick, input.durationTicks))
    .slice(0, maxVoiceCount);

  return {
    ...input,
    voices,
  };
}

function uniqueVoiceOrder(voices: readonly Voice[]): Voice[] {
  return voices.filter((voice, index) => voices.indexOf(voice) === index);
}

function addContinuityLine(
  notes: Exposition["notes"],
  voice: Voice,
  plan: ContinuityCounterpointInput,
  lineIndex: number,
): void {
  if ((plan.lineKind ?? "linear") === "oblique-support") {
    addObliqueContinuitySupport(notes, voice, plan, lineIndex);
    return;
  }

  if (lineIndex > 0) {
    addStaggeredContinuitySupport(notes, voice, plan);
    return;
  }

  const degrees = rotateContinuityDegrees(freeCounterpointDegreesForMode(plan.localKey.mode), lineIndex * 2);
  const startTick = plan.startTick + (lineIndex === 0 ? 0 : TICKS_PER_QUARTER / 2);
  const maxDurationTicks = Math.max(0, plan.durationTicks - (startTick - plan.startTick));
  if (maxDurationTicks <= 0) {
    return;
  }
  const fillerSubject = continuityFillerSubject(degrees, plan);
  addPatternCounterpoint(notes, fillerSubject, {
    voice,
    startTick,
    maxDurationTicks,
    localKey: plan.localKey,
    degrees,
    velocity: lineIndex === 0 ? 58 : 52,
    role: "free-counterpoint",
    harmonicPlan: plan.harmonicPlan,
    preserveDurations: plan.harmonicPlan?.meterContext.timeSignature.numerator === 3,
  });
}

function continuityFillerSubject(
  degrees: readonly number[],
  plan: ContinuityCounterpointInput,
): readonly SubjectNote[] {
  const durations =
    plan.harmonicPlan?.meterContext.timeSignature.numerator === 3
      ? [
          TICKS_PER_QUARTER,
          TICKS_PER_QUARTER / 2,
          TICKS_PER_QUARTER / 2,
          TICKS_PER_QUARTER,
          TICKS_PER_QUARTER,
          TICKS_PER_QUARTER / 2,
          TICKS_PER_QUARTER / 2,
          TICKS_PER_QUARTER,
        ]
      : degrees.map(() => TICKS_PER_QUARTER / 2);
  let offsetTick = 0;

  return degrees.map((scaleDegree, index) => {
    const durationTicks = durations[index % durations.length]!;
    const subjectNote = {
      offsetTick,
      durationTicks,
      scaleDegree,
      accidental: 0,
      importantTone: false,
      melodicRole: melodicRoleForScaleDegree(scaleDegree),
      metricalHarmonyIntent: "weak-passing-tone" as const,
    };
    offsetTick += durationTicks;
    return subjectNote;
  });
}

function addObliqueContinuitySupport(
  notes: Exposition["notes"],
  voice: Voice,
  plan: ContinuityCounterpointInput,
  lineIndex: number,
): void {
  const startTick = plan.startTick + (lineIndex === 0 ? 0 : TICKS_PER_QUARTER / 2);
  const maxDurationTicks = Math.max(0, plan.durationTicks - (startTick - plan.startTick));
  if (maxDurationTicks <= 0) {
    return;
  }

  const degrees = obliqueSupportDegrees(voice, plan.localKey.mode, lineIndex);
  const durations = [TICKS_PER_QUARTER, TICKS_PER_QUARTER * 2, TICKS_PER_QUARTER, TICKS_PER_QUARTER * 2];
  let elapsedTicks = 0;
  let index = 0;

  while (elapsedTicks < maxDurationTicks) {
    const durationTicks = Math.min(durations[index % durations.length]!, maxDurationTicks - elapsedTicks);
    const degree = degrees[index % degrees.length]!;
    addTextureNote(
      notes,
      {
        voice,
        localKey: plan.localKey,
        velocity: lineIndex === 0 ? 54 : 50,
        role: "free-counterpoint",
        harmonicPlan: plan.harmonicPlan,
        metricalHarmonyIntent: voice === "bass" ? "structural-root-support" : "structural-chord-tone",
      },
      degree,
      startTick + elapsedTicks,
      durationTicks,
    );
    elapsedTicks += durationTicks;
    index += 1;
  }
}

function obliqueSupportDegrees(voice: Voice, mode: KeyMode, lineIndex: number): readonly number[] {
  if (isModalMode(mode)) {
    if (voice === "bass") {
      return lineIndex === 0 ? [0, 4, 3, 4] : [2, 4, 1, 3];
    }
    return lineIndex === 0 ? [2, 4, 1, 3] : [4, 2, 5, 3];
  }

  if (voice === "bass") {
    return lineIndex === 0 ? [0, 4, 3, 4] : [2, 4, 1, 4];
  }
  if (voice === "tenor") {
    return lineIndex === 0 ? [2, 4, 5, 4] : [4, 2, 3, 2];
  }
  if (voice === "alto") {
    return lineIndex === 0 ? [4, 2, 5, 3] : [2, 4, 1, 3];
  }
  return lineIndex === 0 ? [5, 4, 2, 4] : [4, 2, 3, 2];
}

function rotateContinuityDegrees(degrees: readonly number[], offset: number): readonly number[] {
  return degrees.map((_, index) => degrees[(index + offset) % degrees.length]!);
}

function addStaggeredContinuitySupport(
  notes: Exposition["notes"],
  voice: Voice,
  plan: ContinuityCounterpointInput,
): void {
  const startTick = plan.startTick + TICKS_PER_QUARTER / 2;
  const maxDurationTicks = Math.max(0, plan.durationTicks - TICKS_PER_QUARTER / 2);
  if (maxDurationTicks <= 0) {
    return;
  }

  const degrees = isModalMode(plan.localKey.mode) ? [0, 1, 2, 1] : [0, 2, 1, 2];
  const supportNoteTicks = TICKS_PER_QUARTER * 2;
  let elapsedTicks = 0;
  let index = 0;

  while (elapsedTicks < maxDurationTicks) {
    const durationTicks = Math.min(supportNoteTicks, maxDurationTicks - elapsedTicks);
    addTextureNote(
      notes,
      {
        voice,
        localKey: plan.localKey,
        velocity: 50,
        role: "free-counterpoint",
        harmonicPlan: plan.harmonicPlan,
      },
      degrees[index % degrees.length]!,
      startTick + elapsedTicks,
      durationTicks,
    );
    elapsedTicks += durationTicks;
    index += 1;
  }
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
    addGapFillerLine(notes, {
      voice: VOICE_ENTRY_ORDER[index % VOICE_ENTRY_ORDER.length]!,
      localKey: keySignature,
      startTick,
      durationTicks: endTick - startTick,
      degreeOffset: index,
    });
  }
}

function addGapFillerLine(
  notes: Exposition["notes"],
  input: {
    voice: Voice;
    localKey: KeySignature;
    startTick: number;
    durationTicks: number;
    degreeOffset: number;
  },
): void {
  const degrees = rotateContinuityDegrees(freeCounterpointDegreesForMode(input.localKey.mode), input.degreeOffset);
  let elapsedTicks = 0;
  let index = 0;

  while (elapsedTicks < input.durationTicks) {
    const durationTicks = Math.min(TICKS_PER_QUARTER, input.durationTicks - elapsedTicks);
    addTextureNote(
      notes,
      {
        voice: input.voice,
        localKey: input.localKey,
        velocity: 54,
        role: "free-counterpoint",
      },
      degrees[index % degrees.length]!,
      input.startTick + elapsedTicks,
      durationTicks,
    );
    elapsedTicks += durationTicks;
    index += 1;
  }
}

export function addFunctionalThinningSupport(notes: Exposition["notes"], sectionPlans: readonly HarmonicPlan[]): void {
  for (const run of findUnsupportedThinningRuns(notes, sectionPlans)) {
    const plan = sectionPlanForTick(sectionPlans, run.startTick);
    const supportVoice = functionalSupportVoice(notes, run);
    if (plan === undefined || supportVoice === undefined) {
      continue;
    }

    addFunctionalSupportForRun(notes, { run, plan, supportVoice });
  }

  repairTextureVoiceCrossingsForPlans(notes, sectionPlans);
}

export function addBassAnswerTailTextureSupport(
  notes: Exposition["notes"],
  subjectEntries: readonly PlannedEntry[],
  sectionPlans: readonly HarmonicPlan[],
): void {
  const firstBassAnswer = subjectEntries.find(
    (entry) => entry.voice === "bass" && entry.state === "exposition" && entry.form === "answer",
  );
  for (const run of findBassAnswerTailSupportRuns(notes, subjectEntries)) {
    const plan =
      sectionPlanForTick(sectionPlans, run.startTick) ??
      firstBassAnswerInternalTailPlan(notes, sectionPlans, firstBassAnswer, run.startTick);
    const supportVoices = tailSupportVoices(notes, run);
    if (plan === undefined || supportVoices.length === 0) {
      continue;
    }

    for (const [index, supportVoice] of supportVoices.entries()) {
      const supportRun = bassAnswerTailSupportRunForVoice(run, index, supportVoices.length);
      if (supportRun.endTick <= supportRun.startTick) {
        continue;
      }
      addFunctionalSupportForRun(notes, {
        run: supportRun,
        plan,
        supportVoice,
        maxNoteTicks: TICKS_PER_QUARTER * 3,
        meterAnchored: true,
        strictSemitoneAvoidance: true,
      });
    }
  }

  repairTextureVoiceCrossingsForNotes(notes, sectionPlans);
}

function bassAnswerTailSupportRunForVoice(
  run: { startTick: number; endTick: number },
  supportVoiceIndex: number,
  supportVoiceCount: number,
): { startTick: number; endTick: number } {
  if (supportVoiceIndex === 0 || supportVoiceCount === 1) {
    return run;
  }

  return {
    startTick: Math.min(run.endTick, run.startTick + TICKS_PER_QUARTER / 2),
    endTick: Math.max(run.startTick, run.endTick - TICKS_PER_QUARTER / 2),
  };
}

function firstBassAnswerInternalTailPlan(
  notes: readonly NoteEvent[],
  sectionPlans: readonly HarmonicPlan[],
  firstBassAnswer: PlannedEntry | undefined,
  tick: number,
): HarmonicPlan | undefined {
  if (firstBassAnswer === undefined || tick >= firstBassAnswerEnd(notes, firstBassAnswer)) {
    return undefined;
  }

  return sectionPlans.find((plan) => plan.state === "exposition");
}

export function addPostEntryContinuationSupport(
  notes: Exposition["notes"],
  subjectEntries: readonly PlannedEntry[],
  sectionPlans: readonly HarmonicPlan[],
): void {
  for (const run of findPostEntryThinSupportRuns(notes, subjectEntries)) {
    const plan = sectionPlanForTick(sectionPlans, run.startTick);
    const supportVoice = postEntrySupportVoice(notes, run);
    if (plan === undefined || supportVoice === undefined) {
      continue;
    }

    addFunctionalSupportForRun(notes, { run, plan, supportVoice });
  }

  repairTextureVoiceCrossingsForPlans(notes, sectionPlans);
}

export function addExposedFreeCounterpointSoloSupport(
  notes: Exposition["notes"],
  sectionPlans: readonly HarmonicPlan[],
): void {
  for (const run of collectUnsupportedExposedFreeCounterpointSoloRuns(notes, sectionPlans)) {
    const plan = sectionPlanForTick(sectionPlans, run.startTick);
    const supportVoice = exposedSoloSupportVoice(notes, run);
    if (plan === undefined || supportVoice === undefined) {
      continue;
    }

    addFunctionalSupportForRun(notes, {
      run,
      plan,
      supportVoice,
      strictSemitoneAvoidance: true,
    });
  }

  repairTextureVoiceCrossingsForPlans(notes, sectionPlans);
}

export function addShortEpisodeHarmonicContinuitySupport(
  notes: Exposition["notes"],
  sectionPlans: readonly HarmonicPlan[],
): void {
  const scoreEndTick = Math.max(...notes.map((note) => note.startTick + note.durationTicks));
  const sortedPlans = [...sectionPlans].sort((left, right) => left.startTick - right.startTick);
  for (const plan of sortedPlans.filter((candidate) =>
    shouldRepairShortEpisodeHarmonicContinuity(candidate, sortedPlans),
  )) {
    for (const tick of harmonicContinuitySupportTicks(plan).filter((supportTick) => supportTick < scoreEndTick)) {
      supportHarmonicContinuityAtTick(notes, plan, tick);
    }
    for (const tick of harmonicContinuityRepairTicks(notes, plan).filter((supportTick) => supportTick < scoreEndTick)) {
      const anchor = nearestHarmonicAnchor(tick, [plan]);
      if (anchor !== undefined) {
        repairStructuralSupportAtTick(notes, tick, anchor);
      }
    }
  }

  repairTextureVoiceCrossingsForPlans(notes, sectionPlans);
  for (const plan of sortedPlans.filter((candidate) =>
    shouldRepairShortEpisodeHarmonicContinuity(candidate, sortedPlans),
  )) {
    for (const tick of harmonicContinuitySupportTicks(plan).filter((supportTick) => supportTick < scoreEndTick)) {
      const anchor = nearestHarmonicAnchor(tick, [plan]);
      if (anchor !== undefined) {
        supportBassRootAtTick(notes, plan, tick, anchor);
      }
    }
    for (const tick of harmonicContinuityRepairTicks(notes, plan).filter((supportTick) => supportTick < scoreEndTick)) {
      const anchor = nearestHarmonicAnchor(tick, [plan]);
      if (anchor !== undefined) {
        repairStructuralSupportAtTick(notes, tick, anchor);
      }
    }
  }
  repairFocusedBassRootSupport(notes, sortedPlans);
}

function shouldRepairShortEpisodeHarmonicContinuity(
  plan: HarmonicPlan,
  sectionPlans: readonly HarmonicPlan[],
): plan is HarmonicPlan & { state: "episode" } {
  const nextPlan = sectionPlans.find((candidate) => candidate.startTick >= plan.startTick + plan.durationTicks);
  return (
    isFocusedHarmonicContinuityPlan(plan) &&
    plan.ambiguityIntent === "pivot-harmony" &&
    plan.startTick <= TICKS_PER_QUARTER * 24 &&
    nextPlan !== undefined &&
    nextPlan.state === "stretto-like"
  );
}

export function shapeLongRestPhraseClosures(notes: Exposition["notes"], sectionPlans: readonly HarmonicPlan[]): void {
  const scoreEndTick = Math.max(...notes.map((note) => note.startTick + note.durationTicks));

  for (const voice of VOICE_ENTRY_ORDER) {
    const voiceNotes = notes
      .filter((note) => note.voice === voice)
      .sort((left, right) => left.startTick - right.startTick || left.durationTicks - right.durationTicks);

    for (const [index, note] of voiceNotes.entries()) {
      if (note.role !== "free-counterpoint") {
        continue;
      }

      const restStartTick = note.startTick + note.durationTicks;
      const nextStartTick = voiceNotes[index + 1]?.startTick ?? scoreEndTick;
      const restTicks = nextStartTick - restStartTick;
      if (restTicks < LONG_REST_PHRASE_CLOSURE_TICKS) {
        continue;
      }

      const plan = sectionPlanForTick(sectionPlans, Math.max(0, restStartTick - 1));
      const anchor = phraseClosureAnchor(plan, restStartTick);
      if (anchor === undefined) {
        continue;
      }

      const closingPitch = nearestRestClosingPitch(notes, note, anchor);
      if (closingPitch === undefined) {
        continue;
      }

      note.pitch = closingPitch;
      note.metricalHarmonyIntent =
        note.voice === "bass" &&
        positiveModulo(closingPitch, 12) === chordTonePitchClasses(anchor.localKey, anchor.function)[0]
          ? "structural-root-support"
          : "structural-chord-tone";
    }
  }

  const startTick = Math.min(...sectionPlans.map((plan) => plan.startTick));
  const endTick = Math.max(...sectionPlans.map((plan) => plan.startTick + plan.durationTicks));
  repairTextureVoiceCrossings(notes, startTick, endTick - startTick);
}

function phraseClosureAnchor(
  plan: HarmonicPlan | undefined,
  restStartTick: number,
): ReturnType<typeof nearestHarmonicAnchor> {
  if (plan === undefined) {
    return undefined;
  }

  const cadenceAnchor = plan.anchors
    .filter((anchor) => anchor.cadenceTarget)
    .map((anchor) => ({ anchor, distance: Math.abs(anchor.tick - restStartTick) }))
    .filter((candidate) => candidate.distance <= PHRASE_CLOSURE_CADENCE_PROXIMITY_TICKS)
    .sort((left, right) => left.distance - right.distance)[0]?.anchor;
  if (cadenceAnchor !== undefined) {
    return cadenceAnchor;
  }

  const distanceFromSectionEnd = plan.startTick + plan.durationTicks - restStartTick;
  if (0 <= distanceFromSectionEnd && distanceFromSectionEnd <= PHRASE_CLOSURE_CADENCE_PROXIMITY_TICKS) {
    return nearestHarmonicAnchor(Math.max(plan.startTick, restStartTick - 1), [plan]);
  }

  return undefined;
}

function nearestRestClosingPitch(
  notes: readonly NoteEvent[],
  note: NoteEvent,
  anchor: NonNullable<ReturnType<typeof nearestHarmonicAnchor>>,
): number | undefined {
  const pitchClasses = chordTonePitchClasses(anchor.localKey, anchor.function);
  const range = VOICE_RANGES[note.voice];
  const candidates = Array.from({ length: range.max - range.min + 1 }, (_, index) => range.min + index)
    .filter((pitch) => pitchClasses.includes(positiveModulo(pitch, 12)))
    .filter((pitch) => keepsAdjacentVoiceOrder(notes, note, pitch));

  const noSemitoneCandidates = candidates.filter(
    (pitch) => !createsSemitoneAtTick(notes, note.voice, note.startTick, pitch),
  );
  const noUnisonCandidates = noSemitoneCandidates.filter(
    (pitch) => !createsPitchClassUnisonAtTick(notes, note.voice, note.startTick, pitch),
  );

  const nearestNonSemitonePitch = nearestPitch(noSemitoneCandidates, note.pitch);
  const nearestNonUnisonPitch = nearestPitch(noUnisonCandidates, note.pitch);
  if (
    nearestNonSemitonePitch !== undefined &&
    nearestNonUnisonPitch !== undefined &&
    Math.abs(nearestNonUnisonPitch - note.pitch) <= Math.abs(nearestNonSemitonePitch - note.pitch)
  ) {
    return nearestNonUnisonPitch;
  }

  return nearestNonSemitonePitch;
}

function addFunctionalSupportLine(
  notes: Exposition["notes"],
  input: {
    voice: Voice;
    localKey: KeySignature;
    harmonicPlan: HarmonicPlan;
    rootDegree: number;
    startTick: number;
    durationTicks: number;
    maxNoteTicks?: number;
    meterAnchored?: boolean;
    strictSemitoneAvoidance?: boolean;
  },
): void {
  const lineDegrees = functionalSupportLineDegrees(input.voice, input.rootDegree);
  const maxNoteTicks = functionalSupportMaxNoteTicks(input.voice, input.maxNoteTicks, input.meterAnchored);
  let elapsedTicks = 0;
  let index = 0;

  while (elapsedTicks < input.durationTicks) {
    const durationTicks = Math.min(
      functionalSupportNoteDurationTicks({
        notes,
        voice: input.voice,
        startTick: input.startTick + elapsedTicks,
        maxNoteTicks,
        meterAnchored: input.meterAnchored,
      }),
      input.durationTicks - elapsedTicks,
    );
    const degree = lineDegrees[index % lineDegrees.length]!;
    addTextureNote(
      notes,
      {
        voice: input.voice,
        localKey: input.localKey,
        velocity: 50,
        role: "free-counterpoint",
        harmonicPlan: input.harmonicPlan,
        metricalHarmonyIntent:
          input.voice === "bass" && degree === input.rootDegree ? "structural-root-support" : "structural-chord-tone",
        strictSemitoneAvoidance: input.strictSemitoneAvoidance,
      },
      degree,
      input.startTick + elapsedTicks,
      durationTicks,
    );
    elapsedTicks += durationTicks;
    index += 1;
  }
}

function functionalSupportNoteDurationTicks(input: {
  notes: readonly NoteEvent[];
  voice: Voice;
  startTick: number;
  maxNoteTicks: number;
  meterAnchored: boolean | undefined;
}): number {
  if (input.meterAnchored === true && input.voice !== "bass") {
    const candidates = [TICKS_PER_QUARTER, TICKS_PER_QUARTER / 2].filter(
      (durationTicks) => durationTicks <= input.maxNoteTicks,
    );
    return (
      candidates.find(
        (durationTicks) => !hasExactRhythmAtStart(input.notes, input.voice, input.startTick, durationTicks),
      ) ?? TICKS_PER_QUARTER / 2
    );
  }
  return input.maxNoteTicks;
}

function hasExactRhythmAtStart(
  notes: readonly NoteEvent[],
  voice: Voice,
  startTick: number,
  durationTicks: number,
): boolean {
  return notes.some(
    (note) =>
      note.voice !== voice &&
      note.startTick === startTick &&
      note.durationTicks === durationTicks &&
      startTick < note.startTick + note.durationTicks,
  );
}

function functionalSupportMaxNoteTicks(
  voice: Voice,
  requestedMaxNoteTicks: number | undefined,
  meterAnchored: boolean | undefined,
): number {
  const maxNoteTicks = requestedMaxNoteTicks ?? TICKS_PER_QUARTER;
  if (meterAnchored === true && voice !== "bass") {
    return Math.min(maxNoteTicks, TICKS_PER_QUARTER);
  }
  return voice === "bass" ? maxNoteTicks : Math.min(maxNoteTicks, (TICKS_PER_QUARTER * 3) / 4);
}

function addFunctionalSupportForRun(
  notes: Exposition["notes"],
  input: {
    run: FunctionalSupportRun;
    plan: HarmonicPlan;
    supportVoice: Voice;
    maxNoteTicks?: number;
    meterAnchored?: boolean;
    strictSemitoneAvoidance?: boolean;
  },
): void {
  const anchor = nearestHarmonicAnchor(input.run.startTick, [input.plan]);
  addFunctionalSupportLine(notes, {
    voice: input.supportVoice,
    localKey: input.plan.targetKey,
    harmonicPlan: input.plan,
    rootDegree: anchor === undefined ? 0 : rootDegreeForFunction(anchor.function),
    startTick: input.run.startTick,
    durationTicks: input.run.endTick - input.run.startTick,
    maxNoteTicks: input.maxNoteTicks,
    meterAnchored: input.meterAnchored,
    strictSemitoneAvoidance: input.strictSemitoneAvoidance,
  });
}

function harmonicContinuitySupportTicks(plan: HarmonicPlan): number[] {
  const endTick = plan.startTick + plan.durationTicks;
  const ticks: number[] = [];
  for (let tick = plan.startTick; tick < endTick; tick += plan.meterContext.beatTicks) {
    if (beatStrengthAtTick(tick, plan.meterContext) === "strong") {
      ticks.push(tick);
    }
  }
  return ticks;
}

function harmonicContinuityRepairTicks(notes: readonly NoteEvent[], plan: HarmonicPlan): number[] {
  const endTick = plan.startTick + plan.durationTicks;
  const textureCheckpoints = notes
    .filter((note) => note.role === "free-counterpoint")
    .flatMap((note) => [note.startTick, note.startTick + note.durationTicks])
    .filter((tick) => plan.startTick <= tick && tick < endTick);
  return [...new Set([...harmonicContinuitySupportTicks(plan), ...textureCheckpoints])].sort(
    (left, right) => left - right,
  );
}

function supportHarmonicContinuityAtTick(notes: Exposition["notes"], plan: HarmonicPlan, tick: number): void {
  const anchor = nearestHarmonicAnchor(tick, [plan]);
  if (anchor === undefined) {
    return;
  }

  supportBassRootAtTick(notes, plan, tick, anchor);
  repairStructuralSupportAtTick(notes, tick, anchor);
  if (activeVoicesDuring(notes, tick, tick + plan.meterContext.beatTicks).length <= 2) {
    supportUpperChordToneAtTick(notes, plan, tick, anchor);
  }
}

function repairStructuralSupportAtTick(
  notes: Exposition["notes"],
  tick: number,
  anchor: NonNullable<ReturnType<typeof nearestHarmonicAnchor>>,
): void {
  const chordTonePitchClassesAtTick = chordTonePitchClasses(anchor.localKey, anchor.function);
  const rootPitchClass = scaleDegreePitchClass(rootDegreeForFunction(anchor.function), 0, anchor.localKey);

  for (const activeNote of notes.filter(
    (candidate) =>
      candidate.startTick <= tick &&
      tick < candidate.startTick + candidate.durationTicks &&
      candidate.role === "free-counterpoint" &&
      (candidate.metricalHarmonyIntent === "structural-chord-tone" ||
        candidate.metricalHarmonyIntent === "structural-root-support"),
  )) {
    const note = splitTextureNoteAtTick(notes, activeNote, tick);
    const expectedPitchClasses =
      note.metricalHarmonyIntent === "structural-root-support" && note.voice === "bass"
        ? [rootPitchClass]
        : chordTonePitchClassesAtTick;
    if (expectedPitchClasses.includes(positiveModulo(note.pitch, 12))) {
      continue;
    }

    const repairedPitch = nearestStructuralSupportPitch(notes, note, expectedPitchClasses, tick);
    if (repairedPitch !== undefined) {
      note.pitch = repairedPitch;
    }
  }
}

function splitTextureNoteAtTick(notes: Exposition["notes"], note: NoteEvent, tick: number): NoteEvent {
  if (note.startTick >= tick || tick >= note.startTick + note.durationTicks) {
    return note;
  }

  const tail: NoteEvent = {
    ...note,
    startTick: tick,
    durationTicks: note.startTick + note.durationTicks - tick,
  };
  note.durationTicks = tick - note.startTick;
  notes.push(tail);
  return tail;
}

function nearestStructuralSupportPitch(
  notes: readonly NoteEvent[],
  note: NoteEvent,
  pitchClasses: readonly number[],
  tick: number,
): number | undefined {
  const range = VOICE_RANGES[note.voice];
  const candidates = Array.from({ length: range.max - range.min + 1 }, (_, index) => range.min + index)
    .filter((pitch) => pitchClasses.includes(positiveModulo(pitch, 12)))
    .filter((pitch) => keepsAdjacentVoiceOrder(notes, note, pitch));
  const noSemitoneCandidates = candidates.filter((pitch) => !createsSemitoneAtTick(notes, note.voice, tick, pitch));
  const noUnisonCandidates = noSemitoneCandidates.filter(
    (pitch) => !createsPitchClassUnisonAtTick(notes, note.voice, tick, pitch),
  );

  return (
    nearestPitch(noUnisonCandidates, note.pitch) ??
    nearestPitch(noSemitoneCandidates, note.pitch) ??
    nearestPitch(candidates, note.pitch)
  );
}

function supportBassRootAtTick(
  notes: Exposition["notes"],
  plan: HarmonicPlan,
  tick: number,
  anchor: NonNullable<ReturnType<typeof nearestHarmonicAnchor>>,
): void {
  if (bassSupportsAnchorRoot(notes, tick, anchor)) {
    return;
  }

  const rootPitch = harmonicRootBassPitch(
    anchor.localKey,
    anchor.function,
    previousTextureNote(notes, "bass", tick)?.pitch,
  );
  const activeBass = activeNoteAt(notes, "bass", tick);
  if (activeBass !== undefined && activeBass.role === "free-counterpoint") {
    const bassSupport = splitTextureNoteAtTick(notes, activeBass, tick);
    const supportDuration = harmonicContinuitySupportDuration(notes, "bass", plan, tick);
    if (supportDuration < bassSupport.durationTicks) {
      notes.push({
        ...bassSupport,
        startTick: tick + supportDuration,
        durationTicks: bassSupport.durationTicks - supportDuration,
      });
    }
    bassSupport.pitch = rootPitch;
    bassSupport.durationTicks = Math.min(bassSupport.durationTicks, supportDuration);
    bassSupport.metricalHarmonyIntent = "structural-root-support";
    return;
  }

  if (activeBass !== undefined) {
    return;
  }

  notes.push({
    kind: "note",
    voice: "bass",
    startTick: tick,
    durationTicks: harmonicContinuitySupportDuration(notes, "bass", plan, tick),
    pitch: rootPitch,
    velocity: 52,
    role: "free-counterpoint",
    metricalHarmonyIntent: "structural-root-support",
  });
}

function repairFocusedBassRootSupport(notes: Exposition["notes"], sectionPlans: readonly HarmonicPlan[]): void {
  const focusedPlans = sectionPlans.filter((plan) => shouldRepairShortEpisodeHarmonicContinuity(plan, sectionPlans));
  for (const note of notes.filter(
    (candidate) =>
      candidate.voice === "bass" &&
      candidate.role === "free-counterpoint" &&
      candidate.metricalHarmonyIntent === "structural-root-support",
  )) {
    const plan = focusedPlans.find(
      (candidate) =>
        candidate.startTick <= note.startTick && note.startTick < candidate.startTick + candidate.durationTicks,
    );
    const anchor = plan === undefined ? undefined : nearestHarmonicAnchor(note.startTick, [plan]);
    if (anchor === undefined) {
      continue;
    }

    note.pitch = harmonicRootBassPitch(
      anchor.localKey,
      anchor.function,
      previousTextureNote(notes, "bass", note.startTick)?.pitch,
    );
  }
}

function supportUpperChordToneAtTick(
  notes: Exposition["notes"],
  plan: HarmonicPlan,
  tick: number,
  anchor: NonNullable<ReturnType<typeof nearestHarmonicAnchor>>,
): void {
  const supportVoice = (["tenor", "alto", "soprano"] as const).find(
    (voice) => activeNoteAt(notes, voice, tick) === undefined,
  );
  if (supportVoice === undefined) {
    return;
  }

  addTextureNote(
    notes,
    {
      voice: supportVoice,
      localKey: anchor.localKey,
      velocity: 48,
      role: "free-counterpoint",
      harmonicPlan: plan,
      metricalHarmonyIntent: "structural-chord-tone",
      strictSemitoneAvoidance: true,
    },
    motivicChordSupportDegree(notes, plan, tick, supportVoice, anchor) ?? rootDegreeForFunction(anchor.function) + 2,
    tick,
    motivicChordSupportDuration(notes, tick, supportVoice, plan) ??
      harmonicContinuitySupportDuration(notes, supportVoice, plan, tick),
  );
}

function motivicChordSupportDegree(
  notes: readonly NoteEvent[],
  plan: HarmonicPlan,
  tick: number,
  voice: Voice,
  anchor: NonNullable<ReturnType<typeof nearestHarmonicAnchor>>,
): number | undefined {
  if (!shouldUseDerivedMotivicSupport(plan)) {
    return undefined;
  }

  const motif = recentMotivicNotes(notes, tick);
  const profile = derivedMotivicSupportDegrees(motif, {
    voice,
    localKey: anchor.localKey,
    harmonicPlan: plan,
    rootDegree: rootDegreeForFunction(anchor.function),
  });
  if (profile === undefined) {
    return undefined;
  }

  const supportIndex = Math.max(0, Math.floor((tick - plan.startTick) / Math.max(1, plan.meterContext.beatTicks)));
  return profile[supportIndex % profile.length];
}

function motivicChordSupportDuration(
  notes: readonly NoteEvent[],
  tick: number,
  voice: Voice,
  plan: HarmonicPlan,
): number | undefined {
  if (!shouldUseDerivedMotivicSupport(plan)) {
    return undefined;
  }

  const supportDuration = harmonicContinuitySupportDuration(notes, voice, plan, tick);
  return recentMotivicNotes(notes, tick)
    .map((note) => note.durationTicks)
    .map((durationTicks) => Math.min(supportDuration, Math.max(TICKS_PER_QUARTER / 2, durationTicks)))
    .find((durationTicks) => !hasExactRhythmAtStart(notes, voice, tick, durationTicks));
}

function harmonicContinuitySupportDuration(
  notes: readonly NoteEvent[],
  voice: Voice,
  plan: HarmonicPlan,
  tick: number,
): number {
  const nextVoiceStartTick = notes
    .filter((note) => note.voice === voice && note.startTick > tick)
    .map((note) => note.startTick)
    .sort((left, right) => left - right)[0];
  const planEndTick = plan.startTick + plan.durationTicks;
  const maxSupportTicks = Math.max(TICKS_PER_QUARTER / 2, plan.meterContext.beatTicks / 2);
  return Math.max(
    TICKS_PER_QUARTER / 2,
    Math.min(maxSupportTicks, planEndTick - tick, (nextVoiceStartTick ?? planEndTick) - tick),
  );
}

function harmonicRootBassPitch(
  localKey: KeySignature,
  harmonicFunction: HarmonicPlan["anchors"][number]["function"],
  previousPitch: number | undefined,
): number {
  const rootPitchClass = scaleDegreePitchClass(rootDegreeForFunction(harmonicFunction), 0, localKey);
  return previousPitch === undefined
    ? placePitchInRegister(rootPitchClass, "bass", VOICE_REGISTER_TARGETS.bass)
    : fitPitchNearPrevious(rootPitchClass, "bass", previousPitch);
}

function bassSupportsAnchorRoot(
  notes: readonly NoteEvent[],
  tick: number,
  anchor: NonNullable<ReturnType<typeof nearestHarmonicAnchor>>,
): boolean {
  const activeBass = activeNoteAt(notes, "bass", tick);
  const rootPitchClass = scaleDegreePitchClass(rootDegreeForFunction(anchor.function), 0, anchor.localKey);
  return activeBass !== undefined && positiveModulo(activeBass.pitch, 12) === rootPitchClass;
}

function repairTextureVoiceCrossingsForPlans(notes: Exposition["notes"], sectionPlans: readonly HarmonicPlan[]): void {
  repairTextureVoiceCrossings(
    notes,
    Math.min(...sectionPlans.map((plan) => plan.startTick)),
    Math.max(...sectionPlans.map((plan) => plan.startTick + plan.durationTicks)),
  );
}

function repairTextureVoiceCrossingsForNotes(notes: Exposition["notes"], sectionPlans: readonly HarmonicPlan[]): void {
  const startTick = Math.min(...sectionPlans.map((plan) => plan.startTick), ...notes.map((note) => note.startTick));
  const endTick = Math.max(
    ...sectionPlans.map((plan) => plan.startTick + plan.durationTicks),
    ...notes.map((note) => note.startTick + note.durationTicks),
  );
  repairTextureVoiceCrossings(notes, startTick, endTick - startTick);
}

function functionalSupportLineDegrees(voice: Voice, rootDegree: number): readonly number[] {
  if (voice === "bass") {
    return [rootDegree, rootDegree + 2, rootDegree + 4, rootDegree + 2];
  }
  if (voice === "tenor") {
    return [rootDegree + 2, rootDegree + 4, rootDegree + 3, rootDegree + 2];
  }
  return [rootDegree + 4, rootDegree + 2, rootDegree + 5, rootDegree + 3];
}

function shouldUseDerivedMotivicSupport(harmonicPlan: HarmonicPlan): boolean {
  return (
    harmonicPlan.state === "episode" &&
    harmonicPlan.startTick <= TICKS_PER_QUARTER * 24 &&
    harmonicPlan.ambiguityIntent === "pivot-harmony"
  );
}

function recentMotivicNotes(notes: readonly NoteEvent[], startTick: number): NoteEvent[] {
  return notes
    .filter(
      (note) =>
        note.startTick + note.durationTicks <= startTick &&
        (note.role === "subject" ||
          note.role === "answer" ||
          note.role === "subject-fragment" ||
          note.role === "counter-subject" ||
          note.role === "free-counterpoint"),
    )
    .sort(compareNoteEvents)
    .slice(-8);
}

function derivedMotivicSupportDegrees(
  motif: readonly NoteEvent[],
  input: {
    voice: Voice;
    localKey: KeySignature;
    harmonicPlan: HarmonicPlan;
    rootDegree: number;
  },
): readonly number[] | undefined {
  const motifDegrees = motif
    .map((note) => pitchScaleDegree(note.pitch, input.localKey))
    .filter((degree) => degree !== undefined);
  if (motifDegrees.length < 3) {
    return undefined;
  }

  const intervals = motifDegrees.slice(1).map((degree, index) => normalizedDegreeMotion(degree - motifDegrees[index]!));
  const transformedIntervals = transformMotivicIntervals(intervals, input.harmonicPlan);
  const startingDegree = supportStartingDegree(input.voice, input.rootDegree);
  const degrees = [startingDegree];
  for (const interval of transformedIntervals.slice(0, 7)) {
    degrees.push(degrees.at(-1)! + interval);
  }

  return degrees.map((degree, index) =>
    isStructuralSupportIndex(index, input.harmonicPlan)
      ? nearestChordScaleDegree(
          degree,
          chordScaleDegreesForFunction(anchorFunctionForSupportIndex(index, input.harmonicPlan)),
        )
      : degree,
  );
}

function pitchScaleDegree(pitch: number, key: KeySignature): number | undefined {
  for (let degree = 0; degree < 7; degree += 1) {
    if (positiveModulo(pitch, 12) === scaleDegreePitchClass(degree, 0, key)) {
      return degree;
    }
  }
  return undefined;
}

function normalizedDegreeMotion(interval: number): number {
  if (interval > 3) {
    return interval - 7;
  }
  if (interval < -3) {
    return interval + 7;
  }
  return interval;
}

function transformMotivicIntervals(intervals: readonly number[], harmonicPlan: HarmonicPlan): readonly number[] {
  const singableIntervals = intervals.map((interval) => Math.max(-2, Math.min(2, interval)));
  if (harmonicPlan.fragmentTransform === "contrary-motion" || harmonicPlan.fragmentTransform === "inversion") {
    return singableIntervals.map((interval) => -interval);
  }
  if (harmonicPlan.sequencePattern === "descending-step") {
    return singableIntervals.map((interval) => (interval > 0 ? interval - 1 : interval));
  }
  if (harmonicPlan.sequencePattern === "ascending-step") {
    return singableIntervals.map((interval) => (interval < 0 ? interval + 1 : interval));
  }
  return singableIntervals;
}

function supportStartingDegree(voice: Voice, rootDegree: number): number {
  if (voice === "bass") {
    return rootDegree;
  }
  if (voice === "tenor") {
    return rootDegree + 2;
  }
  return rootDegree + 4;
}

function isStructuralSupportIndex(index: number, harmonicPlan: HarmonicPlan): boolean {
  return index === 0 || index % 3 === 0 || harmonicPlan.sequencePattern === "circle-fifths";
}

function anchorFunctionForSupportIndex(
  index: number,
  harmonicPlan: HarmonicPlan,
): HarmonicPlan["anchors"][number]["function"] {
  const anchor = harmonicPlan.anchors[Math.min(harmonicPlan.anchors.length - 1, Math.floor(index / 3))];
  return anchor?.function ?? "tonic";
}

function nearestChordScaleDegree(degree: number, chordDegrees: readonly number[]): number {
  return [...chordDegrees]
    .flatMap((chordDegree) => [chordDegree - 7, chordDegree, chordDegree + 7])
    .sort((left, right) => Math.abs(left - degree) - Math.abs(right - degree))[0]!;
}

function findUnsupportedThinningRuns(
  notes: readonly NoteEvent[],
  sectionPlans: readonly HarmonicPlan[],
): { startTick: number; endTick: number; activeVoices: readonly Voice[] }[] {
  const checkpoints = [...new Set(notes.flatMap((note) => [note.startTick, note.startTick + note.durationTicks]))].sort(
    (left, right) => left - right,
  );
  const runs: { startTick: number; endTick: number; activeVoices: readonly Voice[] }[] = [];
  let currentRun: { startTick: number; endTick: number; activeVoices: readonly Voice[] } | undefined;

  for (let index = 0; index < checkpoints.length - 1; index += 1) {
    const startTick = checkpoints[index]!;
    const endTick = checkpoints[index + 1]!;
    const activeVoices = activeVoicesDuring(notes, startTick, endTick);
    const plan = sectionPlanForTick(sectionPlans, startTick);

    if (isUnsupportedThinningSegment({ activeVoices, startTick, plan })) {
      if (
        currentRun !== undefined &&
        currentRun.endTick === startTick &&
        currentRun.activeVoices.join(">") === activeVoices.join(">")
      ) {
        currentRun.endTick = endTick;
      } else {
        if (currentRun !== undefined) {
          runs.push(currentRun);
        }
        currentRun = { startTick, endTick, activeVoices };
      }
    } else if (currentRun !== undefined) {
      runs.push(currentRun);
      currentRun = undefined;
    }
  }
  if (currentRun !== undefined) {
    runs.push(currentRun);
  }

  return runs.filter((run) => run.endTick - run.startTick >= TICKS_PER_QUARTER);
}

function findBassAnswerTailSupportRuns(
  notes: readonly NoteEvent[],
  subjectEntries: readonly PlannedEntry[],
): { startTick: number; endTick: number }[] {
  const firstBassAnswer = subjectEntries.find(
    (entry) => entry.voice === "bass" && entry.state === "exposition" && entry.form === "answer",
  );
  if (firstBassAnswer === undefined) {
    return [];
  }

  const firstBassAnswerEndTick = firstBassAnswerEnd(notes, firstBassAnswer);
  const startTick = firstBassAnswerTailStart(notes, firstBassAnswer);
  const endTick = firstBassAnswerEndTick + TICKS_PER_QUARTER * 9;
  const runs: { startTick: number; endTick: number; outsideVoiceSignature: string }[] = [];

  for (let tick = startTick; tick < endTick; tick += TICKS_PER_QUARTER / 2) {
    const segmentEndTick = Math.min(endTick, tick + TICKS_PER_QUARTER / 2);
    if (isBassAnswerTailRepairSegment(notes, tick, segmentEndTick, firstBassAnswerEndTick)) {
      const outsideVoiceSignature = activeOutsideVoiceSignature(notes, "bass", tick, segmentEndTick);
      const currentRun = runs.at(-1);
      if (currentRun?.endTick === tick && currentRun.outsideVoiceSignature === outsideVoiceSignature) {
        currentRun.endTick = segmentEndTick;
      } else {
        runs.push({ startTick: tick, endTick: segmentEndTick, outsideVoiceSignature });
      }
    }
  }

  return runs.map(({ startTick: runStartTick, endTick: runEndTick }) => ({
    startTick: runStartTick,
    endTick: runEndTick,
  }));
}

function findPostEntryThinSupportRuns(
  notes: readonly NoteEvent[],
  subjectEntries: readonly PlannedEntry[],
): { startTick: number; endTick: number; entryVoice: Voice }[] {
  const runs: { startTick: number; endTick: number; entryVoice: Voice }[] = [];

  for (const entry of subjectEntries) {
    if (entry.form !== "answer" && entry.state !== "stretto-like") {
      continue;
    }
    runs.push(...postEntryThinSupportRunsForEntry(notes, entry));
  }

  return runs;
}

function postEntryThinSupportRunsForEntry(
  notes: readonly NoteEvent[],
  entry: PlannedEntry,
): { startTick: number; endTick: number; entryVoice: Voice }[] {
  const scanStartTick = entry.startTick + TICKS_PER_QUARTER * 2;
  const scanEndTick = scanStartTick + TICKS_PER_QUARTER * 8;
  const stepTicks = TICKS_PER_QUARTER / 2;
  const runs: { startTick: number; endTick: number; entryVoice: Voice }[] = [];
  let currentRun: { startTick: number; endTick: number; entryVoice: Voice } | undefined;

  for (let tick = scanStartTick; tick < scanEndTick; tick += stepTicks) {
    const segmentEndTick = Math.min(scanEndTick, tick + stepTicks);
    if (isThinPostEntrySupportSegment(notes, entry.voice, tick, segmentEndTick)) {
      if (currentRun?.endTick === tick) {
        currentRun.endTick = segmentEndTick;
      } else {
        if (currentRun !== undefined) {
          runs.push(currentRun);
        }
        currentRun = { startTick: tick, endTick: segmentEndTick, entryVoice: entry.voice };
      }
    } else if (currentRun !== undefined) {
      runs.push(currentRun);
      currentRun = undefined;
    }
  }
  if (currentRun !== undefined) {
    runs.push(currentRun);
  }

  return runs.filter((run) => run.endTick - run.startTick >= TICKS_PER_QUARTER * 4);
}

function isThinPostEntrySupportSegment(
  notes: readonly NoteEvent[],
  entryVoice: Voice,
  startTick: number,
  endTick: number,
): boolean {
  const activeNotes = notes.filter(
    (note) => note.startTick < endTick && startTick < note.startTick + note.durationTicks,
  );
  const entryVoiceActive = activeNotes.some((note) => note.voice === entryVoice);
  const outsideVoiceCount = new Set(activeNotes.filter((note) => note.voice !== entryVoice).map((note) => note.voice))
    .size;

  return entryVoiceActive && outsideVoiceCount <= 1;
}

function isBassAnswerTailRepairSegment(
  notes: readonly NoteEvent[],
  startTick: number,
  endTick: number,
  firstBassAnswerEndTick: number,
): boolean {
  const activeNotes = notes.filter(
    (note) => note.startTick < endTick && startTick < note.startTick + note.durationTicks,
  );
  const activeVoices = new Set(activeNotes.map((note) => note.voice));
  const outsideVoices = [...activeVoices].filter((voice) => voice !== "bass");
  const bassOnly = activeVoices.size === 1 && activeVoices.has("bass");
  const oneOutside = outsideVoices.length <= 1;
  if (startTick < firstBassAnswerEndTick) {
    return oneOutside;
  }

  return (
    oneOutside || (bassOnly && activeNotes.some((note) => note.voice === "bass" && note.role === "free-counterpoint"))
  );
}

function firstBassAnswerTailStart(notes: readonly NoteEvent[], firstBassAnswer: PlannedEntry): number {
  return Math.min(firstBassAnswerEnd(notes, firstBassAnswer), firstBassAnswer.startTick + TICKS_PER_QUARTER * 4);
}

function firstBassAnswerEnd(notes: readonly NoteEvent[], firstBassAnswer: PlannedEntry): number {
  const answerNotes = notes.filter(
    (note) =>
      note.voice === "bass" &&
      note.role === "answer" &&
      firstBassAnswer.startTick <= note.startTick &&
      note.startTick < firstBassAnswer.startTick + TICKS_PER_QUARTER * 8,
  );
  return Math.max(firstBassAnswer.startTick, ...answerNotes.map((note) => note.startTick + note.durationTicks));
}

function isUnsupportedThinningSegment(input: {
  activeVoices: readonly Voice[];
  startTick: number;
  plan: HarmonicPlan | undefined;
}): boolean {
  const { activeVoices, startTick, plan } = input;
  return (
    plan !== undefined &&
    plan.state !== "exposition" &&
    isAbruptUpperSolo(activeVoices) &&
    sectionStartDistance(plan, startTick) > TICKS_PER_QUARTER &&
    sectionEndDistance(plan, startTick) > TICKS_PER_QUARTER &&
    !hasNearbyCadenceTarget(plan, startTick)
  );
}

function isAbruptUpperSolo(activeVoices: readonly Voice[]): boolean {
  return activeVoices.length === 1 && !activeVoices.includes("bass");
}

function sectionStartDistance(plan: HarmonicPlan, tick: number): number {
  return tick - plan.startTick;
}

function sectionEndDistance(plan: HarmonicPlan, tick: number): number {
  return plan.startTick + plan.durationTicks - tick;
}

function hasNearbyCadenceTarget(plan: HarmonicPlan, tick: number): boolean {
  return plan.anchors.some((anchor) => anchor.cadenceTarget && Math.abs(anchor.tick - tick) <= TICKS_PER_QUARTER);
}

function activeVoicesDuring(notes: readonly NoteEvent[], startTick: number, endTick: number): Voice[] {
  return VOICE_ENTRY_ORDER.filter((voice) =>
    notes.some(
      (note) => note.voice === voice && note.startTick < endTick && startTick < note.startTick + note.durationTicks,
    ),
  );
}

function sectionPlanForTick(sectionPlans: readonly HarmonicPlan[], tick: number): HarmonicPlan | undefined {
  return sectionPlans.find((plan) => plan.startTick <= tick && tick < plan.startTick + plan.durationTicks);
}

function functionalSupportVoice(
  notes: readonly NoteEvent[],
  run: { startTick: number; endTick: number },
): Voice | undefined {
  return (["bass", "tenor", "alto"] as const).find(
    (voice) => !hasOverlap(notes, voice, run.startTick, run.endTick - run.startTick),
  );
}

function tailSupportVoices(notes: readonly NoteEvent[], run: { startTick: number; endTick: number }): Voice[] {
  const outsideVoiceCount = activeOutsideVoiceCount(notes, "bass", run.startTick, run.endTick);
  const requiredSupportCount = Math.max(0, 2 - outsideVoiceCount);
  return (["alto", "tenor", "soprano"] as const)
    .filter((voice) => !hasOverlap(notes, voice, run.startTick, run.endTick - run.startTick))
    .slice(0, requiredSupportCount);
}

function activeOutsideVoiceCount(
  notes: readonly NoteEvent[],
  primaryVoice: Voice,
  startTick: number,
  endTick: number,
): number {
  return new Set(
    notes
      .filter(
        (note) =>
          note.voice !== primaryVoice && note.startTick < endTick && startTick < note.startTick + note.durationTicks,
      )
      .map((note) => note.voice),
  ).size;
}

function activeOutsideVoiceSignature(
  notes: readonly NoteEvent[],
  primaryVoice: Voice,
  startTick: number,
  endTick: number,
): string {
  return [
    ...new Set(
      notes
        .filter(
          (note) =>
            note.voice !== primaryVoice && note.startTick < endTick && startTick < note.startTick + note.durationTicks,
        )
        .map((note) => note.voice),
    ),
  ]
    .sort()
    .join(">");
}

function postEntrySupportVoice(
  notes: readonly NoteEvent[],
  run: { startTick: number; endTick: number; entryVoice: Voice },
): Voice | undefined {
  return VOICE_ENTRY_ORDER.filter((voice) => voice !== run.entryVoice).find(
    (voice) => !hasOverlap(notes, voice, run.startTick, run.endTick - run.startTick),
  );
}

function exposedSoloSupportVoice(
  notes: readonly NoteEvent[],
  run: { startTick: number; endTick: number; activeVoice: Voice },
): Voice | undefined {
  return VOICE_ENTRY_ORDER.filter((voice) => voice !== run.activeVoice).find(
    (voice) => !hasOverlap(notes, voice, run.startTick, run.endTick - run.startTick),
  );
}

export function counterSubjectDegreesForMode(mode: KeyMode): readonly number[] {
  return isModalMode(mode) ? MODAL_COUNTER_SUBJECT_DEGREES : COUNTER_SUBJECT_DEGREES;
}

export function freeCounterpointDegreesForMode(mode: KeyMode): readonly number[] {
  return isModalMode(mode) ? MODAL_FREE_COUNTERPOINT_DEGREES : FREE_COUNTERPOINT_DEGREES;
}

const FIFTH_CLIMB_ENTRY_COUNTER_SUBJECT_DEGREES = [4, 3, 4, 1, 2, 0, 1, 0] as const;
const STEPWISE_FIFTH_CLIMB_ENTRY_COUNTER_SUBJECT_DEGREES = [4, 1, 3, 1, 2, 0, 1, 0] as const;

function entryCounterSubjectDegrees(subject: readonly SubjectNote[], mode: KeyMode): readonly number[] {
  if (isModalMode(mode)) {
    return MODAL_COUNTER_SUBJECT_DEGREES;
  }
  if (hasStepwiseFifthClimb(subject)) {
    return STEPWISE_FIFTH_CLIMB_ENTRY_COUNTER_SUBJECT_DEGREES;
  }
  return hasUpperNeighborFifthClimb(subject) ? FIFTH_CLIMB_ENTRY_COUNTER_SUBJECT_DEGREES : COUNTER_SUBJECT_DEGREES;
}

function hasStepwiseFifthClimb(subject: readonly SubjectNote[]): boolean {
  return (
    subject
      .slice(0, 8)
      .map((note) => note.scaleDegree)
      .join("-") === "0-1-2-3-4-3-2-1"
  );
}

function hasUpperNeighborFifthClimb(subject: readonly SubjectNote[]): boolean {
  return (
    subject
      .slice(0, 8)
      .map((note) => note.scaleDegree)
      .join("-") === "0-1-2-3-4-3-1-2"
  );
}
