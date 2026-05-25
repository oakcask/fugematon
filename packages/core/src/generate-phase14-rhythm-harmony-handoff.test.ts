import assert from "node:assert/strict";
import test from "node:test";
import { TICKS_PER_QUARTER } from "./constants.js";
import { generateScore } from "./generate.js";

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
  assert.equal(harmonicWindow?.sequencePattern, "ascending-step");
  assert.equal(harmonicWindow?.fragmentTransform, "contrary-motion");
  assert.equal(harmonicWindow?.classification, "audible-progression");
  assert.equal(harmonicWindow?.response, "accepted-context");
  assert.equal(acceptanceWindow?.response, "accepted-context");
});
