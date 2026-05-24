import assert from "node:assert/strict";
import test from "node:test";
import { TICKS_PER_QUARTER } from "./constants.js";
import type { FugueState, GenerationOutput, HarmonicPlan, NoteEvent, Voice } from "./events.js";
import { generateScore } from "./generate.js";

const TEXTURE_CONTINUITY_REPAIR_SEED = "seed-0i335vx-1n54a1x";
const REPAIR_REVIEW_LENGTH_TICKS = TICKS_PER_QUARTER * 288;
const scoreCache = new Map<string, GenerationOutput>();

test("texture-continuity repair seed exposes the current one-outside bass-answer tail blocker", () => {
  const output = scoreForSeed(TEXTURE_CONTINUITY_REPAIR_SEED);
  const tailWindow = output.diagnostics.bassAnswerTailTexture.windows[0];
  assert.ok(tailWindow !== undefined, "reported seed should expose the first bass-answer tail window");

  assert.ok(tailWindow.oneOutsideVoiceTicks >= TICKS_PER_QUARTER * 2, JSON.stringify(tailWindow, null, 2));
  assert.equal(tailWindow.classification, "supported-tail");
  assert.ok(tailWindow.minOutsideVoiceCount >= 1, JSON.stringify(tailWindow, null, 2));
});

test("texture-continuity repair seed exposes the current free-counterpoint solo blocker", () => {
  const output = scoreForSeed(TEXTURE_CONTINUITY_REPAIR_SEED);
  const windows = collectExposedFreeCounterpointSoloWindows(output);

  assert.ok(windows.length >= 1, JSON.stringify(windows, null, 2));
  assert.ok(
    windows.some(
      (window) =>
        window.state !== "exposition" &&
        window.durationTicks >= TICKS_PER_QUARTER &&
        window.previousActiveVoiceCount >= 2,
    ),
    JSON.stringify(windows, null, 2),
  );
});

type ExposedFreeCounterpointSoloWindow = {
  voice: Voice;
  startTick: number;
  endTick: number;
  durationTicks: number;
  state: FugueState | "unplanned";
  previousActiveVoiceCount: number;
};

function scoreForSeed(seed: string): GenerationOutput {
  const cached = scoreCache.get(seed);
  if (cached !== undefined) {
    return cached;
  }
  const output = generateScore({ seed, lengthTicks: REPAIR_REVIEW_LENGTH_TICKS });
  scoreCache.set(seed, output);
  return output;
}

function collectExposedFreeCounterpointSoloWindows(output: GenerationOutput): ExposedFreeCounterpointSoloWindow[] {
  const notes = output.events.filter((event): event is NoteEvent => event.kind === "note");
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
    const plan = sectionPlanAt(output.diagnostics.sectionPlans, startTick);

    if (soloNote?.role === "free-counterpoint" && activeVoices.size === 1 && plan?.state !== "exposition") {
      if (currentWindow?.voice === soloNote.voice && currentWindow.endTick === startTick) {
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

function activeNotesDuring(notes: readonly NoteEvent[], startTick: number, endTick: number): NoteEvent[] {
  return notes.filter((note) => note.startTick < endTick && startTick < note.startTick + note.durationTicks);
}

function sectionPlanAt(sectionPlans: readonly HarmonicPlan[], tick: number): HarmonicPlan | undefined {
  return sectionPlans.find((plan) => plan.startTick <= tick && tick < plan.startTick + plan.durationTicks);
}
