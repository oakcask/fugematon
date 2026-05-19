import assert from "node:assert/strict";
import test from "node:test";
import { generateScore, PHASE_3_LENGTH_TICKS } from "@fugematon/core";
import {
  computeActivePitches,
  computeActivePitchMarkerLayout,
  computePianoRollLayout,
  computePianoRollViewport,
  DEFAULT_VIEWPORT_SECONDS,
} from "./piano-roll.js";
import { createPlaybackModel, type PlaybackModel } from "./score.js";

test("computePianoRollLayout maps visible notes into canvas bounds", () => {
  const model = createPlaybackModel(generateScore({ seed: "fugue-smoke", lengthTicks: PHASE_3_LENGTH_TICKS }));
  const viewport = computePianoRollViewport(model, 0);
  const layout = computePianoRollLayout(model, 960, 360, viewport, 0);

  assert.ok(layout.length > 0);
  assert.ok(layout.length < model.notes.length);
  assert.ok(layout.some((note) => note.entry?.form === "subject"));
  assert.ok(layout.some((note) => note.entry?.answerKind === "tonal"));
  assert.ok(layout.every((note) => note.x >= 0 && note.x <= 960));
  assert.ok(layout.every((note) => note.y >= 0 && note.y <= 360));
  assert.ok(layout.every((note) => note.width >= 2));
  assert.ok(layout.every((note) => note.height > 0));
  assert.ok(layout.some((note) => note.isActive));
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

test("computeActivePitches returns currently sounding pitches in ascending order", () => {
  const model = createPlaybackModel(generateScore({ seed: "fugue-smoke", lengthTicks: PHASE_3_LENGTH_TICKS }));
  const firstChordSecond = model.notes[0]!.startSecond;
  const firstNotePitches = model.notes
    .filter((note) => note.startSecond <= firstChordSecond && firstChordSecond < note.startSecond + note.durationSecond)
    .map((note) => note.pitch);
  const activePitches = computeActivePitches(model, firstChordSecond);

  assert.deepEqual(
    activePitches,
    [...new Set(firstNotePitches)].sort((left, right) => left - right),
  );
});

test("computeActivePitchMarkerLayout separates black and white key labels in the left gutter", () => {
  const model = { pitchRange: { min: 60, max: 72 } } as PlaybackModel;
  const markers = computeActivePitchMarkerLayout(model, 260, [60, 61, 62]);
  const c4 = markers.find((marker) => marker.pitch === 60)!;
  const cSharp4 = markers.find((marker) => marker.pitch === 61)!;

  assert.equal(c4.name, "C4");
  assert.equal(cSharp4.name, "C#4");
  assert.equal(c4.isBlackKey, false);
  assert.equal(cSharp4.isBlackKey, true);
  assert.equal(c4.textAlign, "right");
  assert.equal(cSharp4.textAlign, "left");
  assert.equal(cSharp4.x, c4.x);
  assert.ok(cSharp4.labelX < c4.labelX);
  assert.ok(c4.width > cSharp4.width);
});

test("computeActivePitchMarkerLayout spaces nearby labels within each key lane", () => {
  const model = { pitchRange: { min: 48, max: 84 } } as PlaybackModel;
  const whiteMarkers = computeActivePitchMarkerLayout(model, 260, [64, 65, 67]).sort(
    (left, right) => left.labelY - right.labelY,
  );

  for (let index = 1; index < whiteMarkers.length; index += 1) {
    assert.ok(whiteMarkers[index]!.labelY - whiteMarkers[index - 1]!.labelY >= 11);
  }
});
