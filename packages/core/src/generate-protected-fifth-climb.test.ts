import assert from "node:assert/strict";
import test from "node:test";
import { REVIEW_LENGTH_TICKS } from "./constants.js";
import { generateScore } from "./generate.js";

test("generateScore preserves fifth-climb protected seed quality", () => {
  const protectedSeeds = [
    ["modal-answer", 68, 0.58],
    ["bright-answer", 56, 0.85],
    ["contrary-motion", 90, 0.669],
    ["modal-dorian", 73, 0.579],
    ["dense-modal", 38, 0.572],
    ["angular-answer", 51, 0.504],
  ] as const;

  for (const [seed, maxLeapRecoveryMisses, minCounterSubjectIdentityRetention] of protectedSeeds) {
    const output = generateScore({ seed, lengthTicks: REVIEW_LENGTH_TICKS, selectionModel: "baseline" });

    assert.ok(output.diagnostics.leapRecoveryMisses <= maxLeapRecoveryMisses);
    assert.ok(output.diagnostics.counterSubjectIdentityRetention >= minCounterSubjectIdentityRetention);
  }
});
