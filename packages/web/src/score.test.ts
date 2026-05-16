import assert from "node:assert/strict";
import test from "node:test";
import { generateScore } from "@fugematon/core";
import { createPlaybackModel, ticksToSeconds } from "./score.js";

test("createPlaybackModel extracts timing metadata and notes", () => {
  const output = generateScore({ seed: "fugue-smoke", lengthTicks: 7680 });
  const model = createPlaybackModel(output);

  assert.equal(model.ticksPerQuarter, 480);
  assert.equal(model.totalTicks, output.diagnostics.generatedUntilTick);
  assert.equal(model.notes.length, output.diagnostics.noteCount);
  assert.deepEqual(model.stateTransitions, output.diagnostics.stateTransitions);
  assert.equal(model.subjectEntries.length, output.diagnostics.subjectEntries.length);
  assert.ok(model.notes.some((note) => note.entry?.state === "exposition"));
  assert.ok(model.notes.some((note) => note.entry?.answerKind === "tonal"));
  assert.ok(model.notes.every((note) => note.entry === undefined || note.entry.localKey.tonic.length > 0));
  assert.ok(
    model.notes.every(
      (note) =>
        note.entry === undefined ||
        note.entry.expectedDegreePattern.length === note.entry.actualPitchClassSequence.length,
    ),
  );
  assert.ok(model.bpm >= 66);
  assert.ok(model.totalSeconds > 0);
  assert.ok(model.pitchRange.min <= model.pitchRange.max);
});

test("ticksToSeconds maps score ticks to playback seconds", () => {
  assert.equal(ticksToSeconds(480, 120, 480), 0.5);
  assert.equal(ticksToSeconds(960, 60, 480), 2);
});
