import assert from "node:assert/strict";
import test from "node:test";
import { generateScore } from "@fugematon/core";
import {
  createPlaybackModel,
  createPlaybackTimelineSegment,
  createScoreCardSnapshot,
  findActivePlaybackSegment,
  formatBarBeatDuration,
  formatBarBeatPosition,
  formatKeySignature,
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
  assert.ok(model.keySignature.tonic.length > 0);
  assert.ok(["major", "minor", "dorian", "mixolydian", "aeolian"].includes(model.keySignature.mode));
  assert.equal(model.totalTicks, output.diagnostics.generatedUntilTick);
  assert.equal(model.notes.length, output.diagnostics.noteCount);
  assert.deepEqual(model.stateTransitions, output.diagnostics.stateTransitions);
  assert.equal(model.subjectEntries.length, output.diagnostics.subjectEntries.length);
  assert.deepEqual(model.sectionPlans, output.diagnostics.sectionPlans);
  assert.deepEqual(model.performanceProfile, { id: "strict-counterpoint", version: 3 });
  assert.ok(model.notes.some((note) => note.entry?.state === "exposition"));
  assert.ok(model.notes.some((note) => note.entry?.answerKind === "tonal"));
  assert.ok(model.notes.some((note) => note.role === "counter-subject"));
  assert.ok(model.notes.some((note) => note.role === "free-counterpoint"));
  assert.ok(model.notes.every((note) => Object.hasOwn(note, "webAudioSynth")));
  assert.ok(model.notes.every((note) => !Object.hasOwn(note, "releaseSeconds")));
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

test("createPlaybackModel pads the piano roll range around playback notes", () => {
  const model = createPlaybackModel(generateScore({ seed: "fugue-smoke", lengthTicks: 7680 }));
  const notePitches = model.notes.map((note) => note.pitch);

  assert.equal(model.pitchRange.min, Math.min(...notePitches) - 1);
  assert.equal(model.pitchRange.max, Math.max(...notePitches) + 1);
});

test("playback timeline resolver keeps the prior segment before the next offset", () => {
  const first = createPlaybackModel(generateScore({ seed: "timeline-first", lengthTicks: 7680 }));
  const second = createPlaybackModel(generateScore({ seed: "timeline-second", lengthTicks: 7680 }));
  const timeline = [
    createPlaybackTimelineSegment(first, { segmentIndex: 0, seed: "timeline-first" }),
    createPlaybackTimelineSegment(second, {
      segmentIndex: 1,
      seed: "timeline-second",
      offsetSecond: first.totalSeconds,
    }),
  ];

  assert.equal(findActivePlaybackSegment(timeline, first.totalSeconds - 0.001)?.segmentIndex, 0);
  assert.equal(findActivePlaybackSegment(timeline, first.totalSeconds)?.segmentIndex, 1);
  assert.equal(findActivePlaybackSegment(timeline, first.totalSeconds + 0.001)?.segmentIndex, 1);
});

test("score-card snapshot reports the active segment context", () => {
  const first = createPlaybackModel(generateScore({ seed: "snapshot-first", lengthTicks: 7680 }));
  const second = createPlaybackModel(generateScore({ seed: "snapshot-second", lengthTicks: 7680 }));
  const active = createPlaybackTimelineSegment(second, {
    segmentIndex: 2,
    seed: "snapshot-second",
    offsetSecond: first.totalSeconds,
  });
  const snapshot = createScoreCardSnapshot(active, first.totalSeconds + 1.25);

  assert.equal(snapshot?.segmentIndex, 2);
  assert.equal(snapshot?.seed, "snapshot-second");
  assert.ok(snapshot !== undefined);
  assert.ok(Math.abs(snapshot.segmentSecond - 1.25) < 0.000_001);
  assert.equal(snapshot?.model.keySignature, second.keySignature);
  assert.equal(snapshot?.model.bpm, second.bpm);
  assert.equal(snapshot?.model.notes.length, second.notes.length);
  assert.equal(snapshot?.model.stateTransitions.length, second.stateTransitions.length);
  assert.equal(snapshot?.model.subjectEntries.length, second.subjectEntries.length);
});

test("createPlaybackModel can select the organ default performance profile", () => {
  const output = generateScore({ seed: "fugue-smoke", lengthTicks: 7680 });
  const model = createPlaybackModel(output, "organ-default");

  assert.deepEqual(model.performanceProfile, { id: "organ-default", version: 3 });
  assert.ok(model.notes.some((note) => note.oscillatorType === "triangle"));
  assert.equal(model.notes.find((note) => note.voice === "soprano")?.gain, 0.18);
  assert.equal(model.notes.find((note) => note.voice === "bass")?.webAudioSynth.sustainLevel, 0.56);
});

test("key signature helpers format tonic and mode metadata", () => {
  assert.equal(formatKeySignature({ tonic: "Bb", mode: "dorian" }), "B♭ Dorian");
  assert.equal(formatKeySignature({ tonic: "F#", mode: "major" }), "F♯ Major");
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

test("formatPlaybackPosition reports seconds and bar-beat positions", () => {
  const model = createPlaybackModel(generateScore({ seed: "fugue-smoke", lengthTicks: 7680 }));

  assert.equal(
    formatPlaybackPosition(0, model),
    `0s / ${model.totalSeconds.toFixed(1)}s | bar 1:1 / ${formatBarBeatPosition(
      model.totalTicks,
      model.timeSignature,
      model.ticksPerQuarter,
    )}`,
  );
  assert.equal(
    formatPlaybackPosition(2.75, model),
    `2s / ${model.totalSeconds.toFixed(1)}s | bar ${formatBarBeatPosition(
      secondsToTicks(2.75, model.bpm, model.ticksPerQuarter),
      model.timeSignature,
      model.ticksPerQuarter,
    )} / ${formatBarBeatPosition(model.totalTicks, model.timeSignature, model.ticksPerQuarter)}`,
  );
});
