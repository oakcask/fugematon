import assert from "node:assert/strict";
import test from "node:test";
import { PHASE_5_LENGTH_TICKS } from "./constants.js";
import { generateScore } from "./generate.js";

test("generateScore preserves phase-7 fifth-climb protected seed quality", () => {
  const protectedSeeds = [
    ["modal-answer", 33, 0.608],
    ["bright-answer", 31, 0.9],
    ["contrary-motion", 29, 0.88],
    ["modal-dorian", 34, 0.58],
    ["dense-modal", 33, 0.573],
    ["angular-answer", 33, 0.573],
  ] as const;

  for (const [seed, maxLeapRecoveryMisses, minCounterSubjectIdentityRetention] of protectedSeeds) {
    const output = generateScore({ seed, lengthTicks: PHASE_5_LENGTH_TICKS, selectionModel: "baseline" });

    assert.ok(output.diagnostics.leapRecoveryMisses <= maxLeapRecoveryMisses);
    assert.ok(output.diagnostics.counterSubjectIdentityRetention >= minCounterSubjectIdentityRetention);
  }
});
