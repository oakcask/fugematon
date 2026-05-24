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
  assert.ok(scheduled.every((note) => note.gain > 0 && note.gain <= 0.22));
});

test("createScheduledNotes preserves default voice dynamics", () => {
  const model = createPlaybackModel(generateScore({ seed: "fugue-smoke", lengthTicks: 7680 }));
  const scheduled = createScheduledNotes(model, 0);
  const firstByVoice = new Map(scheduled.map((note) => [note.note.voice, note]));

  assert.equal(
    round(firstByVoice.get("soprano")!.gain),
    round(0.2 * (firstByVoice.get("soprano")!.note.velocity / 127)),
  );
  assert.equal(round(firstByVoice.get("alto")!.gain), round(0.18 * (firstByVoice.get("alto")!.note.velocity / 127)));
  assert.equal(round(firstByVoice.get("tenor")!.gain), round(0.18 * (firstByVoice.get("tenor")!.note.velocity / 127)));
  assert.equal(round(firstByVoice.get("bass")!.gain), round(0.22 * (firstByVoice.get("bass")!.note.velocity / 127)));
  assert.equal(round(firstByVoice.get("soprano")!.pan), round((24 - 64) / 63));
  assert.equal(round(firstByVoice.get("bass")!.pan), round((104 - 64) / 63));
});

test("midiToFrequency uses A4 as 440hz", () => {
  assert.equal(midiToFrequency(69), 440);
  assert.ok(Math.abs(midiToFrequency(60) - 261.625565) < 0.000001);
});

function round(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}
