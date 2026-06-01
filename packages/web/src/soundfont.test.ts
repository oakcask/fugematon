import assert from "node:assert/strict";
import test from "node:test";
import { generateScore } from "@fugematon/core";
import { createPlaybackModel } from "./score.js";
import { createSoundFontEvents, MUSESCORE_GENERAL_SF3_PROTOTYPE, soundFontAssets } from "./soundfont.js";

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

test("MuseScore General prototype descriptor points at a lazy static asset", () => {
  assert.equal(MUSESCORE_GENERAL_SF3_PROTOTYPE.distributed, false);
  assert.equal(MUSESCORE_GENERAL_SF3_PROTOTYPE.url, "/soundfonts/MuseScore_General.sf3");
  assert.ok(soundFontAssets.includes(MUSESCORE_GENERAL_SF3_PROTOTYPE));
});
