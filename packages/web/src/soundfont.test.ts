import assert from "node:assert/strict";
import test from "node:test";
import { generateScore } from "@fugematon/core";
import { createPlaybackModel } from "./score.js";
import { createSoundFontEvents } from "./soundfont.js";

test("createSoundFontEvents maps playback notes to MIDI-style soundfont events", () => {
  const model = createPlaybackModel(generateScore({ seed: "fugue-smoke", lengthTicks: 7680 }), "organ-default");
  const events = createSoundFontEvents(model, 10);

  assert.ok(events.some((event) => event.kind === "program-change" && event.channel === 0 && event.program === 19));
  assert.ok(events.some((event) => event.kind === "program-change" && event.channel === 3 && event.program === 32));
  assert.ok(events.some((event) => event.kind === "note-on" && event.timeSecond >= 10));
  assert.ok(events.some((event) => event.kind === "note-off" && event.timeSecond > 10));
});

test("createSoundFontEvents schedules from an offset", () => {
  const model = createPlaybackModel(generateScore({ seed: "fugue-smoke", lengthTicks: 7680 }));
  const offsetSecond = model.notes.find((note) => note.startSecond > 0)!.startSecond;
  const events = createSoundFontEvents(model, 10, offsetSecond);

  assert.ok(events.length < createSoundFontEvents(model, 10).length);
  assert.equal(Math.min(...events.map((event) => event.timeSecond)), 10);
});
