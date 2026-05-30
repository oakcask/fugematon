import { TICKS_PER_QUARTER } from "../constants.js";
import type {
  HarmonicPlan,
  HarmonicStasisRearticulationSummary,
  HarmonicStasisRearticulationWindow,
  MetricalHarmonyIntent,
  NoteEvent,
} from "../events.js";
import { nearestHarmonicAnchor } from "./harmony.js";
import { compareNoteEvents, VOICE_ENTRY_ORDER } from "./shared.js";

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

type RearticulationRun = {
  notes: NoteEvent[];
};

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
