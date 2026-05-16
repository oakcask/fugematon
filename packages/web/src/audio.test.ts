import assert from "node:assert/strict";
import test from "node:test";
import { generateScore } from "@fugematon/core";
import { createScheduledNotes, midiToFrequency } from "./audio.js";
import { createPlaybackModel } from "./score.js";

test("createScheduledNotes maps playback notes to absolute audio times", () => {
  const model = createPlaybackModel(generateScore({ seed: "fugue-smoke", lengthTicks: 7680 }));
  const scheduled = createScheduledNotes(model, 10);

  assert.equal(scheduled.length, model.notes.length);
  assert.equal(scheduled[0]!.startSecond, 10 + model.notes[0]!.startSecond);
  assert.ok(scheduled.every((note) => note.stopSecond > note.startSecond));
  assert.ok(scheduled.every((note) => note.frequency > 0));
  assert.ok(scheduled.every((note) => note.gain > 0 && note.gain <= 0.2));
});

test("midiToFrequency uses A4 as 440hz", () => {
  assert.equal(midiToFrequency(69), 440);
  assert.ok(Math.abs(midiToFrequency(60) - 261.625565) < 0.000001);
});
