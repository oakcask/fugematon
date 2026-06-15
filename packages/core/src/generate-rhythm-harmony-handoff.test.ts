import assert from "node:assert/strict";
import test from "node:test";
import { TICKS_PER_QUARTER } from "./constants.js";
import { cachedGenerateScore as generateScore } from "./generate-test-helpers.js";

test("fugue-smoke repairs the reopened rhythm and harmony handoff", () => {
  const diagnostics = generateScore({
    seed: "fugue-smoke",
    lengthTicks: TICKS_PER_QUARTER * 288,
  }).diagnostics;
  const transitionTick = TICKS_PER_QUARTER * 19;
  const transitionWindows = diagnostics.meterConsistencyReview.windows.filter(
    (window) => window.tick === transitionTick,
  );
  const harmonicWindow = diagnostics.harmonicContinuity.windows.find((window) => window.startTick === transitionTick);
  const acceptanceWindow = diagnostics.scoreWindowAcceptance.windows.find(
    (window) => window.kind === "harmonic-continuity" && window.startTick === transitionTick,
  );
  const harmonicSonorityFailures = diagnostics.scoreWindowAcceptance.windows.filter(
    (window) =>
      window.kind === "harmonic-sonority" &&
      transitionTick <= window.startTick &&
      window.startTick < transitionTick + TICKS_PER_QUARTER * 10 &&
      window.response === "generator-response-required",
  );

  if (harmonicWindow === undefined) {
    assert.ok(transitionWindows.length > 0);
    assert.equal(acceptanceWindow, undefined);
    assert.deepEqual(harmonicSonorityFailures, []);
    return;
  }

  assert.ok(
    transitionWindows.some(
      (window) =>
        window.kind === "entry-start" &&
        window.measureOffsetTicks === TICKS_PER_QUARTER * 3 &&
        window.classification === "pickup-or-cross-metric" &&
        window.state === "episode",
    ),
  );
  assert.ok(
    transitionWindows.some(
      (window) =>
        window.kind === "phrase-boundary" &&
        window.measureOffsetTicks === TICKS_PER_QUARTER * 3 &&
        window.classification === "pickup-or-cross-metric" &&
        window.state === "episode",
    ),
  );
  assert.ok(
    transitionWindows.some(
      (window) =>
        window.kind === "harmonic-anchor" &&
        window.measureOffsetTicks === TICKS_PER_QUARTER * 3 &&
        window.classification === "pickup-or-cross-metric" &&
        window.state === "episode",
    ),
  );
  assert.equal(harmonicWindow?.sequencePattern, "circle-fifths");
  assert.equal(harmonicWindow?.fragmentTransform, "inversion");
  assert.equal(harmonicWindow?.classification, "audible-progression");
  assert.equal(harmonicWindow?.response, "accepted-context");
  assert.equal(acceptanceWindow?.response, "accepted-context");
  assert.deepEqual(harmonicSonorityFailures, []);
});

test("fugue-smoke handoff diagnostics expose local transition-rhythm evidence", () => {
  const diagnostics = generateScore({
    seed: "fugue-smoke",
    lengthTicks: TICKS_PER_QUARTER * 288,
  }).diagnostics;
  const transitionTick = TICKS_PER_QUARTER * 19;
  const transitionWindows = diagnostics.meterConsistencyReview.windows.filter(
    (window) => window.tick === transitionTick,
  );
  const transitionRhythmWindow = diagnostics.transitionRhythmReview.windows.find(
    (window) => window.startTick === transitionTick,
  );
  const acceptanceWindow = diagnostics.scoreWindowAcceptance.windows.find(
    (window) => window.kind === "transition-rhythm" && window.startTick === transitionTick,
  );

  assert.equal(transitionWindows.length, 3);
  assert.ok(
    transitionWindows.every(
      (window) =>
        window.measureOffsetTicks === TICKS_PER_QUARTER * 3 && window.classification === "pickup-or-cross-metric",
    ),
  );
  if (transitionRhythmWindow === undefined) {
    assert.equal(acceptanceWindow, undefined);
    return;
  }
  assert.deepEqual(transitionRhythmWindow.boundaryKinds.sort(), ["entry-start"]);
  assert.equal(transitionRhythmWindow.classification, "prepared-pickup");
  assert.equal(transitionRhythmWindow.response, "accepted-context");
  assert.equal(transitionRhythmWindow.activeVoiceCount, 4);
  assert.ok(transitionRhythmWindow.attackCount >= 12);
  assert.ok(transitionRhythmWindow.shortAttackCount >= 6);
  assert.ok(transitionRhythmWindow.roleMix.includes("subject-fragment"));
  assert.ok(transitionRhythmWindow.roleMix.includes("counter-subject"));
  assert.ok(transitionRhythmWindow.supportKinds.includes("sustained-pickup"));
  assert.equal(acceptanceWindow?.classification, "prepared-pickup");
  assert.equal(acceptanceWindow?.response, "accepted-context");
});
