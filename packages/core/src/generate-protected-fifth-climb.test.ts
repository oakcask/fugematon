import assert from "node:assert/strict";
import test from "node:test";
import { REVIEW_LENGTH_TICKS } from "./constants.js";
import { generateScore } from "./generate.js";

test("generateScore preserves fifth-climb protected seed quality", () => {
  const protectedSeeds = [
    ["modal-answer", 33, 0.602],
    ["bright-answer", 32, 0.9],
    ["contrary-motion", 29, 0.877],
    ["modal-dorian", 34, 0.58],
    ["dense-modal", 33, 0.573],
    ["angular-answer", 33, 0.573],
  ] as const;

  for (const [seed, maxLeapRecoveryMisses, minCounterSubjectIdentityRetention] of protectedSeeds) {
    const output = generateScore({ seed, lengthTicks: REVIEW_LENGTH_TICKS, selectionModel: "baseline" });

    assert.ok(output.diagnostics.leapRecoveryMisses <= maxLeapRecoveryMisses);
    assert.ok(output.diagnostics.counterSubjectIdentityRetention >= minCounterSubjectIdentityRetention);
  }
});
