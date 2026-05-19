import assert from "node:assert/strict";
import test from "node:test";
import {
  collectPhase12RepetitionMetrics,
  PHASE_12_REPETITION_REVIEW_BATCH_A,
} from "./generate-phase-review-test-helpers.js";

test("generateScore completes phase-12 repetition adoption across review seeds batch A1", () => {
  assertPhase12RepetitionReviewBatch(PHASE_12_REPETITION_REVIEW_BATCH_A.slice(0, 6), 6, -6);
});

test("generateScore completes phase-12 repetition adoption across review seeds batch A2", () => {
  assertPhase12RepetitionReviewBatch(PHASE_12_REPETITION_REVIEW_BATCH_A.slice(6), 5, -3);
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
