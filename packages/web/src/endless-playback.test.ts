import assert from "node:assert/strict";
import test from "node:test";
import {
  adoptedSegmentSessionSeed,
  computeEndlessPrefetchDeadlineMs,
  isSegmentChainingPlaybackMode,
  segmentBoundaryPauseMs,
  segmentRequestSeed,
} from "./endless-playback.js";

test("endless prefetch deadline uses the remaining playback window", () => {
  assert.equal(
    computeEndlessPrefetchDeadlineMs({
      modelTotalSeconds: 164.5,
      playbackSecond: 0.12,
      boundaryPauseMs: 750,
      minimumDeadlineMs: 10_000,
    }),
    163_630,
  );
});

test("endless prefetch deadline keeps the minimum when playback is near the boundary", () => {
  assert.equal(
    computeEndlessPrefetchDeadlineMs({
      modelTotalSeconds: 164.5,
      playbackSecond: 163,
      boundaryPauseMs: 750,
      minimumDeadlineMs: 10_000,
    }),
    10_000,
  );
});

test("endless prefetch deadline clamps completed playback to the minimum", () => {
  assert.equal(
    computeEndlessPrefetchDeadlineMs({
      modelTotalSeconds: 164.5,
      playbackSecond: 200,
      boundaryPauseMs: 750,
      minimumDeadlineMs: 10_000,
    }),
    10_000,
  );
});

test("continuous fugue participates in segment chaining without an audible boundary pause", () => {
  assert.equal(isSegmentChainingPlaybackMode("continuous-fugue"), true);
  assert.equal(segmentBoundaryPauseMs("continuous-fugue", 750), 0);
});

test("endless program keeps an audible segment boundary pause", () => {
  assert.equal(isSegmentChainingPlaybackMode("endless-program"), true);
  assert.equal(segmentBoundaryPauseMs("endless-program", 750), 750);
});

test("regenerative cycle keeps the same audible segment boundary pause as endless program", () => {
  assert.equal(isSegmentChainingPlaybackMode("regenerative-cycle"), true);
  assert.equal(segmentBoundaryPauseMs("regenerative-cycle", 750), 750);
});

test("continuous fugue prefetch deadline does not reserve boundary pause time", () => {
  assert.equal(
    computeEndlessPrefetchDeadlineMs({
      modelTotalSeconds: 164.5,
      playbackSecond: 0.12,
      boundaryPauseMs: segmentBoundaryPauseMs("continuous-fugue", 750),
      minimumDeadlineMs: 10_000,
    }),
    164_380,
  );
});

test("audible boundary modes reserve boundary pause time in the prefetch deadline", () => {
  assert.equal(
    computeEndlessPrefetchDeadlineMs({
      modelTotalSeconds: 164.5,
      playbackSecond: 0.12,
      boundaryPauseMs: segmentBoundaryPauseMs("endless-program", 750),
      minimumDeadlineMs: 10_000,
    }),
    163_630,
  );
  assert.equal(
    computeEndlessPrefetchDeadlineMs({
      modelTotalSeconds: 164.5,
      playbackSecond: 0.12,
      boundaryPauseMs: segmentBoundaryPauseMs("regenerative-cycle", 750),
      minimumDeadlineMs: 10_000,
    }),
    163_630,
  );
});

test("continuous fugue prefetch keeps the session seed for snapshot-based continuation", () => {
  assert.equal(
    segmentRequestSeed({
      mode: "continuous-fugue",
      sessionSeed: "fugue-smoke",
      segmentIndex: 1,
    }),
    "fugue-smoke",
  );
});

test("audible boundary modes still derive per-segment seeds", () => {
  assert.equal(
    segmentRequestSeed({
      mode: "endless-program",
      sessionSeed: "fugue-smoke",
      segmentIndex: 1,
    }),
    "fugue-smoke-segment-1",
  );
  assert.equal(
    segmentRequestSeed({
      mode: "regenerative-cycle",
      sessionSeed: "fugue-smoke-segment-1",
      segmentIndex: 2,
    }),
    "fugue-smoke-segment-1-segment-2",
  );
});

test("continuous fugue adoption preserves the visible session seed", () => {
  assert.equal(
    adoptedSegmentSessionSeed({
      mode: "continuous-fugue",
      currentSessionSeed: "fugue-smoke",
      responseSeed: "fugue-smoke-segment-1",
    }),
    "fugue-smoke",
  );
});

test("audible boundary adoption uses the generated segment seed", () => {
  assert.equal(
    adoptedSegmentSessionSeed({
      mode: "endless-program",
      currentSessionSeed: "fugue-smoke",
      responseSeed: "fugue-smoke-segment-1",
    }),
    "fugue-smoke-segment-1",
  );
  assert.equal(
    adoptedSegmentSessionSeed({
      mode: "regenerative-cycle",
      currentSessionSeed: "fugue-smoke",
      responseSeed: "fugue-smoke-segment-1",
    }),
    "fugue-smoke-segment-1",
  );
});
