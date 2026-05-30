import { TICKS_PER_QUARTER, VOICE_RANGES } from "../constants.js";
import type {
  HarmonicFunction,
  HarmonicPlan,
  HarmonicStasisRearticulationSummary,
  HarmonicStasisRearticulationWindow,
  MetricalHarmonyIntent,
  NoteEvent,
  Voice,
} from "../events.js";
import { chordTonePitchClasses, nearestHarmonicAnchor, rootDegreeForFunction } from "./harmony.js";
import { scaleDegreePitchClass } from "./pitch.js";
import { compareNoteEvents, positiveModulo, VOICE_ENTRY_ORDER } from "./shared.js";

const MAX_SHORT_REARTICULATION_TICKS = TICKS_PER_QUARTER;

export function analyzeHarmonicStasisRearticulation(
  notes: readonly NoteEvent[],
  sectionPlans: readonly HarmonicPlan[],
): HarmonicStasisRearticulationSummary {
  const firstEpisode = firstEpisodeAfterExposition(sectionPlans);
  const windows = VOICE_ENTRY_ORDER.flatMap((voice) =>
    samePitchRearticulationRuns(notes.filter((note) => note.voice === voice).sort(compareNoteEvents))
      .filter((run) => run.notes.every((note) => note.role === "free-counterpoint"))
      .map((run) => summarizeRun(notes, sectionPlans, firstEpisode, run))
      .filter((window): window is HarmonicStasisRearticulationWindow => window !== undefined),
  ).sort((left, right) => left.startTick - right.startTick || left.voice.localeCompare(right.voice));

  return {
    schemaVersion: 1,
    focusedWindowCount: windows.length,
    acceptedContextWindowCount: windows.filter((window) => window.classification === "accepted-context").length,
    reviewRequiredWindowCount: windows.filter((window) => window.classification === "review-required").length,
    generatorResponseWindowCount: windows.filter((window) => window.classification === "generator-response").length,
    windows,
  };
}

export function repairHarmonicStasisRearticulation(notes: NoteEvent[], sectionPlans: readonly HarmonicPlan[]): void {
  for (let pass = 0; pass < 3; pass += 1) {
    const windows = analyzeHarmonicStasisRearticulation(notes, sectionPlans).windows.filter(
      (window) => window.classification === "generator-response",
    );
    let repaired = false;
    for (const window of windows) {
      repaired = repairGeneratorResponseWindow(notes, sectionPlans, window) || repaired;
    }
    if (!repaired) {
      return;
    }
  }
}

type RearticulationRun = {
  notes: NoteEvent[];
};

function repairGeneratorResponseWindow(
  notes: NoteEvent[],
  sectionPlans: readonly HarmonicPlan[],
  window: HarmonicStasisRearticulationWindow,
): boolean {
  const runNotes = notes
    .filter(
      (note) =>
        note.voice === window.voice &&
        note.role === "free-counterpoint" &&
        note.pitch === window.pitch &&
        note.durationTicks <= MAX_SHORT_REARTICULATION_TICKS &&
        window.startTick <= note.startTick &&
        note.startTick < window.startTick + window.durationTicks,
    )
    .sort(compareNoteEvents);
  if (runNotes.length < 3) {
    return false;
  }

  let repaired = false;
  for (let index = 1; index < runNotes.length; index += 2) {
    const note = runNotes[index]!;
    const alternativePitch = harmonicStasisAlternativePitch(notes, sectionPlans, note);
    if (alternativePitch !== undefined) {
      note.pitch = alternativePitch;
      if (isStructuralSupportIntent(note.metricalHarmonyIntent)) {
        note.metricalHarmonyIntent = structuralIntentForPitch(note, sectionPlans, alternativePitch);
      }
      repaired = true;
      continue;
    }

    if (mergeShortRearticulationIntoPrevious(notes, note)) {
      repaired = true;
    }
  }

  return repaired;
}

function harmonicStasisAlternativePitch(
  notes: readonly NoteEvent[],
  sectionPlans: readonly HarmonicPlan[],
  note: NoteEvent,
): number | undefined {
  const plan = sectionPlanForTick(sectionPlans, note.startTick);
  const anchor = plan === undefined ? undefined : nearestHarmonicAnchor(note.startTick, [plan]);
  if (anchor === undefined || !isStructuralSupportIntent(note.metricalHarmonyIntent)) {
    return undefined;
  }

  const chordTonePitchClassesAtTick = chordTonePitchClasses(anchor.localKey, anchor.function);
  const rootPitchClass = harmonicRootPitchClass(anchor.localKey, anchor.function);
  const previous = previousVoiceNote(notes, note);
  const next = nextVoiceNote(notes, note);
  const shape = { ...note };
  const candidates = nearbyRepairPitches(note, chordTonePitchClassesAtTick)
    .filter((pitch) => pitch !== note.pitch)
    .filter((pitch) => previous === undefined || pitch !== previous.pitch)
    .filter((pitch) => next === undefined || pitch !== next.pitch)
    .filter((pitch) => previous === undefined || Math.abs(pitch - previous.pitch) <= 7)
    .filter((pitch) => next === undefined || Math.abs(pitch - next.pitch) <= 7)
    .filter((pitch) => keepsAdjacentVoiceOrder(notes, shape, pitch))
    .filter((pitch) => !createsSemitoneAtTick(notes, note.voice, note.startTick, pitch))
    .filter((pitch) => !createsPitchClassUnisonAtTick(notes, note.voice, note.startTick, pitch));

  return nearestPitchByCost(candidates, note.pitch, (pitch) => {
    const bassRootRepetitionCost =
      note.voice === "bass" && positiveModulo(pitch, 12) === rootPitchClass ? TICKS_PER_QUARTER : 0;
    const melodicDistanceCost = Math.abs(pitch - note.pitch) * 8;
    const previousDistanceCost = previous === undefined ? 0 : Math.abs(pitch - previous.pitch);
    const nextDistanceCost = next === undefined ? 0 : Math.abs(pitch - next.pitch);
    return bassRootRepetitionCost + melodicDistanceCost + previousDistanceCost + nextDistanceCost;
  });
}

function nearbyRepairPitches(note: NoteEvent, pitchClasses: readonly number[]): number[] {
  const range = VOICE_RANGES[note.voice];
  const candidates: number[] = [];
  for (let pitch = range.min; pitch <= range.max; pitch += 1) {
    if (pitchClasses.includes(positiveModulo(pitch, 12)) && Math.abs(pitch - note.pitch) <= 7) {
      candidates.push(pitch);
    }
  }
  return candidates;
}

function structuralIntentForPitch(
  note: NoteEvent,
  sectionPlans: readonly HarmonicPlan[],
  pitch: number,
): MetricalHarmonyIntent {
  const plan = sectionPlanForTick(sectionPlans, note.startTick);
  const anchor = plan === undefined ? undefined : nearestHarmonicAnchor(note.startTick, [plan]);
  if (
    note.voice === "bass" &&
    anchor !== undefined &&
    positiveModulo(pitch, 12) === harmonicRootPitchClass(anchor.localKey, anchor.function)
  ) {
    return "structural-root-support";
  }
  return "structural-chord-tone";
}

function harmonicRootPitchClass(localKey: HarmonicPlan["localKey"], harmonicFunction: HarmonicFunction): number {
  return scaleDegreePitchClass(rootDegreeForFunction(harmonicFunction), 0, localKey);
}

function isStructuralSupportIntent(intent: MetricalHarmonyIntent | undefined): boolean {
  return intent === "structural-root-support" || intent === "structural-chord-tone";
}

function mergeShortRearticulationIntoPrevious(notes: NoteEvent[], note: NoteEvent): boolean {
  const previous = previousVoiceNote(notes, note);
  if (
    previous === undefined ||
    previous.pitch !== note.pitch ||
    previous.startTick + previous.durationTicks !== note.startTick ||
    previous.durationTicks + note.durationTicks > MAX_SHORT_REARTICULATION_TICKS ||
    previous.role !== "free-counterpoint" ||
    note.role !== "free-counterpoint"
  ) {
    return false;
  }

  previous.durationTicks += note.durationTicks;
  const noteIndex = notes.indexOf(note);
  if (noteIndex >= 0) {
    notes.splice(noteIndex, 1);
  }
  return true;
}

function previousVoiceNote(notes: readonly NoteEvent[], note: NoteEvent): NoteEvent | undefined {
  return notes
    .filter((candidate) => candidate.voice === note.voice && candidate.startTick < note.startTick)
    .sort(compareNoteEvents)
    .at(-1);
}

function nextVoiceNote(notes: readonly NoteEvent[], note: NoteEvent): NoteEvent | undefined {
  return notes
    .filter((candidate) => candidate.voice === note.voice && candidate.startTick > note.startTick)
    .sort(compareNoteEvents)[0];
}

function nearestPitchByCost(
  candidates: readonly number[],
  targetPitch: number,
  cost: (pitch: number) => number,
): number | undefined {
  return [...candidates].sort(
    (left, right) => cost(left) - cost(right) || Math.abs(left - targetPitch) - Math.abs(right - targetPitch),
  )[0];
}

function samePitchRearticulationRuns(voiceNotes: readonly NoteEvent[]): RearticulationRun[] {
  const runs: RearticulationRun[] = [];
  let current: NoteEvent[] = [];

  for (const note of voiceNotes) {
    const previous = current.at(-1);
    const continuesRun =
      previous !== undefined &&
      previous.pitch === note.pitch &&
      previous.startTick + previous.durationTicks === note.startTick &&
      previous.durationTicks <= MAX_SHORT_REARTICULATION_TICKS &&
      note.durationTicks <= MAX_SHORT_REARTICULATION_TICKS;

    if (continuesRun) {
      current.push(note);
      continue;
    }

    if (current.length >= 2) {
      runs.push({ notes: current });
    }
    current = [note];
  }

  if (current.length >= 2) {
    runs.push({ notes: current });
  }

  return runs;
}

function summarizeRun(
  notes: readonly NoteEvent[],
  sectionPlans: readonly HarmonicPlan[],
  firstEpisode: HarmonicPlan | undefined,
  run: RearticulationRun,
): HarmonicStasisRearticulationWindow | undefined {
  const first = run.notes[0];
  const last = run.notes.at(-1);
  if (first === undefined || last === undefined || first.role === undefined) {
    return undefined;
  }

  const endTick = last.startTick + last.durationTicks;
  const plan = sectionPlanForTick(sectionPlans, first.startTick);
  const anchor = plan === undefined ? undefined : nearestHarmonicAnchor(first.startTick, [plan]);
  const activeNotes = activeNotesAt(notes, first.startTick);
  const allActiveVoicesFreeCounterpoint =
    activeNotes.length > 0 && activeNotes.every((note) => note.role === "free-counterpoint");
  const firstEpisodeHandoff = firstEpisode !== undefined && plan === firstEpisode;
  const classification = classifyRun({
    run,
    plan,
    firstEpisodeHandoff,
    allActiveVoicesFreeCounterpoint,
    intent: first.metricalHarmonyIntent,
  });

  return {
    startTick: first.startTick,
    durationTicks: endTick - first.startTick,
    state: plan?.state ?? "mixed",
    voice: first.voice,
    pitch: first.pitch,
    attackCount: run.notes.length,
    role: first.role,
    metricalHarmonyIntent: first.metricalHarmonyIntent,
    localKey: anchor?.localKey,
    harmonicFunction: anchor?.function,
    activeVoiceCount: activeNotes.length,
    activeVoices: activeNotes.map((note) => note.voice),
    allActiveVoicesFreeCounterpoint,
    firstEpisodeHandoff,
    preparesNextEntry: run.notes.some((note) => note.motivicDerivation?.preparesNextEntry === true),
    sourceMotive: first.motivicDerivation?.sourceMotive,
    transformationKind: first.motivicDerivation?.transformationKind,
    sequenceDirection: first.motivicDerivation?.sequenceDirection,
    classification,
    response:
      classification === "accepted-context"
        ? "accepted-context"
        : classification === "generator-response"
          ? "generator-response-required"
          : "review-required",
  };
}

function classifyRun(input: {
  run: RearticulationRun;
  plan: HarmonicPlan | undefined;
  firstEpisodeHandoff: boolean;
  allActiveVoicesFreeCounterpoint: boolean;
  intent: MetricalHarmonyIntent | undefined;
}): HarmonicStasisRearticulationWindow["classification"] {
  const hasCadenceFunction = input.run.notes.some(
    (note) => note.motivicDerivation?.sourceMotive === "cadence-figure" || note.motivicDerivation?.preparesCadence,
  );
  if (hasCadenceFunction && input.run.notes.length <= 2) {
    return "accepted-context";
  }

  const structuralSupport = input.intent === "structural-root-support" || input.intent === "structural-chord-tone";
  if (
    input.plan?.state === "episode" &&
    input.firstEpisodeHandoff &&
    input.allActiveVoicesFreeCounterpoint &&
    structuralSupport &&
    input.run.notes.length >= 3
  ) {
    return "generator-response";
  }

  return "review-required";
}

function firstEpisodeAfterExposition(sectionPlans: readonly HarmonicPlan[]): HarmonicPlan | undefined {
  return [...sectionPlans]
    .sort((left, right) => left.startTick - right.startTick)
    .find((plan) => plan.state === "episode");
}

function sectionPlanForTick(sectionPlans: readonly HarmonicPlan[], tick: number): HarmonicPlan | undefined {
  return sectionPlans.find((plan) => plan.startTick <= tick && tick < plan.startTick + plan.durationTicks);
}

function activeNotesAt(notes: readonly NoteEvent[], tick: number): NoteEvent[] {
  return notes
    .filter((note) => note.startTick <= tick && tick < note.startTick + note.durationTicks)
    .sort((left, right) => VOICE_ENTRY_ORDER.indexOf(left.voice) - VOICE_ENTRY_ORDER.indexOf(right.voice));
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

function activeNoteAt(notes: readonly NoteEvent[], voice: Voice, tick: number): NoteEvent | undefined {
  return notes.find(
    (note) => note.voice === voice && note.startTick <= tick && tick < note.startTick + note.durationTicks,
  );
}
