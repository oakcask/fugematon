import assert from "node:assert/strict";
import test from "node:test";
import {
  REPRESENTATIVE_REVIEW_SEEDS,
  REVIEW_LENGTH_TICKS,
  ROTATION_ROBUSTNESS_DIAGNOSTICS_PROFILE,
} from "./constants.js";
import { generateScore } from "./generate.js";
import { assertRotationRobustnessMarginGate } from "./generate-phase5-margin-gates-test-helpers.js";

test("generateScore applies phase-5.11 margin gates across fixed seeds", () => {
  for (const { seed } of REPRESENTATIVE_REVIEW_SEEDS) {
    assertRotationRobustnessMarginGate(seed);
  }
});

test("generateScore applies phase-5.11 modal rotation seed gates", () => {
  for (const [seed, profile] of Object.entries(ROTATION_ROBUSTNESS_DIAGNOSTICS_PROFILE.modalRotationSeeds)) {
    const output = generateScore({ seed, lengthTicks: REVIEW_LENGTH_TICKS, selectionModel: "baseline" });

    assert.ok(output.diagnostics.counterSubjectIdentityRetention >= profile.minCounterSubjectIdentityRetention);
    assert.ok(output.diagnostics.sameDirectionMotionCount <= profile.maxSameDirectionMotionCount);
    assert.ok(output.diagnostics.leapRecoveryMisses <= profile.maxLeapRecoveryMisses);
    assert.ok(output.diagnostics.modalContextCount >= profile.minModalContextCount);
  }
});
