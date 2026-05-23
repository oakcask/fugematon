import assert from "node:assert/strict";
import test from "node:test";
import { PHASE_5_11_DIAGNOSTICS_PROFILE, PHASE_5_LENGTH_TICKS, PHASE_5_REVIEW_SEEDS } from "./constants.js";
import { generateScore } from "./generate.js";
import { assertPhase511MarginGate } from "./generate-phase5-margin-gates-test-helpers.js";

test("generateScore applies phase-5.11 margin gates across fixed seeds", () => {
  for (const { seed } of PHASE_5_REVIEW_SEEDS) {
    assertPhase511MarginGate(seed);
  }
});

test("generateScore applies phase-5.11 modal rotation seed gates", () => {
  for (const [seed, profile] of Object.entries(PHASE_5_11_DIAGNOSTICS_PROFILE.modalRotationSeeds)) {
    const output = generateScore({ seed, lengthTicks: PHASE_5_LENGTH_TICKS, selectionModel: "baseline" });

    assert.ok(output.diagnostics.counterSubjectIdentityRetention >= profile.minCounterSubjectIdentityRetention);
    assert.ok(output.diagnostics.sameDirectionMotionCount <= profile.maxSameDirectionMotionCount);
    assert.ok(output.diagnostics.leapRecoveryMisses <= profile.maxLeapRecoveryMisses);
    assert.ok(output.diagnostics.modalContextCount >= profile.minModalContextCount);
  }
});
