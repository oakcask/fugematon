import assert from "node:assert/strict";
import test from "node:test";
import { REVIEW_LENGTH_TICKS } from "./constants.js";
import { cachedGenerateScore as generateScore } from "./generate-test-helpers.js";

test("generateScore preserves fifth-climb protected seed quality", () => {
  const protectedSeeds = [
    ["modal-answer", 100, 0.557],
    ["bright-answer", 160, 0.827],
    ["contrary-motion", 120, 0.669],
    ["modal-dorian", 160, 0.579],
    ["dense-modal", 120, 0.512],
    ["angular-answer", 100, 0.504],
  ] as const;

  for (const [seed, maxLeapRecoveryMisses, minCounterSubjectIdentityRetention] of protectedSeeds) {
    const output = generateScore({ seed, lengthTicks: REVIEW_LENGTH_TICKS, selectionModel: "baseline" });

    assert.ok(output.diagnostics.leapRecoveryMisses <= maxLeapRecoveryMisses);
    assert.ok(output.diagnostics.counterSubjectIdentityRetention >= minCounterSubjectIdentityRetention);
  }
});
