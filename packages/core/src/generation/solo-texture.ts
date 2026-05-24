import { TICKS_PER_QUARTER } from "../constants.js";
import type {
  ExposedFreeCounterpointSoloFunction,
  ExposedFreeCounterpointSoloSummary,
  ExposedFreeCounterpointSoloWindow,
  HarmonicPlan,
  NoteEvent,
  SoloTextureSummary,
  Voice,
} from "../events.js";
import { VOICE_ENTRY_ORDER } from "./shared.js";

export function analyzeSoloTexture(
  notes: readonly NoteEvent[],
  sectionPlans: readonly HarmonicPlan[],
): SoloTextureSummary {
  const checkpoints = [...new Set(notes.flatMap((note) => [note.startTick, note.startTick + note.durationTicks]))].sort(
    (left, right) => left - right,
  );
  const runs: {
    voice: Voice;
    startTick: number;
    endTick: number;
    previousActiveVoiceCount: number;
  }[] = [];
  let currentRun:
    | {
        voice: Voice;
        startTick: number;
        endTick: number;
        previousActiveVoiceCount: number;
      }
    | undefined;
  let previousActiveVoiceCount = 0;

  for (let index = 0; index < checkpoints.length - 1; index += 1) {
    const startTick = checkpoints[index]!;
    const endTick = checkpoints[index + 1]!;
    const activeVoices = activeVoicesDuring(notes, startTick, endTick);
    if (activeVoices.length === 1) {
      const voice = activeVoices[0]!;
      if (currentRun?.voice === voice && currentRun.endTick === startTick) {
        currentRun.endTick = endTick;
      } else {
        if (currentRun !== undefined) {
          runs.push(currentRun);
        }
        currentRun = { voice, startTick, endTick, previousActiveVoiceCount };
      }
    } else if (currentRun !== undefined) {
      runs.push(currentRun);
      currentRun = undefined;
    }
    previousActiveVoiceCount = activeVoices.length;
  }
  if (currentRun !== undefined) {
    runs.push(currentRun);
  }

  const longRuns = runs.filter((run) => run.endTick - run.startTick >= TICKS_PER_QUARTER);
  const unsupportedRuns = longRuns.filter(
    (run) =>
      run.previousActiveVoiceCount >= 2 &&
      !hasNearbyPhraseSupport(run.startTick, sectionPlans) &&
      !hasGradualThinningBefore(notes, run.voice, run.startTick),
  );
  const abruptRuns = unsupportedRuns.filter((run) => run.previousActiveVoiceCount >= 3);
  const runsByVoice = VOICE_ENTRY_ORDER.map((voice) => longRuns.filter((run) => run.voice === voice).length);

  return {
    soloRunCount: longRuns.length,
    unsupportedSoloRunCount: unsupportedRuns.length,
    abruptTextureDropCount: abruptRuns.length,
    soloVoiceImbalance: Math.max(...runsByVoice) - Math.min(...runsByVoice),
  };
}

export function analyzeExposedFreeCounterpointSolo(
  notes: readonly NoteEvent[],
  sectionPlans: readonly HarmonicPlan[],
): ExposedFreeCounterpointSoloSummary {
  const windows = collectExposedFreeCounterpointSoloWindows(notes, sectionPlans);
  const reviewRequiredWindowCount = windows.filter((window) => window.classification === "review-required").length;

  return {
    schemaVersion: 1,
    reviewRequired: reviewRequiredWindowCount > 0,
    windowCount: windows.length,
    reviewRequiredWindowCount,
    functionExplainedWindowCount: windows.length - reviewRequiredWindowCount,
    windows,
  };
}

export function collectUnsupportedExposedFreeCounterpointSoloRuns(
  notes: readonly NoteEvent[],
  sectionPlans: readonly HarmonicPlan[],
): { startTick: number; endTick: number; activeVoice: Voice }[] {
  return collectExposedFreeCounterpointSoloWindows(notes, sectionPlans)
    .filter((window) => window.classification === "review-required")
    .map((window) => ({ startTick: window.startTick, endTick: window.endTick, activeVoice: window.voice }));
}

function collectExposedFreeCounterpointSoloWindows(
  notes: readonly NoteEvent[],
  sectionPlans: readonly HarmonicPlan[],
): ExposedFreeCounterpointSoloWindow[] {
  const checkpoints = [...new Set(notes.flatMap((note) => [note.startTick, note.startTick + note.durationTicks]))].sort(
    (left, right) => left - right,
  );
  const windows: ExposedFreeCounterpointSoloWindow[] = [];
  let currentWindow: ExposedFreeCounterpointSoloWindow | undefined;
  let previousActiveVoiceCount = 0;

  for (let index = 0; index < checkpoints.length - 1; index += 1) {
    const startTick = checkpoints[index]!;
    const endTick = checkpoints[index + 1]!;
    const activeNotes = activeNotesDuring(notes, startTick, endTick);
    const activeVoices = new Set(activeNotes.map((note) => note.voice));
    const soloNote = activeNotes.length === 1 ? activeNotes[0] : undefined;
    const plan = sectionPlanAt(sectionPlans, startTick);

    if (soloNote?.role === "free-counterpoint" && activeVoices.size === 1 && plan?.state !== "exposition") {
      const soloFunction = exposedSoloFunction({
        note: soloNote,
        plan,
        startTick,
        endTick,
        previousActiveVoiceCount,
      });
      const classification = soloFunction === "unsupported" ? "review-required" : "function-explained";
      if (
        currentWindow?.voice === soloNote.voice &&
        currentWindow.endTick === startTick &&
        currentWindow.function === soloFunction &&
        currentWindow.classification === classification
      ) {
        currentWindow.endTick = endTick;
        currentWindow.durationTicks = currentWindow.endTick - currentWindow.startTick;
      } else {
        if (currentWindow !== undefined) {
          windows.push(currentWindow);
        }
        currentWindow = {
          voice: soloNote.voice,
          startTick,
          endTick,
          durationTicks: endTick - startTick,
          state: plan?.state ?? "unplanned",
          previousActiveVoiceCount,
          function: soloFunction,
          classification,
        };
      }
    } else if (currentWindow !== undefined) {
      windows.push(currentWindow);
      currentWindow = undefined;
    }

    previousActiveVoiceCount = activeVoices.size;
  }

  if (currentWindow !== undefined) {
    windows.push(currentWindow);
  }

  return windows.filter((window) => window.durationTicks >= TICKS_PER_QUARTER);
}

function activeVoicesDuring(notes: readonly NoteEvent[], startTick: number, endTick: number): Voice[] {
  return VOICE_ENTRY_ORDER.filter((voice) =>
    notes.some(
      (note) => note.voice === voice && note.startTick < endTick && startTick < note.startTick + note.durationTicks,
    ),
  );
}

function activeNotesDuring(notes: readonly NoteEvent[], startTick: number, endTick: number): NoteEvent[] {
  return notes.filter((note) => note.startTick < endTick && startTick < note.startTick + note.durationTicks);
}

function sectionPlanAt(sectionPlans: readonly HarmonicPlan[], tick: number): HarmonicPlan | undefined {
  return sectionPlans.find((plan) => plan.startTick <= tick && tick < plan.startTick + plan.durationTicks);
}

function exposedSoloFunction(input: {
  note: NoteEvent;
  plan: HarmonicPlan | undefined;
  startTick: number;
  endTick: number;
  previousActiveVoiceCount: number;
}): ExposedFreeCounterpointSoloFunction {
  const { note, plan, startTick, endTick, previousActiveVoiceCount } = input;
  if (plan === undefined) {
    return "unsupported";
  }
  if (note.voice === "bass") {
    return "pedal";
  }
  if (startTick - plan.startTick <= TICKS_PER_QUARTER) {
    return "entry-preparation";
  }
  if (
    plan.startTick + plan.durationTicks - endTick <= TICKS_PER_QUARTER * 2 ||
    hasNearbyCadenceSupport(startTick, plan)
  ) {
    return "cadential-preparation";
  }
  if (previousActiveVoiceCount <= 1) {
    return "solo-rhetoric";
  }
  return "unsupported";
}

function hasNearbyCadenceSupport(tick: number, plan: HarmonicPlan): boolean {
  return plan.anchors.some((anchor) => anchor.cadenceTarget && Math.abs(tick - anchor.tick) <= TICKS_PER_QUARTER);
}

function hasNearbyPhraseSupport(tick: number, sectionPlans: readonly HarmonicPlan[]): boolean {
  return sectionPlans.some((plan) => {
    const sectionEndTick = plan.startTick + plan.durationTicks;
    const nearSectionBoundary =
      Math.abs(tick - plan.startTick) <= TICKS_PER_QUARTER || Math.abs(tick - sectionEndTick) <= TICKS_PER_QUARTER;
    const nearCadence = plan.anchors.some(
      (anchor) => anchor.cadenceTarget && Math.abs(tick - anchor.tick) <= TICKS_PER_QUARTER,
    );
    return nearSectionBoundary || nearCadence;
  });
}

function hasGradualThinningBefore(notes: readonly NoteEvent[], voice: Voice, tick: number): boolean {
  const previousTick = tick - TICKS_PER_QUARTER / 2;
  if (previousTick < 0) {
    return false;
  }

  const previousActiveVoices = activeVoicesDuring(notes, previousTick, tick);
  return previousActiveVoices.length === 2 && previousActiveVoices.includes(voice);
}
