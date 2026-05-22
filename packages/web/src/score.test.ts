import assert from "node:assert/strict";
import test from "node:test";
import { generateScore } from "@fugematon/core";
import {
  createPlaybackModel,
  formatBarBeatDuration,
  formatBarBeatPosition,
  formatPlaybackPosition,
  formatTimeSignature,
  secondsToTicks,
  ticksPerBar,
  ticksPerBeat,
  ticksToSeconds,
} from "./score.js";

test("createPlaybackModel extracts timing metadata and notes", () => {
  const output = generateScore({ seed: "fugue-smoke", lengthTicks: 7680 });
  const model = createPlaybackModel(output);

  assert.equal(model.ticksPerQuarter, 480);
  assert.ok([3, 4, 6].includes(model.timeSignature.numerator));
  assert.ok([4, 8].includes(model.timeSignature.denominator));
  assert.equal(model.totalTicks, output.diagnostics.generatedUntilTick);
  assert.equal(model.notes.length, output.diagnostics.noteCount);
  assert.deepEqual(model.stateTransitions, output.diagnostics.stateTransitions);
  assert.equal(model.subjectEntries.length, output.diagnostics.subjectEntries.length);
  assert.deepEqual(model.performanceProfile, { id: "organ-default", version: 1 });
  assert.ok(model.notes.some((note) => note.entry?.state === "exposition"));
  assert.ok(model.notes.some((note) => note.entry?.answerKind === "tonal"));
  assert.ok(model.notes.some((note) => note.role === "counter-subject"));
  assert.ok(model.notes.some((note) => note.role === "free-counterpoint"));
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

test("createPlaybackModel can select the strict counterpoint performance profile", () => {
  const output = generateScore({ seed: "fugue-smoke", lengthTicks: 7680 });
  const model = createPlaybackModel(output, "strict-counterpoint");

  assert.deepEqual(model.performanceProfile, { id: "strict-counterpoint", version: 1 });
  assert.ok(model.notes.every((note) => note.oscillatorType === "sine"));
  assert.equal(model.notes.find((note) => note.voice === "soprano")?.gain, 0.2);
});

test("ticksToSeconds maps score ticks to playback seconds", () => {
  assert.equal(ticksToSeconds(480, 120, 480), 0.5);
  assert.equal(ticksToSeconds(960, 60, 480), 2);
});

test("secondsToTicks maps playback seconds back to score ticks", () => {
  assert.equal(secondsToTicks(0.5, 120, 480), 480);
  assert.equal(secondsToTicks(2, 60, 480), 960);
});

test("bar and beat helpers use score time signature metadata", () => {
  const commonTime = { numerator: 4, denominator: 4 } as const;
  const compoundTime = { numerator: 6, denominator: 8 } as const;

  assert.equal(formatTimeSignature(commonTime), "4/4");
  assert.equal(ticksPerBeat(commonTime, 480), 480);
  assert.equal(ticksPerBar(commonTime, 480), 1920);
  assert.equal(formatBarBeatPosition(0, commonTime, 480), "1:1");
  assert.equal(formatBarBeatPosition(1920 + 960, commonTime, 480), "2:3");
  assert.equal(formatBarBeatDuration(1920 * 2 + 480, commonTime, 480), "2 bars + 1 beat");

  assert.equal(formatTimeSignature(compoundTime), "6/8");
  assert.equal(ticksPerBeat(compoundTime, 480), 240);
  assert.equal(ticksPerBar(compoundTime, 480), 1440);
  assert.equal(formatBarBeatPosition(1440 + 240 * 5, compoundTime, 480), "2:6");
  assert.equal(formatBarBeatDuration(1440 * 3, compoundTime, 480), "3 bars");
});

test("formatPlaybackPosition reports seconds and bar-beat location", () => {
  const model = createPlaybackModel(generateScore({ seed: "fugue-smoke", lengthTicks: 7680 }));

  assert.equal(formatPlaybackPosition(0, model), "0s / 1:1");
  assert.match(formatPlaybackPosition(2.75, model), /^2s \/ \d+:\d+$/);
});
