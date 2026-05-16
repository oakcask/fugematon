import assert from "node:assert/strict";
import test from "node:test";
import { generateScore, PHASE_3_LENGTH_TICKS } from "@fugematon/core";
import {
  DEFAULT_VIEWPORT_SECONDS,
  computePianoRollLayout,
  computePianoRollViewport,
} from "./piano-roll.js";
import { createPlaybackModel } from "./score.js";

test("computePianoRollLayout maps visible notes into canvas bounds", () => {
  const model = createPlaybackModel(generateScore({ seed: "fugue-smoke", lengthTicks: PHASE_3_LENGTH_TICKS }));
  const viewport = computePianoRollViewport(model, 0);
  const layout = computePianoRollLayout(model, 960, 360, viewport);

  assert.ok(layout.length > 0);
  assert.ok(layout.length < model.notes.length);
  assert.ok(layout.some((note) => note.entry?.form === "subject"));
  assert.ok(layout.every((note) => note.x >= 0 && note.x <= 960));
  assert.ok(layout.every((note) => note.y >= 0 && note.y <= 360));
  assert.ok(layout.every((note) => note.width >= 2));
  assert.ok(layout.every((note) => note.height > 0));
});

test("computePianoRollViewport starts at the opening and follows playback", () => {
  const model = createPlaybackModel(generateScore({ seed: "fugue-smoke", lengthTicks: PHASE_3_LENGTH_TICKS }));
  const opening = computePianoRollViewport(model, 0);
  const following = computePianoRollViewport(model, DEFAULT_VIEWPORT_SECONDS * 2);

  assert.equal(opening.startSecond, 0);
  assert.equal(opening.endSecond - opening.startSecond, DEFAULT_VIEWPORT_SECONDS);
  assert.ok(following.startSecond > opening.startSecond);
  assert.ok(following.startSecond < DEFAULT_VIEWPORT_SECONDS * 2);
  assert.equal(following.endSecond - following.startSecond, DEFAULT_VIEWPORT_SECONDS);
});
