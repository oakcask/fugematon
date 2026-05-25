import assert from "node:assert/strict";
import test from "node:test";
import { TICKS_PER_QUARTER } from "./constants.js";
import type { GenerationOutput, NoteEvent } from "./events.js";
import { generateScore } from "./generate.js";

const scoreCache = new Map<string, GenerationOutput>();

test("score generation keeps outside support on the tight-stretto first bass answer tail", () => {
  const output = scoreForSeed("tight-stretto");
  const firstBassAnswer = output.diagnostics.subjectEntries.find(
    (entry) => entry.voice === "bass" && entry.state === "exposition" && entry.form === "answer",
  );
  assert.ok(firstBassAnswer !== undefined);

  const fifthBeatTick = firstBassAnswer.startTick + TICKS_PER_QUARTER * 4;
  const activeNotes = output.events.filter(
    (event): event is NoteEvent =>
      event.kind === "note" &&
      event.startTick <= fifthBeatTick &&
      fifthBeatTick < event.startTick + event.durationTicks,
  );
  const activeOutsideVoices = new Set(
    activeNotes.filter((note) => note.voice !== firstBassAnswer.voice).map((note) => note.voice),
  );

  assert.ok(activeOutsideVoices.size > 0);
  assert.equal(output.diagnostics.bassAnswerTailTexture.reviewRequired, false);
});

test("fugue-smoke keeps upper bass-answer tail support singable", () => {
  const output = scoreForSeed("fugue-smoke");
  const notes = output.events.filter((event): event is NoteEvent => event.kind === "note");
  const firstBassAnswer = output.diagnostics.subjectEntries.find(
    (entry) => entry.voice === "bass" && entry.state === "exposition" && entry.form === "answer",
  );
  assert.ok(firstBassAnswer !== undefined);

  const tailStartTick = firstBassAnswer.startTick + TICKS_PER_QUARTER * 4;
  const tailEndTick = firstBassAnswer.startTick + TICKS_PER_QUARTER * 7;
  const upperSupportNotes = notes.filter(
    (note) =>
      note.voice !== "bass" &&
      note.role === "free-counterpoint" &&
      note.metricalHarmonyIntent === "structural-chord-tone" &&
      note.startTick < tailEndTick &&
      tailStartTick < note.startTick + note.durationTicks,
  );

  assert.ok(upperSupportNotes.length > 0);
  assert.ok(
    upperSupportNotes.every((note) => note.durationTicks <= TICKS_PER_QUARTER),
    JSON.stringify(upperSupportNotes, null, 2),
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
