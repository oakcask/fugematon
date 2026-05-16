import assert from "node:assert/strict";
import test from "node:test";
import { generateScore } from "@fugematon/core";
import { computePianoRollLayout } from "./piano-roll.js";
import { createPlaybackModel } from "./score.js";

test("computePianoRollLayout maps every note into canvas bounds", () => {
  const model = createPlaybackModel(generateScore({ seed: "fugue-smoke", lengthTicks: 7680 }));
  const layout = computePianoRollLayout(model, 960, 360);

  assert.equal(layout.length, model.notes.length);
  assert.ok(layout.some((note) => note.entry?.form === "subject"));
  assert.ok(layout.every((note) => note.x >= 0 && note.x <= 960));
  assert.ok(layout.every((note) => note.y >= 0 && note.y <= 360));
  assert.ok(layout.every((note) => note.width > 0));
  assert.ok(layout.every((note) => note.height > 0));
});
