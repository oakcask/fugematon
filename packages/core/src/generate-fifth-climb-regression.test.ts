import assert from "node:assert/strict";
import { REVIEW_LENGTH_TICKS } from "./constants.js";
import { cachedGenerateScore as generateScore } from "./generate-test-helpers.js";
import { reviewTest } from "./test-profile.js";

reviewTest("generateScore preserves fifth-climb interval regression ceilings", () => {
  const regressionSeeds = [
    ["fugue-smoke", 140, 98, 72],
    ["lyrical-line", 136, 98, 72],
    ["modal-cadence", 149, 101, 70],
    ["wide-key", 130, 96, 72],
    ["tight-stretto", 144, 96, 72],
    ["contrary-answer", 137, 96, 72],
  ] as const;

  for (const [seed, maxInstabilityCount, maxSevereIntervalCount, maxUnresolvedSevereIntervalCount] of regressionSeeds) {
    const output = generateScore({ seed, lengthTicks: REVIEW_LENGTH_TICKS, selectionModel: "baseline" });

    assert.ok(output.diagnostics.entrySupportInstabilityCount <= maxInstabilityCount);
    assert.ok(output.diagnostics.severeEntryIntervalCount <= maxSevereIntervalCount);
    assert.ok(output.diagnostics.unresolvedSevereEntryIntervalCount <= maxUnresolvedSevereIntervalCount);
  }
});
