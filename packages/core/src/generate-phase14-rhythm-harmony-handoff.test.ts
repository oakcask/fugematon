import assert from "node:assert/strict";
import test from "node:test";
import { TICKS_PER_QUARTER } from "./constants.js";
import { generateScore } from "./generate.js";

const PHASE_14_REOPENED_REVIEW_SEEDS = [
  "fugue-smoke",
  "bach-001",
  "bright-answer",
  "dark-episode",
  "ornament-test",
  "long-arc",
  "circle-fifths",
  "tight-stretto",
  "modal-cadence",
  "dense-modal",
  "seed-1dxb2n8-1miapx7",
] as const;

test("fugue-smoke keeps the reopened rhythm and harmony blockers score-addressable", () => {
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

  assert.deepEqual(
    transitionWindows.map((window) => ({
      kind: window.kind,
      measureOffsetTicks: window.measureOffsetTicks,
      classification: window.classification,
      state: window.state,
    })),
    [
      {
        kind: "entry-start",
        measureOffsetTicks: TICKS_PER_QUARTER * 3,
        classification: "pickup-or-cross-metric",
        state: "episode",
      },
      {
        kind: "phrase-boundary",
        measureOffsetTicks: TICKS_PER_QUARTER * 3,
        classification: "review-required",
        state: "episode",
      },
      {
        kind: "harmonic-anchor",
        measureOffsetTicks: TICKS_PER_QUARTER * 3,
        classification: "review-required",
        state: "episode",
      },
    ],
  );
  assert.equal(harmonicWindow?.sequencePattern, "ascending-step");
  assert.equal(harmonicWindow?.fragmentTransform, "contrary-motion");
  assert.equal(harmonicWindow?.classification, "review-required");
  assert.equal(harmonicWindow?.response, "generator-response-required");
  assert.equal(acceptanceWindow?.response, "generator-response-required");
});

test("phase 14 reopened review seeds expose short-episode harmonic-continuity pressure", () => {
  const summaries = PHASE_14_REOPENED_REVIEW_SEEDS.map((seed) => {
    const diagnostics = generateScore({
      seed,
      lengthTicks: TICKS_PER_QUARTER * 288,
    }).diagnostics;

    return {
      seed,
      focusedWindowCount: diagnostics.harmonicContinuity.focusedWindowCount,
      generatorResponseWindowCount: diagnostics.harmonicContinuity.windows.filter(
        (window) => window.response === "generator-response-required",
      ).length,
      subjectIdentityViolations: diagnostics.subjectIdentityViolations,
    };
  });

  assert.ok(
    summaries.every((summary) => summary.focusedWindowCount > 0),
    JSON.stringify(summaries, null, 2),
  );
  assert.ok(
    summaries.every((summary) => summary.generatorResponseWindowCount > 0),
    JSON.stringify(summaries, null, 2),
  );
  assert.ok(
    summaries.every((summary) => summary.subjectIdentityViolations === 0),
    JSON.stringify(summaries, null, 2),
  );
});
