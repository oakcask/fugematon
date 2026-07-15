import { TICKS_PER_QUARTER, VOICE_RANGES } from "../constants.js";
import type {
  EntryForm,
  HarmonicPlan,
  KeyMode,
  KeySignature,
  MetricalHarmonyIntent,
  NoteEvent,
  PlannedEntry,
  Voice,
} from "../events.js";
import {
  isPitchAllowedByWritingProfile,
  placePitchInWritingProfile,
  registerTargetForVoice,
  voiceRangeForProfile,
  type WritingProfile,
} from "../writing-profile.js";
import { voicePitchDomain } from "./constraint-domain.js";
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
import { classifyVoicePairSpan } from "./quality-vector-voice-pairs.js";
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
  freeCounterpointPhraseVariation?: boolean;
  writingProfile?: WritingProfile;
};

export type ContinuityTexturePlan = ContinuityCounterpointInput & {
  voices: Voice[];
};

export type ContinuityLineKind = "linear" | "oblique-support";

type FunctionalSupportRun = {
  startTick: number;
  endTick: number;
};

type FunctionalSupportProfile = {
  degrees: readonly number[];
  durationTicks: readonly number[];
};

export type UnexplainedRestThinningSupportPolicy = "balanced-upper-agency" | "low-root-first";

type TextureVoiceCrossingRepairMode = "legacy" | "solver";

type EntryCounterpointTextureInput = {
  enteringVoice: Voice;
  startTick: number;
  durationTicks: number;
  localKey: KeySignature;
  eligibleVoices?: readonly Voice[];
  harmonicPlan?: HarmonicPlan;
  counterSubjectSupportRepair?: boolean;
  freeCounterpointPhraseVariation?: boolean;
  writingProfile?: WritingProfile;
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
  motivicDerivation?: NoteEvent["motivicDerivation"];
  writingProfile?: WritingProfile;
};

const LONG_REST_PHRASE_CLOSURE_TICKS = TICKS_PER_QUARTER * 2;
const PHRASE_CLOSURE_CADENCE_PROXIMITY_TICKS = TICKS_PER_QUARTER;
const STRETTO_ENTRY_HARMONY_REPAIR_MAX_START_TICKS = TICKS_PER_QUARTER * 54;

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

  if (entry.eligibleVoices !== undefined || entry.freeCounterpointPhraseVariation === true) {
    repairTextureVoiceCrossings(
      notes,
      entry.startTick,
      entry.durationTicks,
      [entry.harmonicPlan],
      entry.writingProfile,
      entry.writingProfile === undefined ? "legacy" : "solver",
    );
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
    counterSubjectSupportRepair: entry.counterSubjectSupportRepair,
    writingProfile: entry.writingProfile,
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
      freeCounterpointPhraseVariation: entry.counterSubjectSupportRepair || entry.freeCounterpointPhraseVariation,
      writingProfile: entry.writingProfile,
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
  if (!hasMultipleOutsideVoiceOnsets(outsideStartingNotes)) {
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

function hasMultipleOutsideVoiceOnsets(notes: readonly NoteEvent[]): boolean {
  return new Set(notes.map((note) => note.voice)).size >= 2;
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
  const delayedVoiceCount = Math.max(1, Math.min(2, notes.length - 1));
  return boundaryResetDelayCandidates(notes, previousNotes, entryStartTick).slice(0, delayedVoiceCount);
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
    writingProfile?: WritingProfile;
  },
): void {
  let elapsedTicks = 0;
  for (let index = 0; index < subject.length && elapsedTicks < pattern.maxDurationTicks; index += 1) {
    const subjectNote = subject[index]!;
    const remainingTicks = pattern.maxDurationTicks - elapsedTicks;
    const durationTicks = Math.min(subjectNote.durationTicks, remainingTicks);
    const startTick = pattern.startTick + elapsedTicks;
    if (hasOverlap(notes, pattern.voice, startTick, durationTicks)) {
      elapsedTicks += subjectNote.durationTicks;
      continue;
    }

    const degree = pattern.degrees[index % pattern.degrees.length]!;
    const combinedShortDurationTicks = combinedShortFreeCounterpointDuration(
      pattern,
      index,
      durationTicks,
      remainingTicks,
    );
    if (combinedShortDurationTicks !== undefined) {
      addTextureNote(notes, pattern, degree, startTick, combinedShortDurationTicks);
      elapsedTicks += combinedShortDurationTicks;
      index += 1;
      continue;
    }
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

function combinedShortFreeCounterpointDuration(
  pattern: Parameters<typeof addPatternCounterpoint>[2],
  index: number,
  durationTicks: number,
  remainingTicks: number,
): number | undefined {
  if (
    pattern.role !== "free-counterpoint" ||
    pattern.freeCounterpointPhraseVariation !== true ||
    pattern.harmonicPlan === undefined ||
    pattern.harmonicPlan.state === "exposition" ||
    durationTicks > TICKS_PER_QUARTER / 2 ||
    remainingTicks < TICKS_PER_QUARTER
  ) {
    return undefined;
  }

  const variant = freeCounterpointPhraseVariant(pattern, index);
  return variant === 1 || variant === 3 ? TICKS_PER_QUARTER : undefined;
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
  let metricalHarmonyIntent =
    pattern.metricalHarmonyIntent ??
    metricalHarmonyIntentForDegree({
      degree,
      tick: startTick,
      voice: pattern.voice,
      harmonicPlan: pattern.harmonicPlan,
    });
  let pitchClass = scaleDegreePitchClass(degree, 0, pattern.localKey);
  const registerTarget =
    pattern.writingProfile === undefined
      ? VOICE_REGISTER_TARGETS[pattern.voice]
      : registerTargetForVoice(pattern.writingProfile, pattern.voice);
  let pitch =
    pattern.writingProfile === undefined
      ? placePitchInRegister(pitchClass, pattern.voice, registerTarget)
      : placePitchInWritingProfile(pitchClass, pattern.voice, registerTarget, pattern.writingProfile);
  if (previous?.pitch === pitch && pattern.role === "free-counterpoint") {
    pitchClass = scaleDegreePitchClass(degree + 1, 0, pattern.localKey);
    pitch =
      pattern.writingProfile === undefined
        ? placePitchInRegister(pitchClass, pattern.voice, registerTarget)
        : placePitchInWritingProfile(pitchClass, pattern.voice, registerTarget, pattern.writingProfile);
  }
  if (previous !== undefined && (pattern.role === "free-counterpoint" || pattern.role === "counter-subject")) {
    pitch = fitPitchNearPrevious(pitchClass, pattern.voice, previous.pitch, pattern.writingProfile);
  }
  pitch = weakDissonanceSafePitch(notes, pattern, startTick, durationTicks, pitch);
  pitch = counterSubjectSafePitch(notes, pattern, startTick, durationTicks, pitch);
  pitch = highRegisterSopranoSupportPitch(
    notes,
    { ...pattern, metricalHarmonyIntent },
    startTick,
    durationTicks,
    pitch,
  );
  if (pattern.writingProfile !== undefined && !isPitchAllowedByWritingProfile(pattern.writingProfile, pitch)) {
    pitch = placePitchInWritingProfile(pitchClass, pattern.voice, registerTarget, pattern.writingProfile);
  }
  metricalHarmonyIntent = classifyRealizedStructuralIntent(pattern, pitch, startTick, metricalHarmonyIntent);
  notes.push({
    kind: "note",
    voice: pattern.voice,
    startTick,
    durationTicks,
    pitch,
    velocity: pattern.velocity,
    role: pattern.role,
    metricalHarmonyIntent,
    motivicDerivation: pattern.motivicDerivation,
  });
}

function classifyRealizedStructuralIntent(
  pattern: TextureNotePattern,
  pitch: number,
  tick: number,
  intent: MetricalHarmonyIntent,
): MetricalHarmonyIntent {
  if (
    pattern.harmonicPlan === undefined ||
    (intent !== "structural-chord-tone" && intent !== "structural-root-support")
  ) {
    return intent;
  }
  const anchor = nearestHarmonicAnchor(tick, [pattern.harmonicPlan]);
  if (
    anchor === undefined ||
    chordTonePitchClasses(anchor.localKey, anchor.function).includes(positiveModulo(pitch, 12))
  ) {
    return intent;
  }
  const realizedDegree = pitchScaleDegree(pitch, anchor.localKey);
  if (realizedDegree === undefined) {
    return beatStrengthAtTick(tick, pattern.harmonicPlan.meterContext) === "strong"
      ? "strong-non-chord-tone"
      : "weak-passing-tone";
  }
  return metricalHarmonyIntentForDegree({
    degree: realizedDegree,
    tick,
    voice: pattern.voice,
    harmonicPlan: pattern.harmonicPlan,
  });
}

function highRegisterSopranoSupportPitch(
  notes: readonly NoteEvent[],
  pattern: TextureNotePattern,
  startTick: number,
  durationTicks: number,
  pitch: number,
): number {
  if (
    pattern.writingProfile === undefined ||
    !usesConstrainedSopranoContourProfile(pattern.writingProfile) ||
    pattern.voice !== "soprano" ||
    (pattern.role !== "free-counterpoint" && pattern.role !== "counter-subject")
  ) {
    return pitch;
  }

  const previous = previousTextureNote(notes, pattern.voice, startTick);
  const threshold = Math.min(
    voiceRangeForProfile(pattern.writingProfile, pattern.voice).max,
    registerTargetForVoice(pattern.writingProfile, pattern.voice) + 9,
  );
  if (previous === undefined || pitch < threshold || Math.abs(pitch - previous.pitch) < 7) {
    return pitch;
  }

  const noteShape = textureNoteShape(pattern, startTick, durationTicks, pitch);
  const anchor =
    pattern.harmonicPlan === undefined ? undefined : nearestHarmonicAnchor(startTick, [pattern.harmonicPlan]);
  const chordTonePitchClassesAtTick =
    anchor === undefined ? undefined : chordTonePitchClasses(anchor.localKey, anchor.function);
  const candidates = pattern.writingProfile.absolutePitchSet
    .filter((candidatePitch) => candidatePitch < threshold)
    .filter((candidatePitch) => candidatePitch >= voiceRangeForProfile(pattern.writingProfile!, pattern.voice).min)
    .filter((candidatePitch) => keepsAdjacentVoiceOrder(notes, noteShape, candidatePitch))
    .filter((candidatePitch) => !createsSemitoneAtTick(notes, pattern.voice, startTick, candidatePitch))
    .filter((candidatePitch) => !createsPitchClassUnisonAtTick(notes, pattern.voice, startTick, candidatePitch));
  const harmonicCandidates =
    chordTonePitchClassesAtTick === undefined
      ? candidates
      : candidates.filter((candidatePitch) => chordTonePitchClassesAtTick.includes(positiveModulo(candidatePitch, 12)));
  const viableCandidates = harmonicCandidates.length > 0 ? harmonicCandidates : candidates;

  return (
    [...viableCandidates].sort(
      (left, right) =>
        Math.abs(left - previous.pitch) - Math.abs(right - previous.pitch) ||
        Math.abs(left - pitch) - Math.abs(right - pitch) ||
        left - right,
    )[0] ?? pitch
  );
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
    writingProfile: pattern.writingProfile,
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
    writingProfile: pattern.writingProfile,
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
  writingProfile?: WritingProfile;
}): number[] {
  const range =
    input.writingProfile === undefined
      ? VOICE_RANGES[input.voice]
      : voiceRangeForProfile(input.writingProfile, input.voice);
  return input.steps
    .map((step) => input.pitch + step)
    .filter((candidatePitch) => input.chordTonePitchClasses.includes(positiveModulo(candidatePitch, 12)))
    .filter((candidatePitch) => candidatePitch >= range.min)
    .filter((candidatePitch) => candidatePitch <= range.max)
    .filter(
      (candidatePitch) =>
        input.writingProfile === undefined || isPitchAllowedByWritingProfile(input.writingProfile, candidatePitch),
    );
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

export function fitPitchNearPrevious(
  pitchClass: number,
  voice: Voice,
  previousPitch: number,
  writingProfile?: WritingProfile,
): number {
  const range = writingProfile === undefined ? VOICE_RANGES[voice] : voiceRangeForProfile(writingProfile, voice);
  const registerTarget =
    writingProfile === undefined ? VOICE_REGISTER_TARGETS[voice] : registerTargetForVoice(writingProfile, voice);
  const preferredMin = Math.max(range.min, registerTarget - 6);
  let pitch =
    writingProfile === undefined
      ? placePitchInRegister(pitchClass, voice, registerTarget)
      : placePitchInWritingProfile(pitchClass, voice, registerTarget, writingProfile);
  while (pitch - previousPitch > 5 && pitch - 12 >= preferredMin) {
    pitch -= 12;
  }
  while (previousPitch - pitch > 5 && pitch + 12 <= range.max) {
    pitch += 12;
  }
  if (writingProfile !== undefined && !isPitchAllowedByWritingProfile(writingProfile, pitch)) {
    return placePitchInWritingProfile(pitchClass, voice, registerTarget, writingProfile);
  }
  return pitch;
}

function repairTextureVoiceCrossings(
  notes: Exposition["notes"],
  startTick: number,
  durationTicks: number,
  sectionPlans: readonly (HarmonicPlan | undefined)[] = [],
  writingProfile?: WritingProfile,
  repairMode: TextureVoiceCrossingRepairMode = "legacy",
): void {
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

      if (repairMode === "solver" && writingProfile !== undefined) {
        continue;
      }

      if (repairMode === "solver") {
        const repair = chooseResidualVoiceCrossingRepair(
          notes,
          higherNote,
          lowerNote,
          tick,
          sectionPlans,
          writingProfile,
        );
        if (repair !== undefined) {
          repair.note.pitch = repair.pitch;
        }
      } else if (canMoveDownWithoutCrossing(notes, lowerNote, lowerNote.pitch - 12)) {
        lowerNote.pitch -= 12;
      } else if (canMoveUpWithoutCrossing(notes, higherNote, higherNote.pitch + 12)) {
        higherNote.pitch += 12;
      } else if (canMoveDownBelowHigherAtTick(notes, lowerNote, higherNote, tick)) {
        lowerNote.pitch -= 12;
      }
    }
  }
  repairResidualAdjacentVoiceCrossings(notes, checkpoints, sectionPlans, writingProfile, repairMode);
}

function repairResidualAdjacentVoiceCrossings(
  notes: Exposition["notes"],
  checkpoints: readonly number[],
  sectionPlans: readonly (HarmonicPlan | undefined)[],
  writingProfile?: WritingProfile,
  repairMode: TextureVoiceCrossingRepairMode = "legacy",
): void {
  const adjacentPairs: readonly (readonly [higher: Voice, lower: Voice])[] = [
    ["soprano", "alto"],
    ["alto", "tenor"],
    ["tenor", "bass"],
  ];
  const maxPasses = repairMode === "solver" ? 4 : 1;
  for (let pass = 0; pass < maxPasses; pass += 1) {
    let changed = false;
    for (const tick of checkpoints) {
      if (repairMode === "solver" && writingProfile !== undefined && hasAdjacentVoiceCrossingAtTick(notes, tick)) {
        const stackRepair = chooseProfileVoiceOrderRepairAtTick(notes, tick, writingProfile);
        if (stackRepair !== undefined) {
          for (const repair of stackRepair) {
            if (repair.note.pitch !== repair.pitch) {
              repair.note.pitch = repair.pitch;
              changed = true;
            }
          }
        }
      }
      for (const [higher, lower] of adjacentPairs) {
        const higherNote = activeNoteAt(notes, higher, tick);
        const lowerNote = activeNoteAt(notes, lower, tick);
        if (higherNote === undefined || lowerNote === undefined || higherNote.pitch >= lowerNote.pitch) {
          continue;
        }
        if (repairMode === "solver") {
          const repair = chooseResidualVoiceCrossingRepair(
            notes,
            higherNote,
            lowerNote,
            tick,
            sectionPlans,
            writingProfile,
          );
          if (repair !== undefined && repair.note.pitch !== repair.pitch) {
            repair.note.pitch = repair.pitch;
            changed = true;
          }
          continue;
        }

        const loweredPitch = lowerNote.pitch - 12;
        if (canMoveDownBelowHigherAtTick(notes, lowerNote, higherNote, tick)) {
          lowerNote.pitch = loweredPitch;
          changed = true;
          continue;
        }
        const raisedPitch = higherNote.pitch + 12;
        if (raisedPitch <= VOICE_RANGES[higherNote.voice].max) {
          higherNote.pitch = raisedPitch;
          changed = true;
        }
      }
    }
    if (!changed) {
      break;
    }
  }
}

function hasAdjacentVoiceCrossingAtTick(notes: readonly NoteEvent[], tick: number): boolean {
  const soprano = activeNoteAt(notes, "soprano", tick)?.pitch;
  const alto = activeNoteAt(notes, "alto", tick)?.pitch;
  const tenor = activeNoteAt(notes, "tenor", tick)?.pitch;
  const bass = activeNoteAt(notes, "bass", tick)?.pitch;
  return (
    (soprano !== undefined && alto !== undefined && soprano < alto) ||
    (alto !== undefined && tenor !== undefined && alto < tenor) ||
    (tenor !== undefined && bass !== undefined && tenor < bass)
  );
}

function chooseProfileVoiceOrderRepairAtTick(
  notes: readonly NoteEvent[],
  tick: number,
  writingProfile: WritingProfile,
): Array<{ note: NoteEvent; pitch: number }> | undefined {
  const active = VOICE_ENTRY_ORDER.map((voice) => activeNoteAt(notes, voice, tick)).filter(
    (note): note is NoteEvent => note !== undefined,
  );
  if (active.length < 2) {
    return undefined;
  }

  const domains = active.map((note) => {
    const pitches = voicePitchDomain(writingProfile, note.voice, positiveModulo(note.pitch, 12))
      .filter((pitch) => pitch >= 0 && pitch <= 127)
      .sort((left, right) => Math.abs(left - note.pitch) - Math.abs(right - note.pitch) || left - right)
      .slice(0, 4);
    return { note, pitches };
  });
  if (domains.some((domain) => domain.pitches.length === 0)) {
    return undefined;
  }

  let best: { repairs: Array<{ note: NoteEvent; pitch: number }>; cost: number } | undefined;
  const search = (index: number, selected: Array<{ note: NoteEvent; pitch: number }>): void => {
    if (index >= domains.length) {
      if (!selectedKeepsVoiceOrder(selected)) {
        return;
      }
      if (!selectedKeepsVoiceOrderAcrossDurations(notes, selected)) {
        return;
      }
      const repairs = selected.filter(({ note, pitch }) => note.pitch !== pitch);
      if (repairs.length === 0) {
        return;
      }
      const cost = selected.reduce(
        (sum, { note, pitch }) =>
          sum +
          Math.abs(note.pitch - pitch) +
          voiceOrderRepairRoleCost(note.role) +
          voiceOrderRepairPitchCost(note, pitch, writingProfile),
        0,
      );
      if (best === undefined || cost < best.cost) {
        best = { repairs, cost };
      }
      return;
    }

    const domain = domains[index]!;
    for (const pitch of domain.pitches) {
      search(index + 1, [...selected, { note: domain.note, pitch }]);
    }
  };

  search(0, []);
  return best?.repairs;
}

function selectedKeepsVoiceOrderAcrossDurations(
  notes: readonly NoteEvent[],
  selected: readonly { note: NoteEvent; pitch: number }[],
): boolean {
  const changed = selected.filter(({ note, pitch }) => note.pitch !== pitch);
  if (changed.length === 0) {
    return true;
  }

  const checkpoints = [
    ...new Set(
      changed.flatMap(({ note }) =>
        notes
          .flatMap((candidate) => [candidate.startTick, candidate.startTick + candidate.durationTicks])
          .filter((tick) => note.startTick <= tick && tick < note.startTick + note.durationTicks),
      ),
    ),
  ];
  return checkpoints.every((tick) => {
    const activePitchForVoice = (voice: Voice): number | undefined => {
      const active = activeNoteAt(notes, voice, tick);
      if (active === undefined) {
        return undefined;
      }
      return selected.find(({ note }) => note === active)?.pitch ?? active.pitch;
    };
    return changed.every(({ note }) => {
      const pitch = activePitchForVoice(note.voice);
      if (pitch === undefined) {
        return true;
      }
      const higher = adjacentHigherVoice(note.voice);
      const lower = adjacentLowerVoice(note.voice);
      const higherPitch = higher === undefined ? undefined : activePitchForVoice(higher);
      const lowerPitch = lower === undefined ? undefined : activePitchForVoice(lower);
      return (higherPitch === undefined || higherPitch >= pitch) && (lowerPitch === undefined || pitch >= lowerPitch);
    });
  });
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

function selectedKeepsVoiceOrder(selected: readonly { note: NoteEvent; pitch: number }[]): boolean {
  const pitchByVoice = new Map(selected.map(({ note, pitch }) => [note.voice, pitch]));
  const soprano = pitchByVoice.get("soprano");
  const alto = pitchByVoice.get("alto");
  const tenor = pitchByVoice.get("tenor");
  const bass = pitchByVoice.get("bass");
  return (
    (soprano === undefined || alto === undefined || soprano >= alto) &&
    (alto === undefined || tenor === undefined || alto >= tenor) &&
    (tenor === undefined || bass === undefined || tenor >= bass)
  );
}

function voiceOrderRepairRoleCost(role: NoteEvent["role"] | undefined): number {
  if (isTextureRole(role)) {
    return 0;
  }
  if (role === "counter-subject" || role === "free-counterpoint") {
    return 2;
  }
  if (role === "subject-fragment") {
    return 6;
  }
  if (role === "subject" || role === "answer") {
    return 10;
  }
  return 4;
}

function voiceOrderRepairPitchCost(note: NoteEvent, pitch: number, writingProfile: WritingProfile): number {
  if (!usesConstrainedSopranoContourProfile(writingProfile)) {
    return 0;
  }

  const highRegisterThreshold = Math.min(
    voiceRangeForProfile(writingProfile, note.voice).max,
    registerTargetForVoice(writingProfile, note.voice) + 9,
  );
  return note.voice === "soprano" && pitch >= highRegisterThreshold ? 96 : 0;
}

function chooseResidualVoiceCrossingRepair(
  notes: readonly NoteEvent[],
  higherNote: NoteEvent,
  lowerNote: NoteEvent,
  tick: number,
  sectionPlans: readonly (HarmonicPlan | undefined)[],
  writingProfile?: WritingProfile,
): { note: NoteEvent; pitch: number } | undefined {
  const sectionPlan = sectionPlans.find(
    (plan) => plan !== undefined && plan.startTick <= tick && tick < plan.startTick + plan.durationTicks,
  );
  const anchor = sectionPlan === undefined ? undefined : nearestHarmonicAnchor(tick, [sectionPlan]);

  return [
    { note: lowerNote, pitch: lowerNote.pitch - 12 },
    { note: higherNote, pitch: higherNote.pitch + 12 },
  ]
    .filter((candidate) => keepsAdjacentVoiceOrder(notes, candidate.note, candidate.pitch))
    .filter((candidate) => isTextureRepairPitchAllowed(candidate.note, candidate.pitch, writingProfile))
    .sort(
      (left, right) =>
        textureVoiceCrossingRepairCost(left.note, left.pitch, anchor) -
        textureVoiceCrossingRepairCost(right.note, right.pitch, anchor),
    )[0];
}

function textureVoiceCrossingRepairCost(
  note: NoteEvent,
  pitch: number,
  anchor: ReturnType<typeof nearestHarmonicAnchor>,
): number {
  const textureRoleCost = isTextureRole(note.role) ? 0 : 100;
  const harmonicCost = isHarmonicSupportPitch(pitch, anchor) ? 0 : 12;
  const rootSupportCost =
    note.metricalHarmonyIntent === "structural-root-support" && !isHarmonicRootSupportPitch(pitch, anchor) ? 24 : 0;
  return textureRoleCost + harmonicCost + rootSupportCost + Math.abs(pitch - note.pitch);
}

function isHarmonicSupportPitch(pitch: number, anchor: ReturnType<typeof nearestHarmonicAnchor>): boolean {
  return (
    anchor === undefined || chordTonePitchClasses(anchor.localKey, anchor.function).includes(positiveModulo(pitch, 12))
  );
}

function isHarmonicRootSupportPitch(pitch: number, anchor: ReturnType<typeof nearestHarmonicAnchor>): boolean {
  return (
    anchor === undefined ||
    positiveModulo(pitch, 12) === scaleDegreePitchClass(rootDegreeForFunction(anchor.function), 0, anchor.localKey)
  );
}

function activeNoteAt(notes: readonly NoteEvent[], voice: Voice, tick: number): NoteEvent | undefined {
  return notes.find(
    (note) => note.voice === voice && note.startTick <= tick && tick < note.startTick + note.durationTicks,
  );
}

function canMoveDownBelowHigherAtTick(
  notes: readonly NoteEvent[],
  lowerNote: NoteEvent,
  higherNote: NoteEvent,
  tick: number,
): boolean {
  const movedPitch = lowerNote.pitch - 12;
  if (movedPitch < VOICE_RANGES[lowerNote.voice].min || movedPitch > higherNote.pitch) {
    return false;
  }
  const registerOrder: readonly Voice[] = ["soprano", "alto", "tenor", "bass"];
  const lowerVoiceIndex = registerOrder.indexOf(lowerNote.voice);
  const nextLowerVoice = registerOrder[lowerVoiceIndex + 1];
  const nextLowerNote = nextLowerVoice === undefined ? undefined : activeNoteAt(notes, nextLowerVoice, tick);
  return nextLowerNote === undefined || movedPitch >= nextLowerNote.pitch;
}

function isTextureRepairPitchAllowed(
  note: NoteEvent,
  pitch: number,
  writingProfile: WritingProfile | undefined,
): boolean {
  const range =
    writingProfile === undefined ? VOICE_RANGES[note.voice] : voiceRangeForProfile(writingProfile, note.voice);
  return (
    pitch >= range.min &&
    pitch <= range.max &&
    (writingProfile === undefined || isPitchAllowedByWritingProfile(writingProfile, pitch))
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
  if (input.freeCounterpointPhraseVariation === true) {
    repairTextureVoiceCrossings(
      notes,
      input.startTick,
      input.durationTicks,
      [input.harmonicPlan],
      input.writingProfile,
      input.writingProfile === undefined ? "legacy" : "solver",
    );
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

  const degrees = rotateContinuityDegrees(
    freeCounterpointDegreesForMode(plan.localKey.mode),
    lineIndex * 2 + (plan.freeCounterpointPhraseVariation === true ? episodeContinuityRotation(plan.harmonicPlan) : 0),
  );
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
    writingProfile: plan.writingProfile,
    preserveDurations:
      (plan.freeCounterpointPhraseVariation === true && plan.harmonicPlan?.state === "episode") ||
      plan.harmonicPlan?.meterContext.timeSignature.numerator === 3,
  });
}

function continuityFillerSubject(
  degrees: readonly number[],
  plan: ContinuityCounterpointInput,
): readonly SubjectNote[] {
  const durations =
    plan.freeCounterpointPhraseVariation === true && plan.harmonicPlan?.state === "episode"
      ? episodeContinuityDurations(plan.harmonicPlan)
      : plan.harmonicPlan?.meterContext.timeSignature.numerator === 3
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

function episodeContinuityRotation(harmonicPlan: HarmonicPlan | undefined): number {
  if (harmonicPlan?.state !== "episode") {
    return 0;
  }
  const sequenceOffset =
    harmonicPlan.sequencePattern === "circle-fifths"
      ? 2
      : harmonicPlan.sequencePattern === "descending-step"
        ? 1
        : harmonicPlan.sequencePattern === "parallel-shift"
          ? 3
          : 0;
  const transformOffset =
    harmonicPlan.fragmentTransform === "inversion" ? 2 : harmonicPlan.fragmentTransform === "contrary-motion" ? 1 : 0;
  return (
    Math.floor(harmonicPlan.startTick / Math.max(1, harmonicPlan.meterContext.measureTicks)) +
    sequenceOffset +
    transformOffset
  );
}

function episodeContinuityDurations(harmonicPlan: HarmonicPlan): readonly number[] {
  const variants: readonly (readonly number[])[] = [
    [
      TICKS_PER_QUARTER / 2,
      TICKS_PER_QUARTER,
      TICKS_PER_QUARTER / 2,
      TICKS_PER_QUARTER / 2,
      TICKS_PER_QUARTER,
      TICKS_PER_QUARTER / 2,
    ],
    [
      TICKS_PER_QUARTER,
      TICKS_PER_QUARTER / 2,
      TICKS_PER_QUARTER / 2,
      TICKS_PER_QUARTER,
      TICKS_PER_QUARTER / 2,
      TICKS_PER_QUARTER / 2,
    ],
    [
      TICKS_PER_QUARTER / 2,
      TICKS_PER_QUARTER / 2,
      TICKS_PER_QUARTER,
      TICKS_PER_QUARTER / 2,
      TICKS_PER_QUARTER,
      TICKS_PER_QUARTER / 2,
    ],
  ];
  return variants[episodeContinuityRotation(harmonicPlan) % variants.length]!;
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
        writingProfile: plan.writingProfile,
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
        writingProfile: plan.writingProfile,
      },
      degrees[index % degrees.length]!,
      startTick + elapsedTicks,
      durationTicks,
    );
    elapsedTicks += durationTicks;
    index += 1;
  }
}

export function fillAllVoiceSilenceGaps(
  notes: Exposition["notes"],
  keySignature: KeySignature,
  writingProfile?: WritingProfile,
): void {
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
      writingProfile,
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
    writingProfile?: WritingProfile;
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
        writingProfile: input.writingProfile,
      },
      degrees[index % degrees.length]!,
      input.startTick + elapsedTicks,
      durationTicks,
    );
    elapsedTicks += durationTicks;
    index += 1;
  }
}

export function addFunctionalThinningSupport(
  notes: Exposition["notes"],
  sectionPlans: readonly HarmonicPlan[],
  writingProfile?: WritingProfile,
): void {
  for (const run of findUnsupportedThinningRuns(notes, sectionPlans)) {
    const plan = sectionPlanForTick(sectionPlans, run.startTick);
    const supportVoice = functionalSupportVoice(notes, run);
    if (plan === undefined || supportVoice === undefined) {
      continue;
    }

    addFunctionalSupportForRun(notes, { run, plan, supportVoice, writingProfile });
  }

  repairTextureVoiceCrossingsForPlans(notes, sectionPlans, writingProfile);
}

export function addUnexplainedRestThinningSupport(
  notes: Exposition["notes"],
  sectionPlans: readonly HarmonicPlan[],
  writingProfile?: WritingProfile,
  policy: UnexplainedRestThinningSupportPolicy = "low-root-first",
): void {
  for (const run of findUnexplainedRestThinningRuns(notes, sectionPlans)) {
    const plan = sectionPlanForTick(sectionPlans, run.startTick);
    const supportVoices = unexplainedRestSupportVoices(notes, run, plan, policy);
    if (plan === undefined || supportVoices.length === 0) {
      continue;
    }

    for (const supportVoice of supportVoices) {
      addFunctionalSupportForRun(notes, {
        run,
        plan,
        supportVoice,
        maxNoteTicks: TICKS_PER_QUARTER * 2,
        meterAnchored: true,
        strictSemitoneAvoidance: true,
        writingProfile,
      });
    }
  }

  repairTextureVoiceCrossingsForPlans(notes, sectionPlans, writingProfile);
}

export function addSectionDensityFloorSupport(
  notes: Exposition["notes"],
  sectionPlans: readonly HarmonicPlan[],
  writingProfile?: WritingProfile,
  policy: UnexplainedRestThinningSupportPolicy = "low-root-first",
): void {
  for (const plan of sectionPlans.filter((candidate) => candidate.state !== "exposition")) {
    const sectionEndTick = plan.startTick + plan.durationTicks;
    for (let tick = plan.startTick; tick < sectionEndTick; tick += plan.meterContext.beatTicks) {
      const activeVoices = activeVoicesDuring(notes, tick, Math.min(sectionEndTick, tick + 1));
      const cadenceThinning =
        sectionEndTick - tick <= plan.meterContext.beatTicks * 2 &&
        (plan.cadenceKind === "authentic" || plan.cadenceKind === "modal" || plan.cadenceKind === "half");
      const requiredVoiceCount = cadenceThinning || hasPedalLikeRestSupport(notes, plan, tick) ? 2 : 3;
      if (activeVoices.length >= requiredVoiceCount) {
        continue;
      }
      const supportVoiceOrder =
        policy === "balanced-upper-agency" &&
        shouldPreferUpperAgencySupport(
          notes,
          { startTick: tick, endTick: Math.min(sectionEndTick, tick + 1), activeVoices },
          plan,
        )
          ? (["soprano", "alto", "tenor", "bass"] as const)
          : (["bass", "tenor", "alto", "soprano"] as const);
      const supportVoices = supportVoiceOrder
        .filter((voice) => !activeVoices.includes(voice) && activeNoteAt(notes, voice, tick) === undefined)
        .slice(0, requiredVoiceCount - activeVoices.length);
      const anchor = nearestHarmonicAnchor(tick, [plan]);
      if (anchor === undefined) {
        continue;
      }
      for (const supportVoice of supportVoices) {
        const nextStartTick = notes
          .filter((note) => note.voice === supportVoice && note.startTick > tick)
          .map((note) => note.startTick)
          .sort((left, right) => left - right)[0];
        const durationTicks = Math.min(
          plan.meterContext.beatTicks,
          sectionEndTick - tick,
          (nextStartTick ?? sectionEndTick) - tick,
        );
        const supportDegree = supportedStructuralSupportDegree({
          requestedDegree: supportStartingDegree(supportVoice, rootDegreeForFunction(anchor.function)),
          supportVoice,
          anchor,
          writingProfile,
        });
        if (supportDegree === undefined || durationTicks <= 0 || hasOverlap(notes, supportVoice, tick, durationTicks)) {
          continue;
        }
        addTextureNote(
          notes,
          {
            voice: supportVoice,
            localKey: anchor.localKey,
            velocity: 48,
            role: "free-counterpoint",
            harmonicPlan: plan,
            metricalHarmonyIntent:
              supportVoice === "bass" &&
              positiveModulo(supportDegree, 7) === positiveModulo(rootDegreeForFunction(anchor.function), 7)
                ? "structural-root-support"
                : "structural-chord-tone",
            strictSemitoneAvoidance: true,
            writingProfile,
          },
          supportDegree,
          tick,
          durationTicks,
        );
      }
    }
  }
  repairTextureVoiceCrossingsForPlans(notes, sectionPlans, writingProfile);
}

export function addBassAnswerTailTextureSupport(
  notes: Exposition["notes"],
  subjectEntries: readonly PlannedEntry[],
  sectionPlans: readonly HarmonicPlan[],
  writingProfile?: WritingProfile,
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
        writingProfile,
      });
    }
  }

  repairTextureVoiceCrossingsForNotes(notes, sectionPlans, writingProfile);
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
  writingProfile?: WritingProfile,
): void {
  for (const run of findPostEntryThinSupportRuns(notes, subjectEntries)) {
    const plan = sectionPlanForTick(sectionPlans, run.startTick);
    const supportVoice = postEntrySupportVoice(notes, run);
    if (plan === undefined || supportVoice === undefined) {
      continue;
    }

    addFunctionalSupportForRun(notes, { run, plan, supportVoice, writingProfile });
  }

  repairTextureVoiceCrossingsForPlans(notes, sectionPlans, writingProfile);
}

export function addEntryWindowContinuitySupport(
  notes: Exposition["notes"],
  subjectEntries: readonly PlannedEntry[],
  sectionPlans: readonly HarmonicPlan[],
  writingProfile?: WritingProfile,
  policy: {
    voiceOrder?: readonly Voice[];
    lineKind?: ContinuityLineKind;
    preferHeldSupport?: boolean;
  } = {},
): void {
  for (const run of findImportantEntryTailSupportRuns(notes, subjectEntries)) {
    const plan =
      sectionPlanForTick(sectionPlans, run.startTick) ?? sectionPlanForTick(sectionPlans, run.entryStartTick);
    if (plan === undefined) {
      continue;
    }
    const supportVoices = entryWindowSupportVoices(notes, run, policy.voiceOrder);
    if (supportVoices.length === 0) {
      continue;
    }
    const heldSupportVoices = policy.preferHeldSupport
      ? extendEntryWindowHeldSupport(notes, supportVoices, run.startTick, run.endTick)
      : [];
    const addedSupportVoices = supportVoices.filter((voice) => !heldSupportVoices.includes(voice));
    if (addedSupportVoices.length === 0) {
      continue;
    }

    addContinuityCounterpoint(notes, {
      startTick: run.startTick,
      durationTicks: run.endTick - run.startTick,
      localKey: plan.targetKey,
      harmonicPlan: plan,
      maxVoiceCount: addedSupportVoices.length,
      voiceOrder: addedSupportVoices,
      lineKind:
        policy.lineKind ?? (shouldUseObliqueEntryWindowSupport(plan, run.startTick) ? "oblique-support" : "linear"),
      writingProfile,
    });
  }

  repairTextureVoiceCrossingsForPlans(notes, sectionPlans, writingProfile);
}

function extendEntryWindowHeldSupport(
  notes: Exposition["notes"],
  supportVoices: readonly Voice[],
  startTick: number,
  endTick: number,
): Voice[] {
  const heldVoices: Voice[] = [];
  for (const voice of supportVoices) {
    const carriedNote = notes
      .filter((note) => note.voice === voice && note.startTick + note.durationTicks === startTick)
      .sort(compareNoteEvents)
      .at(-1);
    if (carriedNote === undefined) {
      continue;
    }
    carriedNote.durationTicks = endTick - carriedNote.startTick;
    heldVoices.push(voice);
  }
  return heldVoices;
}

export function addPlannedEntryPreparationSupport(
  notes: Exposition["notes"],
  subjectEntries: readonly PlannedEntry[],
  sectionPlans: readonly HarmonicPlan[],
  policy: UnexplainedRestThinningSupportPolicy,
  writingProfile?: WritingProfile,
): void {
  for (const entry of subjectEntries) {
    const plan = sectionPlanForTick(sectionPlans, entry.startTick);
    if (
      plan === undefined ||
      entry.state === "exposition" ||
      entry.startTick % plan.meterContext.measureTicks === 0 ||
      hasNearbyCadenceTarget(plan, entry.startTick)
    ) {
      continue;
    }

    const nextDownbeatTick =
      entry.startTick + (plan.meterContext.measureTicks - (entry.startTick % plan.meterContext.measureTicks));
    const run = {
      startTick: entry.startTick,
      endTick: Math.min(nextDownbeatTick + plan.meterContext.beatTicks / 2, plan.startTick + plan.durationTicks),
    };
    if (run.endTick <= run.startTick || hasPreparedPlannedEntryPickup(notes, entry, nextDownbeatTick)) {
      continue;
    }

    const voiceOrder =
      policy === "balanced-upper-agency"
        ? (["soprano", "alto", "tenor", "bass"] as const)
        : (["bass", "tenor", "alto", "soprano"] as const);
    const supportVoice = voiceOrder
      .filter((voice) => voice !== entry.voice)
      .find((voice) => !hasOverlap(notes, voice, run.startTick, run.endTick - run.startTick));
    if (supportVoice === undefined) {
      continue;
    }

    const anchor = nearestHarmonicAnchor(entry.startTick, [plan]);
    const rootDegree = anchor === undefined ? 0 : rootDegreeForFunction(anchor.function);
    const supportDegrees = anchor === undefined ? [0, 2, 4] : chordScaleDegreesForFunction(anchor.function);
    const supportDegree =
      supportVoice === "bass" ? rootDegree : (supportDegrees.find((degree) => degree !== rootDegree) ?? rootDegree);
    addTextureNote(
      notes,
      {
        voice: supportVoice,
        localKey: anchor?.localKey ?? plan.targetKey,
        velocity: 50,
        role: "free-counterpoint",
        harmonicPlan: plan,
        metricalHarmonyIntent: supportVoice === "bass" ? "structural-root-support" : "structural-chord-tone",
        motivicDerivation: {
          sourceMotive: "prior-episode-figure",
          transformationKind: "rhythmic-paraphrase",
          targetFunction: "prepare-subject-return",
          sequenceDirection: "none",
          preparesNextEntry: true,
          preparesCadence: false,
        },
        strictSemitoneAvoidance: true,
        writingProfile,
      },
      supportDegree,
      run.startTick,
      run.endTick - run.startTick,
    );
  }

  repairTextureVoiceCrossingsForPlans(notes, sectionPlans, writingProfile);
}

export function staggerMechanicalVoicePairRhythms(
  notes: Exposition["notes"],
  sectionPlans: readonly HarmonicPlan[],
  rotation: number,
): number {
  const voiceOrder = VOICE_ENTRY_ORDER.map(
    (_, index) => VOICE_ENTRY_ORDER[(index + rotation) % VOICE_ENTRY_ORDER.length]!,
  );
  let changedBoundaryCount = 0;

  for (const voice of voiceOrder) {
    const voiceNotes = notes.filter((note) => note.voice === voice).sort(compareNoteEvents);
    for (let index = 0; index < voiceNotes.length - 1 && changedBoundaryCount < 4; index += 1) {
      const current = voiceNotes[index]!;
      const next = voiceNotes[index + 1]!;
      const boundaryTick = current.startTick + current.durationTicks;
      const plan = sectionPlanForTick(sectionPlans, Math.max(current.startTick, boundaryTick - 1));
      if (
        plan === undefined ||
        !isTextureRole(current.role) ||
        !isTextureRole(next.role) ||
        boundaryTick !== next.startTick ||
        current.durationTicks < TICKS_PER_QUARTER ||
        next.durationTicks < TICKS_PER_QUARTER ||
        hasNearbyCadenceTarget(plan, boundaryTick)
      ) {
        continue;
      }
      const coupled = notes.some(
        (other) =>
          other.voice !== voice &&
          other.startTick === current.startTick &&
          other.durationTicks === current.durationTicks &&
          classifyVoicePairSpan(current, other, plan, current.startTick) === "mechanical-coupling",
      );
      if (!coupled) {
        continue;
      }

      const shiftTicks = Math.min(
        plan.meterContext.beatTicks / 2,
        current.durationTicks - plan.meterContext.beatTicks / 2,
        next.durationTicks - plan.meterContext.beatTicks / 2,
      );
      if (shiftTicks <= 0) {
        continue;
      }
      const extendCurrent = (changedBoundaryCount + rotation) % 2 === 0;
      current.durationTicks += extendCurrent ? shiftTicks : -shiftTicks;
      next.startTick += extendCurrent ? shiftTicks : -shiftTicks;
      next.durationTicks += extendCurrent ? -shiftTicks : shiftTicks;
      changedBoundaryCount += 1;
    }
  }

  return changedBoundaryCount;
}

function hasPreparedPlannedEntryPickup(
  notes: readonly NoteEvent[],
  entry: PlannedEntry,
  nextDownbeatTick: number,
): boolean {
  const heldSupport = notes.some(
    (note) =>
      note.voice !== entry.voice &&
      note.startTick < entry.startTick &&
      entry.startTick < note.startTick + note.durationTicks,
  );
  const sustainedPickupVoiceCount = new Set(
    notes
      .filter((note) => note.startTick === entry.startTick && note.startTick + note.durationTicks >= nextDownbeatTick)
      .map((note) => note.voice),
  ).size;
  return heldSupport || sustainedPickupVoiceCount >= 2;
}

export function addExposedFreeCounterpointSoloSupport(
  notes: Exposition["notes"],
  sectionPlans: readonly HarmonicPlan[],
  writingProfile?: WritingProfile,
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
      writingProfile,
    });
  }

  repairTextureVoiceCrossingsForPlans(notes, sectionPlans, writingProfile);
}

export function addShortEpisodeHarmonicContinuitySupport(
  notes: Exposition["notes"],
  sectionPlans: readonly HarmonicPlan[],
  writingProfile?: WritingProfile,
): void {
  const scoreEndTick = Math.max(...notes.map((note) => note.startTick + note.durationTicks));
  const sortedPlans = [...sectionPlans].sort((left, right) => left.startTick - right.startTick);
  for (const plan of sortedPlans.filter((candidate) =>
    shouldRepairShortEpisodeHarmonicContinuity(candidate, sortedPlans),
  )) {
    for (const tick of harmonicContinuitySupportTicks(plan).filter((supportTick) => supportTick < scoreEndTick)) {
      supportHarmonicContinuityAtTick(notes, plan, tick, writingProfile);
    }
    for (const tick of harmonicContinuityRepairTicks(notes, plan).filter((supportTick) => supportTick < scoreEndTick)) {
      const anchor = nearestHarmonicAnchor(tick, [plan]);
      if (anchor !== undefined) {
        repairStructuralSupportAtTick(notes, tick, anchor, writingProfile);
      }
    }
  }

  repairTextureVoiceCrossingsForPlans(notes, sectionPlans, writingProfile);
  for (const plan of sortedPlans.filter((candidate) =>
    shouldRepairShortEpisodeHarmonicContinuity(candidate, sortedPlans),
  )) {
    for (const tick of harmonicContinuitySupportTicks(plan).filter((supportTick) => supportTick < scoreEndTick)) {
      const anchor = nearestHarmonicAnchor(tick, [plan]);
      if (anchor !== undefined) {
        supportBassRootAtTick(notes, plan, tick, anchor, writingProfile);
      }
    }
    for (const tick of harmonicContinuityRepairTicks(notes, plan).filter((supportTick) => supportTick < scoreEndTick)) {
      const anchor = nearestHarmonicAnchor(tick, [plan]);
      if (anchor !== undefined) {
        repairStructuralSupportAtTick(notes, tick, anchor, writingProfile);
      }
    }
  }
  for (const plan of sortedPlans.filter((candidate) =>
    shouldRepairShortEpisodeHarmonicContinuity(candidate, sortedPlans),
  )) {
    if (!shouldRepairStrettoEntryHandoffSupport(plan)) {
      continue;
    }
    for (const tick of harmonicContinuityRepairTicks(notes, plan).filter((supportTick) =>
      isFinalHandoffTextureCheckpoint(plan, supportTick),
    )) {
      const anchor = nearestHarmonicAnchor(tick, [plan]);
      if (anchor !== undefined) {
        supportHandoffBassRootAtTick(notes, plan, tick, anchor, writingProfile);
        repairStructuralSupportAtTick(notes, tick, anchor, writingProfile);
      }
    }
  }
  repairFocusedBassRootSupport(notes, sortedPlans, writingProfile);
}

export function addSectionStructuralAnchorSupport(
  notes: Exposition["notes"],
  sectionPlans: readonly HarmonicPlan[],
  writingProfile?: WritingProfile,
): void {
  const scoreEndTick = Math.max(...notes.map((note) => note.startTick + note.durationTicks));

  for (const plan of sectionPlans) {
    for (const anchor of plan.anchors) {
      if (
        anchor.tick < plan.startTick ||
        anchor.tick >= plan.startTick + plan.durationTicks ||
        anchor.tick >= scoreEndTick
      ) {
        continue;
      }
      if (!shouldStrengthenSectionAnchor(notes, plan, anchor)) {
        continue;
      }

      supportBassRootAtTick(notes, plan, anchor.tick, anchor, writingProfile);
      repairStructuralSupportAtTick(notes, anchor.tick, anchor, writingProfile);
      if (activeVoicesDuring(notes, anchor.tick, anchor.tick + plan.meterContext.beatTicks).length <= 2) {
        supportUpperChordToneAtTick(notes, plan, anchor.tick, anchor, writingProfile);
      }
    }
  }

  repairTextureVoiceCrossingsForPlans(notes, sectionPlans, writingProfile);
}

export function normalizeSectionStructuralSupportLabels(
  notes: Exposition["notes"],
  sectionPlans: readonly HarmonicPlan[],
  writingProfile?: WritingProfile,
): void {
  for (const plan of sectionPlans) {
    const anchors = plan.anchors
      .filter((candidate) => plan.startTick <= candidate.tick && candidate.tick < plan.startTick + plan.durationTicks)
      .sort((left, right) => left.tick - right.tick);
    for (const anchor of anchors) {
      repairStructuralSupportAtTick(notes, anchor.tick, anchor, writingProfile);
      const chordPitchClasses = chordTonePitchClasses(anchor.localKey, anchor.function);
      for (const note of notes.filter(
        (candidate) =>
          (candidate.role === "free-counterpoint" || candidate.role === "counter-subject") &&
          candidate.startTick <= anchor.tick &&
          anchor.tick < candidate.startTick + candidate.durationTicks &&
          (candidate.metricalHarmonyIntent === "structural-root-support" ||
            candidate.metricalHarmonyIntent === "structural-chord-tone") &&
          !chordPitchClasses.includes(positiveModulo(candidate.pitch, 12)),
      )) {
        const localNote = splitTextureNoteAtTick(notes, note, anchor.tick);
        const degree = pitchScaleDegree(localNote.pitch, anchor.localKey);
        localNote.metricalHarmonyIntent =
          degree === undefined
            ? "strong-non-chord-tone"
            : metricalHarmonyIntentForDegree({
                degree,
                tick: anchor.tick,
                voice: localNote.voice,
                harmonicPlan: plan,
              });
      }
    }
  }
}

function shouldStrengthenSectionAnchor(
  notes: readonly NoteEvent[],
  plan: HarmonicPlan,
  anchor: HarmonicPlan["anchors"][number],
): boolean {
  const activeNotes = notes.filter(
    (note) => note.startTick <= anchor.tick && anchor.tick < note.startTick + note.durationTicks,
  );
  const chordPitchClasses = chordTonePitchClasses(anchor.localKey, anchor.function);
  const hasChordSupport = activeNotes.some((note) => chordPitchClasses.includes(positiveModulo(note.pitch, 12)));
  const structuralSupportIsNonChord = activeNotes.some(
    (note) =>
      (note.metricalHarmonyIntent === "structural-root-support" ||
        note.metricalHarmonyIntent === "structural-chord-tone") &&
      !chordPitchClasses.includes(positiveModulo(note.pitch, 12)),
  );
  if (!hasChordSupport || structuralSupportIsNonChord) {
    return true;
  }
  if (anchor.cadenceTarget || anchor.function === "tonic" || anchor.function === "cadential-tonic") {
    const rootPitchClass = scaleDegreePitchClass(rootDegreeForFunction(anchor.function), 0, anchor.localKey);
    return !activeNotes.some((note) => positiveModulo(note.pitch, 12) === rootPitchClass);
  }
  return activeVoicesDuring(notes, anchor.tick, anchor.tick + plan.meterContext.beatTicks).length <= 2;
}

function isFinalHandoffTextureCheckpoint(plan: HarmonicPlan, tick: number): boolean {
  const handoffStartTick = plan.startTick + plan.durationTicks - plan.meterContext.measureTicks;
  return handoffStartTick <= tick && tick < plan.startTick + plan.durationTicks;
}

function shouldRepairStrettoEntryHandoffSupport(plan: HarmonicPlan & { state: "episode" }): boolean {
  return (
    plan.durationTicks <= plan.meterContext.measureTicks * 4 &&
    plan.startTick + plan.durationTicks <= STRETTO_ENTRY_HARMONY_REPAIR_MAX_START_TICKS
  );
}

function supportHandoffBassRootAtTick(
  notes: Exposition["notes"],
  plan: HarmonicPlan,
  tick: number,
  anchor: NonNullable<ReturnType<typeof nearestHarmonicAnchor>>,
  writingProfile?: WritingProfile,
): void {
  if (bassSupportsAnchorRoot(notes, tick, anchor)) {
    return;
  }

  const rootPitch = harmonicRootBassPitch(
    anchor.localKey,
    anchor.function,
    previousTextureNote(notes, "bass", tick)?.pitch,
    writingProfile,
  );
  if (rootPitch === undefined) {
    return;
  }
  const supportDuration = Math.min(TICKS_PER_QUARTER / 2, harmonicContinuitySupportDuration(notes, "bass", plan, tick));
  const activeBass = activeNoteAt(notes, "bass", tick);
  if (activeBass !== undefined && activeBass.role === "free-counterpoint") {
    const bassSupport = splitTextureNoteAtTick(notes, activeBass, tick);
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

  if (activeBass !== undefined || supportDuration <= 0) {
    return;
  }

  notes.push({
    kind: "note",
    voice: "bass",
    startTick: tick,
    durationTicks: supportDuration,
    pitch: rootPitch,
    velocity: 50,
    role: "free-counterpoint",
    metricalHarmonyIntent: "structural-root-support",
  });
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
  repairTextureVoiceCrossings(notes, startTick, endTick - startTick, sectionPlans);
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
    writingProfile?: WritingProfile;
  },
): void {
  const profile = functionalSupportProfile(notes, input);
  if (profile === undefined) {
    return;
  }
  const maxNoteTicks = functionalSupportMaxNoteTicks(input.voice, input.maxNoteTicks, input.meterAnchored);
  let elapsedTicks = 0;
  let index = 0;

  while (elapsedTicks < input.durationTicks) {
    const preferredDurationTicks = profile.durationTicks[index % profile.durationTicks.length]!;
    const durationTicks = Math.min(
      functionalSupportNoteDurationTicks({
        notes,
        voice: input.voice,
        startTick: input.startTick + elapsedTicks,
        maxNoteTicks,
        meterAnchored: input.meterAnchored,
        preferredDurationTicks,
      }),
      input.durationTicks - elapsedTicks,
    );
    const degree = profile.degrees[index % profile.degrees.length]!;
    if (!isStructuralSupportDegreeAvailable(degree, input.localKey, input.voice, input.writingProfile)) {
      return;
    }
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
        writingProfile: input.writingProfile,
      },
      degree,
      input.startTick + elapsedTicks,
      durationTicks,
    );
    elapsedTicks += durationTicks;
    index += 1;
  }
}

function isStructuralSupportDegreeAvailable(
  degree: number,
  localKey: KeySignature,
  voice: Voice,
  writingProfile: WritingProfile | undefined,
): boolean {
  if (writingProfile === undefined) {
    return true;
  }

  const pitchClass = scaleDegreePitchClass(degree, 0, localKey);
  return voicePitchDomain(writingProfile, voice, pitchClass).length > 0;
}

function functionalSupportNoteDurationTicks(input: {
  notes: readonly NoteEvent[];
  voice: Voice;
  startTick: number;
  maxNoteTicks: number;
  meterAnchored: boolean | undefined;
  preferredDurationTicks: number;
}): number {
  if (input.voice !== "bass") {
    const fallbackDurations =
      input.meterAnchored === true
        ? [TICKS_PER_QUARTER, TICKS_PER_QUARTER / 2]
        : [input.maxNoteTicks, TICKS_PER_QUARTER / 2];
    const candidates = uniqueDurations([
      Math.min(input.preferredDurationTicks, input.maxNoteTicks),
      ...fallbackDurations,
    ])
      .filter((durationTicks) => durationTicks <= input.maxNoteTicks)
      .filter((durationTicks) => durationTicks >= TICKS_PER_QUARTER / 2);
    return (
      candidates.find(
        (durationTicks) => !hasExactRhythmAtStart(input.notes, input.voice, input.startTick, durationTicks),
      ) ?? Math.min(input.maxNoteTicks, TICKS_PER_QUARTER / 2)
    );
  }
  return Math.max(TICKS_PER_QUARTER / 2, Math.min(input.preferredDurationTicks, input.maxNoteTicks));
}

function uniqueDurations(durationTicks: readonly number[]): number[] {
  return [...new Set(durationTicks.map((duration) => Math.max(1, Math.floor(duration))))];
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
    writingProfile?: WritingProfile;
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
    writingProfile: input.writingProfile,
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

function supportHarmonicContinuityAtTick(
  notes: Exposition["notes"],
  plan: HarmonicPlan,
  tick: number,
  writingProfile?: WritingProfile,
): void {
  const anchor = nearestHarmonicAnchor(tick, [plan]);
  if (anchor === undefined) {
    return;
  }

  supportBassRootAtTick(notes, plan, tick, anchor, writingProfile);
  repairStructuralSupportAtTick(notes, tick, anchor, writingProfile);
  if (activeVoicesDuring(notes, tick, tick + plan.meterContext.beatTicks).length <= 2) {
    supportUpperChordToneAtTick(notes, plan, tick, anchor, writingProfile);
  }
}

function repairStructuralSupportAtTick(
  notes: Exposition["notes"],
  tick: number,
  anchor: NonNullable<ReturnType<typeof nearestHarmonicAnchor>>,
  writingProfile?: WritingProfile,
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

    const repairedPitch = nearestStructuralSupportPitch(notes, note, expectedPitchClasses, tick, writingProfile);
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
  writingProfile?: WritingProfile,
): number | undefined {
  const candidates = structuralSupportPitchCandidates(note.voice, pitchClasses, writingProfile).filter((pitch) =>
    keepsAdjacentVoiceOrder(notes, note, pitch),
  );
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

function structuralSupportPitchCandidates(
  voice: Voice,
  pitchClasses: readonly number[],
  writingProfile?: WritingProfile,
): number[] {
  if (writingProfile !== undefined) {
    return [...new Set(pitchClasses.flatMap((pitchClass) => voicePitchDomain(writingProfile, voice, pitchClass)))].sort(
      (left, right) => left - right,
    );
  }

  const range = VOICE_RANGES[voice];
  return Array.from({ length: range.max - range.min + 1 }, (_, index) => range.min + index).filter((pitch) =>
    pitchClasses.includes(positiveModulo(pitch, 12)),
  );
}

function supportBassRootAtTick(
  notes: Exposition["notes"],
  plan: HarmonicPlan,
  tick: number,
  anchor: NonNullable<ReturnType<typeof nearestHarmonicAnchor>>,
  writingProfile?: WritingProfile,
): void {
  if (bassSupportsAnchorRoot(notes, tick, anchor)) {
    return;
  }

  const rootPitch = harmonicRootBassPitch(
    anchor.localKey,
    anchor.function,
    previousTextureNote(notes, "bass", tick)?.pitch,
    writingProfile,
  );
  if (rootPitch === undefined) {
    return;
  }
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

function repairFocusedBassRootSupport(
  notes: Exposition["notes"],
  sectionPlans: readonly HarmonicPlan[],
  writingProfile?: WritingProfile,
): void {
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

    note.pitch =
      harmonicRootBassPitch(
        anchor.localKey,
        anchor.function,
        previousTextureNote(notes, "bass", note.startTick)?.pitch,
        writingProfile,
      ) ?? note.pitch;
  }
}

function supportUpperChordToneAtTick(
  notes: Exposition["notes"],
  plan: HarmonicPlan,
  tick: number,
  anchor: NonNullable<ReturnType<typeof nearestHarmonicAnchor>>,
  writingProfile?: WritingProfile,
): void {
  const supportVoice = (["tenor", "alto", "soprano"] as const).find(
    (voice) => activeNoteAt(notes, voice, tick) === undefined,
  );
  if (supportVoice === undefined) {
    return;
  }
  const supportDegree = supportedStructuralSupportDegree({
    requestedDegree: motivicChordSupportDegree(notes, plan, tick, supportVoice, anchor),
    supportVoice,
    anchor,
    writingProfile,
  });
  const supportDuration = motivicChordSupportDuration(notes, tick, supportVoice, plan);
  if (supportDegree === undefined || supportDuration === undefined) {
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
      writingProfile,
    },
    supportDegree,
    tick,
    supportDuration,
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

function supportedStructuralSupportDegree(input: {
  requestedDegree: number | undefined;
  supportVoice: Voice;
  anchor: NonNullable<ReturnType<typeof nearestHarmonicAnchor>>;
  writingProfile?: WritingProfile;
}): number | undefined {
  const chordDegrees = chordScaleDegreesForFunction(input.anchor.function);
  const requestedDegree =
    input.requestedDegree === undefined
      ? undefined
      : chordDegrees.find((degree) => positiveModulo(degree - input.requestedDegree!, 7) === 0);
  const degrees = requestedDegree === undefined ? chordDegrees : [requestedDegree, ...chordDegrees];

  for (const degree of degrees) {
    const pitchClass = scaleDegreePitchClass(degree, 0, input.anchor.localKey);
    if (
      input.writingProfile === undefined ||
      voicePitchDomain(input.writingProfile, input.supportVoice, pitchClass).length > 0
    ) {
      return degree;
    }
  }

  return undefined;
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

  const nextVoiceStartTick = notes
    .filter((note) => note.voice === voice && note.startTick > tick)
    .map((note) => note.startTick)
    .sort((left, right) => left - right)[0];
  const supportDuration = Math.max(
    harmonicContinuitySupportDuration(notes, voice, plan, tick),
    Math.min(
      plan.meterContext.beatTicks,
      plan.startTick + plan.durationTicks - tick,
      (nextVoiceStartTick ?? Number.POSITIVE_INFINITY) - tick,
    ),
  );
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
  writingProfile?: WritingProfile,
): number | undefined {
  const rootPitchClass = scaleDegreePitchClass(rootDegreeForFunction(harmonicFunction), 0, localKey);
  if (writingProfile !== undefined && voicePitchDomain(writingProfile, "bass", rootPitchClass).length === 0) {
    return undefined;
  }
  return previousPitch === undefined
    ? writingProfile === undefined
      ? placePitchInRegister(rootPitchClass, "bass", VOICE_REGISTER_TARGETS.bass)
      : placePitchInWritingProfile(
          rootPitchClass,
          "bass",
          registerTargetForVoice(writingProfile, "bass"),
          writingProfile,
        )
    : fitPitchNearPrevious(rootPitchClass, "bass", previousPitch, writingProfile);
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

function repairTextureVoiceCrossingsForPlans(
  notes: Exposition["notes"],
  sectionPlans: readonly HarmonicPlan[],
  writingProfile?: WritingProfile,
): void {
  repairTextureVoiceCrossings(
    notes,
    Math.min(...sectionPlans.map((plan) => plan.startTick)),
    Math.max(...sectionPlans.map((plan) => plan.startTick + plan.durationTicks)),
    sectionPlans,
    writingProfile,
    writingProfile === undefined ? "legacy" : "solver",
  );
}

export function repairTextureVoiceCrossingsForNotes(
  notes: Exposition["notes"],
  sectionPlans: readonly HarmonicPlan[],
  writingProfile?: WritingProfile,
): void {
  const startTick = Math.min(...sectionPlans.map((plan) => plan.startTick), ...notes.map((note) => note.startTick));
  const endTick = Math.max(
    ...sectionPlans.map((plan) => plan.startTick + plan.durationTicks),
    ...notes.map((note) => note.startTick + note.durationTicks),
  );
  repairTextureVoiceCrossings(notes, startTick, endTick - startTick, sectionPlans, writingProfile, "solver");
  if (writingProfile !== undefined) {
    repairProfileVoiceOrderBySearch(notes, startTick, endTick, writingProfile);
    if (usesConstrainedSopranoContourProfile(writingProfile)) {
      relaxHighRegisterSopranoSupportLeaps(notes, sectionPlans, writingProfile);
    }
  }
}

function usesConstrainedSopranoContourProfile(writingProfile: WritingProfile): boolean {
  return writingProfile.playability?.kind === "music-box";
}

function relaxHighRegisterSopranoSupportLeaps(
  notes: Exposition["notes"],
  sectionPlans: readonly HarmonicPlan[],
  writingProfile: WritingProfile,
): void {
  const threshold = Math.min(
    voiceRangeForProfile(writingProfile, "soprano").max,
    registerTargetForVoice(writingProfile, "soprano") + 9,
  );
  const sopranoSupportNotes = notes
    .filter(
      (note) =>
        note.voice === "soprano" &&
        (note.role === "free-counterpoint" || note.role === "counter-subject") &&
        note.pitch >= threshold,
    )
    .sort(compareNoteEvents);

  for (const note of sopranoSupportNotes) {
    const previous = previousTextureNoteBefore(notes, note);
    if (previous === undefined || Math.abs(note.pitch - previous.pitch) < 7) {
      continue;
    }
    const replacement = highRegisterSopranoReplacementPitch(notes, note, sectionPlans, writingProfile, threshold);
    if (replacement !== undefined) {
      note.pitch = replacement;
    }
  }
}

function highRegisterSopranoReplacementPitch(
  notes: readonly NoteEvent[],
  note: NoteEvent,
  sectionPlans: readonly HarmonicPlan[],
  writingProfile: WritingProfile,
  threshold: number,
): number | undefined {
  const plan = sectionPlanForTick(sectionPlans, note.startTick);
  const anchor = plan === undefined ? undefined : nearestHarmonicAnchor(note.startTick, [plan]);
  const chordTonePitchClassesAtTick =
    anchor === undefined ? undefined : chordTonePitchClasses(anchor.localKey, anchor.function);
  const candidates = writingProfile.absolutePitchSet
    .filter((candidatePitch) => candidatePitch < threshold)
    .filter((candidatePitch) => candidatePitch >= voiceRangeForProfile(writingProfile, note.voice).min)
    .filter((candidatePitch) => keepsAdjacentVoiceOrder(notes, note, candidatePitch))
    .filter((candidatePitch) => !createsSemitoneAtTick(notes, note.voice, note.startTick, candidatePitch))
    .filter((candidatePitch) => !createsPitchClassUnisonAtTick(notes, note.voice, note.startTick, candidatePitch));
  const harmonicCandidates =
    chordTonePitchClassesAtTick === undefined
      ? candidates
      : candidates.filter((candidatePitch) => chordTonePitchClassesAtTick.includes(positiveModulo(candidatePitch, 12)));
  const viableCandidates = harmonicCandidates.length > 0 ? harmonicCandidates : candidates;
  const previous = previousTextureNoteBefore(notes, note);

  return [...viableCandidates].sort(
    (left, right) =>
      Math.abs(left - (previous?.pitch ?? note.pitch)) - Math.abs(right - (previous?.pitch ?? note.pitch)) ||
      Math.abs(left - note.pitch) - Math.abs(right - note.pitch) ||
      left - right,
  )[0];
}

function previousTextureNoteBefore(notes: readonly NoteEvent[], note: NoteEvent): NoteEvent | undefined {
  return notes
    .filter((candidate) => candidate !== note && candidate.voice === note.voice && candidate.startTick < note.startTick)
    .sort(compareNoteEvents)
    .at(-1);
}

function repairProfileVoiceOrderBySearch(
  notes: Exposition["notes"],
  startTick: number,
  endTick: number,
  writingProfile: WritingProfile,
): void {
  const checkpoints = [
    ...new Set(notes.flatMap((note) => [note.startTick, note.startTick + note.durationTicks])),
  ].filter((tick) => startTick <= tick && tick < endTick);

  for (let pass = 0; pass < 6; pass += 1) {
    let improved = false;
    for (const tick of checkpoints) {
      if (!hasAdjacentVoiceCrossingAtTick(notes, tick)) {
        continue;
      }
      const beforeCrossings = countAdjacentVoiceCrossings(notes, startTick, endTick);
      const repair = chooseGlobalVoiceOrderStackRepair(
        notes,
        tick,
        writingProfile,
        beforeCrossings,
        startTick,
        endTick,
      );
      if (repair === undefined) {
        continue;
      }
      for (const { note, pitch } of repair) {
        note.pitch = pitch;
      }
      improved = true;
    }
    if (!improved) {
      break;
    }
  }
}

function chooseGlobalVoiceOrderStackRepair(
  notes: Exposition["notes"],
  tick: number,
  writingProfile: WritingProfile,
  currentCrossings: number,
  startTick: number,
  endTick: number,
): Array<{ note: NoteEvent; pitch: number }> | undefined {
  const activeAtTick = (["soprano", "alto", "tenor", "bass"] as const)
    .map((voice) => activeNoteAt(notes, voice, tick))
    .filter((note): note is NoteEvent => note !== undefined);
  const active = relatedVoiceOrderNotes(notes, activeAtTick);
  const domains = active.map((note) => ({
    note,
    pitches: [...voicePitchOrderRepairDomain(note, writingProfile)]
      .sort((left, right) => Math.abs(left - note.pitch) - Math.abs(right - note.pitch) || left - right)
      .slice(0, note.role === "free-counterpoint" ? 6 : 3),
  }));
  if (domains.some((domain) => domain.pitches.length === 0) || domains.length > 8) {
    return undefined;
  }
  const crossingStacks = voiceOrderCrossingStacks(notes, startTick, endTick);

  let best:
    | {
        repairs: Array<{ note: NoteEvent; pitch: number }>;
        crossingCount: number;
        cost: number;
      }
    | undefined;
  const search = (index: number, selected: Array<{ note: NoteEvent; pitch: number }>): void => {
    if (index >= domains.length) {
      const repairs = selected.filter(({ note, pitch }) => note.pitch !== pitch);
      if (repairs.length === 0) {
        return;
      }
      const oldPitches = repairs.map(({ note }) => note.pitch);
      for (const { note, pitch } of repairs) {
        note.pitch = pitch;
      }
      const crossingCount = countAdjacentVoiceCrossingsInStacks(crossingStacks);
      repairs.forEach(({ note }, repairIndex) => {
        note.pitch = oldPitches[repairIndex]!;
      });
      if (crossingCount >= currentCrossings) {
        return;
      }
      const cost = selected.reduce(
        (sum, { note, pitch }) =>
          sum +
          Math.abs(note.pitch - pitch) +
          voiceOrderRepairRoleCost(note.role) +
          voiceOrderRepairPitchCost(note, pitch, writingProfile),
        0,
      );
      if (
        best === undefined ||
        crossingCount < best.crossingCount ||
        (crossingCount === best.crossingCount && cost < best.cost)
      ) {
        best = { repairs, crossingCount, cost };
      }
      return;
    }

    const domain = domains[index]!;
    for (const pitch of domain.pitches) {
      search(index + 1, [...selected, { note: domain.note, pitch }]);
    }
  };

  search(0, []);
  return best?.repairs;
}

function voicePitchOrderRepairDomain(note: NoteEvent, writingProfile: WritingProfile): readonly number[] {
  if (note.role === "free-counterpoint") {
    return voicePitchDomain(writingProfile, note.voice);
  }
  return voicePitchDomain(writingProfile, note.voice, positiveModulo(note.pitch, 12));
}

function relatedVoiceOrderNotes(notes: readonly NoteEvent[], activeAtTick: readonly NoteEvent[]): NoteEvent[] {
  const related = new Set<NoteEvent>(activeAtTick);
  const checkpoints = [...new Set(notes.flatMap((note) => [note.startTick, note.startTick + note.durationTicks]))];
  const activeByCheckpoint = new Map<number, Map<Voice, NoteEvent>>();
  for (const note of activeAtTick) {
    for (const checkpoint of checkpoints) {
      if (checkpoint < note.startTick || checkpoint >= note.startTick + note.durationTicks) {
        continue;
      }
      let activeNotes = activeByCheckpoint.get(checkpoint);
      if (activeNotes === undefined) {
        activeNotes = activeNotesByVoiceAt(notes, checkpoint);
        activeByCheckpoint.set(checkpoint, activeNotes);
      }
      for (const active of activeNotes.values()) {
        related.add(active);
      }
    }
  }
  return [...related].sort(compareNoteEvents);
}

function countAdjacentVoiceCrossings(notes: readonly NoteEvent[], startTick: number, endTick: number): number {
  return countAdjacentVoiceCrossingsInStacks(voiceOrderCrossingStacks(notes, startTick, endTick));
}

function voiceOrderCrossingStacks(
  notes: readonly NoteEvent[],
  startTick: number,
  endTick: number,
): Map<Voice, NoteEvent>[] {
  const checkpoints = [
    ...new Set(notes.flatMap((note) => [note.startTick, note.startTick + note.durationTicks])),
  ].filter((tick) => startTick <= tick && tick < endTick);
  return checkpoints.map((tick) => activeNotesByVoiceAt(notes, tick));
}

function countAdjacentVoiceCrossingsInStacks(stacks: readonly ReadonlyMap<Voice, NoteEvent>[]): number {
  let crossings = 0;
  for (const active of stacks) {
    crossings += Number(isCrossed(active.get("soprano"), active.get("alto")));
    crossings += Number(isCrossed(active.get("alto"), active.get("tenor")));
    crossings += Number(isCrossed(active.get("tenor"), active.get("bass")));
  }
  return crossings;
}

function activeNotesByVoiceAt(notes: readonly NoteEvent[], tick: number): Map<Voice, NoteEvent> {
  const active = new Map<Voice, NoteEvent>();
  for (const note of notes) {
    if (!active.has(note.voice) && note.startTick <= tick && tick < note.startTick + note.durationTicks) {
      active.set(note.voice, note);
    }
  }
  return active;
}

function isCrossed(higherNote: NoteEvent | undefined, lowerNote: NoteEvent | undefined): boolean {
  return higherNote !== undefined && lowerNote !== undefined && higherNote.pitch < lowerNote.pitch;
}

function functionalSupportProfile(
  notes: readonly NoteEvent[],
  input: {
    voice: Voice;
    localKey: KeySignature;
    harmonicPlan: HarmonicPlan;
    rootDegree: number;
    startTick: number;
    durationTicks: number;
    maxNoteTicks?: number;
    meterAnchored?: boolean;
  },
): FunctionalSupportProfile | undefined {
  const motif = recentMotivicNotes(notes, input.startTick);
  const degrees = derivedMotivicSupportDegrees(motif, {
    voice: input.voice,
    localKey: input.localKey,
    harmonicPlan: input.harmonicPlan,
    rootDegree: input.rootDegree,
  });
  const fallbackDegrees = [
    supportStartingDegree(input.voice, input.rootDegree),
    input.rootDegree + 4,
    input.rootDegree + 2,
  ];

  return {
    degrees: degrees ?? fallbackDegrees,
    durationTicks: motifDurationPattern(motif, input),
  };
}

function shouldUseDerivedMotivicSupport(harmonicPlan: HarmonicPlan): boolean {
  return (
    harmonicPlan.state === "episode" &&
    (harmonicPlan.ambiguityIntent === "pivot-harmony" ||
      harmonicPlan.startTick <= TICKS_PER_QUARTER * 24 ||
      harmonicPlan.fragmentTransform !== undefined ||
      harmonicPlan.sequencePattern !== undefined)
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

function motifDurationPattern(
  motif: readonly NoteEvent[],
  input: {
    voice: Voice;
    harmonicPlan: HarmonicPlan;
    startTick: number;
    maxNoteTicks?: number;
    meterAnchored?: boolean;
  },
): readonly number[] {
  const maxNoteTicks = functionalSupportMaxNoteTicks(input.voice, input.maxNoteTicks, input.meterAnchored);
  const fallbackTicks = harmonicContinuitySupportDuration([], input.voice, input.harmonicPlan, input.startTick);
  const durations = motif
    .map((note) => Math.min(note.durationTicks, maxNoteTicks))
    .filter((durationTicks) => durationTicks >= TICKS_PER_QUARTER / 2);
  if (durations.length === 0) {
    return [Math.min(maxNoteTicks, fallbackTicks)];
  }
  if (isRepeatedShortDurationPattern(durations)) {
    const rotatedLongerTicks = Math.min(maxNoteTicks, Math.max(TICKS_PER_QUARTER, fallbackTicks));
    return Math.floor(input.harmonicPlan.startTick / Math.max(1, input.harmonicPlan.meterContext.measureTicks)) % 2 ===
      0
      ? [TICKS_PER_QUARTER / 2, rotatedLongerTicks, TICKS_PER_QUARTER / 2, Math.min(maxNoteTicks, fallbackTicks)]
      : [rotatedLongerTicks, TICKS_PER_QUARTER / 2, Math.min(maxNoteTicks, fallbackTicks), TICKS_PER_QUARTER / 2];
  }
  return durations;
}

function isRepeatedShortDurationPattern(durations: readonly number[]): boolean {
  return (
    durations.length >= 4 && durations.slice(0, 4).every((durationTicks) => durationTicks <= TICKS_PER_QUARTER / 2)
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
  if (isRepeatedStepwiseFormula(singableIntervals)) {
    const rotation = Math.floor(harmonicPlan.startTick / Math.max(1, harmonicPlan.meterContext.measureTicks)) % 3;
    if (rotation === 1) {
      return singableIntervals.map((interval, index) => (index % 3 === 1 ? -interval : interval));
    }
    if (rotation === 2) {
      return singableIntervals.map((interval, index) => (index % 3 === 2 ? 0 : interval));
    }
  }
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

function isRepeatedStepwiseFormula(intervals: readonly number[]): boolean {
  const nonZero = intervals.filter((interval) => interval !== 0);
  if (nonZero.length < 5) {
    return false;
  }
  return nonZero.every((interval) => Math.abs(interval) === 1 && Math.sign(interval) === Math.sign(nonZero[0]!));
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

function findUnexplainedRestThinningRuns(
  notes: readonly NoteEvent[],
  sectionPlans: readonly HarmonicPlan[],
): { startTick: number; endTick: number; activeVoices: readonly Voice[] }[] {
  const scoreStartTick = Math.min(...notes.map((note) => note.startTick));
  const scoreEndTick = Math.max(...notes.map((note) => note.startTick + note.durationTicks));
  const stepTicks = TICKS_PER_QUARTER / 2;
  const runs: { startTick: number; endTick: number; activeVoices: readonly Voice[] }[] = [];
  let currentRun: { startTick: number; endTick: number; activeVoices: readonly Voice[] } | undefined;

  for (let startTick = scoreStartTick; startTick < scoreEndTick; startTick += stepTicks) {
    const endTick = Math.min(scoreEndTick, startTick + stepTicks);
    const activeVoices = activeVoicesDuring(notes, startTick, endTick);
    const plan = sectionPlanForTick(sectionPlans, startTick);

    if (isUnexplainedRestThinningSegment({ activeVoices, startTick, plan, notes })) {
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

function findImportantEntryTailSupportRuns(
  notes: readonly NoteEvent[],
  subjectEntries: readonly PlannedEntry[],
): { startTick: number; endTick: number; entryVoice: Voice; entryStartTick: number; alreadyEnteredVoices: Voice[] }[] {
  const contexts = buildEntryTailSupportContexts(notes, subjectEntries);
  return contexts.flatMap((context) => importantEntryTailSupportRunsForEntry(notes, context));
}

function importantEntryTailSupportRunsForEntry(
  notes: readonly NoteEvent[],
  context: EntryTailSupportContext,
): { startTick: number; endTick: number; entryVoice: Voice; entryStartTick: number; alreadyEnteredVoices: Voice[] }[] {
  const entryEndTick = importantEntryEndTick(notes, context.entry);
  const scanEndTick = entryEndTick + TICKS_PER_QUARTER * 4;
  const stepTicks = TICKS_PER_QUARTER / 2;
  const runs: {
    startTick: number;
    endTick: number;
    entryVoice: Voice;
    entryStartTick: number;
    alreadyEnteredVoices: Voice[];
    outsideVoiceSignature: string;
  }[] = [];
  let currentRun:
    | {
        startTick: number;
        endTick: number;
        entryVoice: Voice;
        entryStartTick: number;
        alreadyEnteredVoices: Voice[];
        outsideVoiceSignature: string;
      }
    | undefined;

  if (scanEndTick <= context.entry.startTick) {
    return [];
  }

  for (let tick = context.entry.startTick; tick < scanEndTick; tick += stepTicks) {
    const segmentEndTick = Math.min(scanEndTick, tick + stepTicks);
    if (isThinImportantEntryTailSegment(notes, context, tick, segmentEndTick)) {
      const outsideVoiceSignature = context.alreadyEnteredVoices
        .filter((voice) =>
          notes.some(
            (note) =>
              note.voice === voice && note.startTick < segmentEndTick && tick < note.startTick + note.durationTicks,
          ),
        )
        .join(">");
      if (currentRun?.endTick === tick && currentRun.outsideVoiceSignature === outsideVoiceSignature) {
        currentRun.endTick = segmentEndTick;
      } else {
        if (currentRun !== undefined) {
          runs.push(currentRun);
        }
        currentRun = {
          startTick: tick,
          endTick: segmentEndTick,
          entryVoice: context.entry.voice,
          entryStartTick: context.entry.startTick,
          alreadyEnteredVoices: context.alreadyEnteredVoices,
          outsideVoiceSignature,
        };
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

function isThinImportantEntryTailSegment(
  notes: readonly NoteEvent[],
  context: EntryTailSupportContext,
  startTick: number,
  endTick: number,
): boolean {
  const entryVoiceActive = notes.some(
    (note) =>
      note.voice === context.entry.voice && note.startTick < endTick && startTick < note.startTick + note.durationTicks,
  );
  const outsideVoiceCount = context.alreadyEnteredVoices.filter(
    (voice) =>
      voice !== context.entry.voice &&
      notes.some(
        (note) => note.voice === voice && note.startTick < endTick && startTick < note.startTick + note.durationTicks,
      ),
  ).length;

  return entryVoiceActive && outsideVoiceCount <= 1;
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

function isUnexplainedRestThinningSegment(input: {
  activeVoices: readonly Voice[];
  startTick: number;
  plan: HarmonicPlan | undefined;
  notes: readonly NoteEvent[];
}): boolean {
  const { activeVoices, startTick, plan, notes } = input;
  return (
    plan !== undefined &&
    plan.state !== "exposition" &&
    activeVoices.length > 0 &&
    activeVoices.length < 3 &&
    sectionStartDistance(plan, startTick) > TICKS_PER_QUARTER / 2 &&
    sectionEndDistance(plan, startTick) > TICKS_PER_QUARTER / 2 &&
    !hasPedalLikeRestSupport(notes, plan, startTick)
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

function hasPedalLikeRestSupport(notes: readonly NoteEvent[], plan: HarmonicPlan, tick: number): boolean {
  const anchor = plan.anchors
    .map((candidate) => ({ anchor: candidate, distance: Math.abs(candidate.tick - tick) }))
    .sort((left, right) => left.distance - right.distance)[0]?.anchor;
  if (anchor === undefined) {
    return false;
  }
  const rootPitchClass = scaleDegreePitchClass(rootDegreeForFunction(anchor.function), 0, anchor.localKey);
  return notes.some(
    (note) =>
      (note.voice === "bass" || note.voice === "tenor") &&
      note.startTick <= tick &&
      tick < note.startTick + note.durationTicks &&
      note.durationTicks >= plan.meterContext.beatTicks * 2 &&
      positiveModulo(note.pitch, 12) === rootPitchClass,
  );
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

type EntryTailSupportContext = {
  entry: PlannedEntry;
  entryOrderIndex: number;
  alreadyEnteredVoices: Voice[];
};

function buildEntryTailSupportContexts(
  notes: readonly NoteEvent[],
  subjectEntries: readonly PlannedEntry[],
): EntryTailSupportContext[] {
  const importantEntries = [...subjectEntries].sort((left, right) => left.startTick - right.startTick);

  return importantEntries
    .map((entry, entryOrderIndex) => {
      const previousEntryVoices = importantEntries
        .slice(0, entryOrderIndex)
        .filter((candidate) => candidate.startTick < entry.startTick)
        .map((candidate) => candidate.voice);
      const previousNoteVoices = notes.filter((note) => note.startTick < entry.startTick).map((note) => note.voice);

      return {
        entry,
        entryOrderIndex,
        alreadyEnteredVoices: uniqueVoices([...previousEntryVoices, ...previousNoteVoices]).filter(
          (voice) => voice !== entry.voice,
        ),
      };
    })
    .filter(isReviewedImportantEntryTailSupportContext);
}

function isReviewedImportantEntryTailSupportContext(context: EntryTailSupportContext): boolean {
  return (
    context.alreadyEnteredVoices.length > 0 &&
    (context.entry.form !== "subject-fragment" || context.entry.state === "episode")
  );
}

function importantEntryEndTick(notes: readonly NoteEvent[], entry: PlannedEntry): number {
  const role = noteRoleForEntryForm(entry.form);
  const entryNotes = notes.filter(
    (note) =>
      note.voice === entry.voice &&
      note.role === role &&
      entry.startTick <= note.startTick &&
      note.startTick < entry.startTick + TICKS_PER_QUARTER * 8,
  );
  return Math.max(entry.startTick, ...entryNotes.map((note) => note.startTick + note.durationTicks));
}

function noteRoleForEntryForm(form: EntryForm): NoteEvent["role"] {
  if (form === "answer") {
    return "answer";
  }
  if (form === "subject-fragment") {
    return "subject-fragment";
  }
  return "subject";
}

function entryWindowSupportVoices(
  notes: readonly NoteEvent[],
  run: { startTick: number; endTick: number; entryVoice: Voice; alreadyEnteredVoices: readonly Voice[] },
  preferredVoiceOrder: readonly Voice[] = VOICE_ENTRY_ORDER,
): Voice[] {
  const outsideVoiceCount = run.alreadyEnteredVoices.filter((voice) =>
    notes.some(
      (note) =>
        note.voice === voice && note.startTick < run.endTick && run.startTick < note.startTick + note.durationTicks,
    ),
  ).length;
  const requiredSupportCount = Math.max(0, 2 - outsideVoiceCount);
  return uniqueVoiceOrder([...preferredVoiceOrder, ...VOICE_ENTRY_ORDER])
    .filter((voice) => voice !== run.entryVoice)
    .filter((voice) => !hasOverlap(notes, voice, run.startTick, run.endTick - run.startTick))
    .slice(0, requiredSupportCount);
}

function shouldUseObliqueEntryWindowSupport(plan: HarmonicPlan, tick: number): boolean {
  return (
    beatStrengthAtTick(tick, plan.meterContext) === "strong" ||
    plan.anchors.some((anchor) => Math.abs(anchor.tick - tick) <= plan.meterContext.beatTicks / 2)
  );
}

function uniqueVoices(voices: readonly Voice[]): Voice[] {
  return VOICE_ENTRY_ORDER.filter((voice) => voices.includes(voice));
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

function unexplainedRestSupportVoices(
  notes: readonly NoteEvent[],
  run: { startTick: number; endTick: number; activeVoices: readonly Voice[] },
  plan: HarmonicPlan | undefined,
  policy: UnexplainedRestThinningSupportPolicy,
): Voice[] {
  const requiredSupportCount = Math.max(0, 3 - run.activeVoices.length);
  const fallbackOrder = ["bass", "tenor", "alto", "soprano"] as const;
  const voiceOrder =
    policy === "balanced-upper-agency" && shouldPreferUpperAgencySupport(notes, run, plan)
      ? (["soprano", "alto", "tenor", "bass"] as const)
      : fallbackOrder;
  return voiceOrder
    .filter((voice) => !run.activeVoices.includes(voice))
    .filter((voice) => !hasOverlap(notes, voice, run.startTick, run.endTick - run.startTick))
    .slice(0, requiredSupportCount);
}

function shouldPreferUpperAgencySupport(
  notes: readonly NoteEvent[],
  run: { startTick: number; endTick: number; activeVoices: readonly Voice[] },
  plan: HarmonicPlan | undefined,
): boolean {
  return (
    plan !== undefined &&
    plan.state !== "exposition" &&
    !hasNearbyCadenceTarget(plan, run.startTick) &&
    !run.activeVoices.includes("soprano") &&
    !hasOverlap(notes, "soprano", run.startTick, run.endTick - run.startTick) &&
    (hasLowerSupportFloor(run.activeVoices) || hasActiveStructuralLowSupport(notes, run.startTick))
  );
}

function hasLowerSupportFloor(activeVoices: readonly Voice[]): boolean {
  const lowerVoices = activeVoices.filter((voice) => voice !== "soprano");
  return lowerVoices.length >= 2 && lowerVoices.some((voice) => voice === "tenor" || voice === "bass");
}

function hasActiveStructuralLowSupport(notes: readonly NoteEvent[], tick: number): boolean {
  return notes.some(
    (note) =>
      (note.voice === "tenor" || note.voice === "bass") &&
      note.startTick <= tick &&
      tick < note.startTick + note.durationTicks &&
      (note.metricalHarmonyIntent === "structural-root-support" ||
        note.metricalHarmonyIntent === "structural-chord-tone"),
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
