import assert from "node:assert/strict";
import test from "node:test";
import {
  collectPhase12RepetitionMetrics,
  PHASE_12_REPETITION_REVIEW_BATCH_A,
} from "./generate-phase-review-test-helpers.js";

test("generateScore completes phase-12 repetition adoption across review seeds batch A1b", () => {
  assertPhase12RepetitionReviewBatch(PHASE_12_REPETITION_REVIEW_BATCH_A.slice(3, 6), 3, -3);
});

function assertPhase12RepetitionReviewBatch(
  seeds: readonly string[],
  expectedSeedCount: number,
  maximumTopEntryPatternFamilyDelta: number,
): void {
  const metrics = collectPhase12RepetitionMetrics(seeds);

  assert.equal(metrics.seedCount, expectedSeedCount);
  assert.ok(
    metrics.variantTopEntryPatternFamilyCount <=
      metrics.baselineTopEntryPatternFamilyCount + maximumTopEntryPatternFamilyDelta,
  );
  assert.ok(metrics.variantUnsupportedThinningRuns <= metrics.baselineUnsupportedThinningRuns / 2);
}
