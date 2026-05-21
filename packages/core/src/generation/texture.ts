import { TICKS_PER_QUARTER, VOICE_RANGES } from "../constants.js";
import type { HarmonicPlan, KeyMode, KeySignature, MetricalHarmonyIntent, NoteEvent, Voice } from "../events.js";
import { metricalHarmonyIntentForDegree, nearestHarmonicAnchor, rootDegreeForFunction } from "./harmony.js";
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
  harmonicPlan?: HarmonicPlan;
  maxVoiceCount?: number;
  voiceOrder?: readonly Voice[];
  lineKind?: ContinuityLineKind;
};

export type ContinuityTexturePlan = ContinuityCounterpointInput & {
  voices: Voice[];
};

export type ContinuityLineKind = "linear" | "oblique-support";

type EntryCounterpointTextureInput = {
  enteringVoice: Voice;
  startTick: number;
  durationTicks: number;
  localKey: KeySignature;
  eligibleVoices?: readonly Voice[];
  harmonicPlan?: HarmonicPlan;
};

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
    });
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
    harmonicPlan?: HarmonicPlan;
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
    harmonicPlan?: HarmonicPlan;
    metricalHarmonyIntent?: MetricalHarmonyIntent;
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
  const fillerSubject = degrees.map((scaleDegree, index) => ({
    offsetTick: index * (TICKS_PER_QUARTER / 2),
    durationTicks: TICKS_PER_QUARTER / 2,
    scaleDegree,
    accidental: 0,
    importantTone: false,
    melodicRole: melodicRoleForScaleDegree(scaleDegree),
    metricalHarmonyIntent: "weak-passing-tone" as const,
  }));
  addPatternCounterpoint(notes, fillerSubject, {
    voice,
    startTick,
    maxDurationTicks,
    localKey: plan.localKey,
    degrees,
    velocity: lineIndex === 0 ? 58 : 52,
    role: "free-counterpoint",
    harmonicPlan: plan.harmonicPlan,
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

    const anchor = nearestHarmonicAnchor(run.startTick, [plan]);
    const degree = anchor === undefined ? 0 : rootDegreeForFunction(anchor.function);
    addFunctionalSupportLine(notes, {
      voice: supportVoice,
      localKey: plan.targetKey,
      harmonicPlan: plan,
      rootDegree: degree,
      startTick: run.startTick,
      durationTicks: run.endTick - run.startTick,
    });
  }

  repairTextureVoiceCrossings(
    notes,
    Math.min(...sectionPlans.map((plan) => plan.startTick)),
    Math.max(...sectionPlans.map((plan) => plan.startTick + plan.durationTicks)),
  );
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
  },
): void {
  const lineDegrees = functionalSupportLineDegrees(input.voice, input.rootDegree);
  const maxNoteTicks = TICKS_PER_QUARTER;
  let elapsedTicks = 0;
  let index = 0;

  while (elapsedTicks < input.durationTicks) {
    const durationTicks = Math.min(maxNoteTicks, input.durationTicks - elapsedTicks);
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
      },
      degree,
      input.startTick + elapsedTicks,
      durationTicks,
    );
    elapsedTicks += durationTicks;
    index += 1;
  }
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
