import assert from "node:assert/strict";
import { REVIEW_LENGTH_TICKS, ROTATION_ROBUSTNESS_DIAGNOSTICS_PROFILE } from "./constants.js";
import { cachedGenerateScore as generateScore } from "./generate-test-helpers.js";
import { reviewTest } from "./test-profile.js";

reviewTest("generateScore applies modal rotation margin gates", () => {
  for (const [seed, profile] of Object.entries(ROTATION_ROBUSTNESS_DIAGNOSTICS_PROFILE.modalRotationSeeds)) {
    const output = generateScore({ seed, lengthTicks: REVIEW_LENGTH_TICKS, selectionModel: "baseline" });

    assert.ok(output.diagnostics.counterSubjectIdentityRetention >= profile.minCounterSubjectIdentityRetention);
    assert.ok(output.diagnostics.sameDirectionMotionCount <= profile.maxSameDirectionMotionCount);
    assert.ok(output.diagnostics.leapRecoveryMisses <= profile.maxLeapRecoveryMisses);
    assert.ok(output.diagnostics.modalContextCount >= profile.minModalContextCount);
  }
});
