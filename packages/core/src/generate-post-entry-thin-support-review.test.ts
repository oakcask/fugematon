import assert from "node:assert/strict";
import { TICKS_PER_QUARTER } from "./constants.js";
import type { GenerationOutput, NoteEvent, PlannedEntry } from "./events.js";
import { cachedGenerateScore as generateScore } from "./generate-test-helpers.js";
import { reviewTest } from "./test-profile.js";

const POST_ENTRY_PHRASE_REVIEW_SEEDS = [
  "angular-answer",
  "modal-dorian",
  "random-listen-check",
  "seed-0zereox-1v729ih",
] as const;

const scoreCache = new Map<string, GenerationOutput>();

reviewTest("post-entry review seeds stay clear of long thin support windows after repair", () => {
  const summaries = POST_ENTRY_PHRASE_REVIEW_SEEDS.map((seed) => ({
    seed,
    windows: collectThinPostEntrySupportWindows(scoreForSeed(seed)),
  }));
  assert.ok(
    summaries.every((summary) =>
      summary.windows.every((window) => window.maxThinSupportTicks <= TICKS_PER_QUARTER * 5),
    ),
    JSON.stringify(summaries, null, 2),
  );
});

function scoreForSeed(seed: string): GenerationOutput {
  const cached = scoreCache.get(seed);
  if (cached !== undefined) {
    return cached;
  }
  const output = generateScore({ seed, lengthTicks: TICKS_PER_QUARTER * 288 });
  scoreCache.set(seed, output);
  return output;
}

function collectThinPostEntrySupportWindows(output: GenerationOutput): {
  entryStartTick: number;
  entryVoice: PlannedEntry["voice"];
  form: PlannedEntry["form"];
  state: PlannedEntry["state"];
  maxThinSupportTicks: number;
}[] {
  const notes = output.events.filter((event): event is NoteEvent => event.kind === "note");
  const windows = [];

  for (const entry of output.diagnostics.subjectEntries) {
    if (entry.form !== "answer" && entry.state !== "stretto-like") {
      continue;
    }

    const maxThinSupportTicks = longestThinSupportRunTicks(notes, entry);
    if (maxThinSupportTicks >= TICKS_PER_QUARTER * 4) {
      windows.push({
        entryStartTick: entry.startTick,
        entryVoice: entry.voice,
        form: entry.form,
        state: entry.state,
        maxThinSupportTicks,
      });
    }
  }

  return windows;
}

function longestThinSupportRunTicks(notes: readonly NoteEvent[], entry: PlannedEntry): number {
  const scanStartTick = entry.startTick + TICKS_PER_QUARTER * 2;
  const scanEndTick = scanStartTick + TICKS_PER_QUARTER * 8;
  const stepTicks = TICKS_PER_QUARTER / 2;
  let currentRunTicks = 0;
  let maxRunTicks = 0;

  for (let tick = scanStartTick; tick < scanEndTick; tick += stepTicks) {
    const activeNotes = notes.filter((note) => note.startTick <= tick && tick < note.startTick + note.durationTicks);
    const entryVoiceActive = activeNotes.some((note) => note.voice === entry.voice);
    const outsideVoiceCount = new Set(
      activeNotes.filter((note) => note.voice !== entry.voice).map((note) => note.voice),
    ).size;

    if (entryVoiceActive && outsideVoiceCount <= 1) {
      currentRunTicks += stepTicks;
      maxRunTicks = Math.max(maxRunTicks, currentRunTicks);
    } else {
      currentRunTicks = 0;
    }
  }

  return maxRunTicks;
}
