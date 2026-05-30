import assert from "node:assert/strict";
import test from "node:test";
import {
  collectPhraseRepetitionMetrics,
  PHRASE_REPETITION_REVIEW_BATCH_A,
} from "./generate-quality-review-test-helpers.js";

test("generateScore completes phrase-repetition adoption across review seeds batch A1a", () => {
  assertPhraseRepetitionReviewBatch(PHRASE_REPETITION_REVIEW_BATCH_A.slice(0, 3), 3, -3);
});

function assertPhraseRepetitionReviewBatch(
  seeds: readonly string[],
  expectedSeedCount: number,
  maximumTopEntryPatternFamilyDelta: number,
): void {
  const metrics = collectPhraseRepetitionMetrics(seeds);

  assert.equal(metrics.seedCount, expectedSeedCount);
  assert.ok(
    metrics.variantTopEntryPatternFamilyCount <=
      metrics.baselineTopEntryPatternFamilyCount + maximumTopEntryPatternFamilyDelta,
  );
  assert.ok(metrics.variantUnsupportedThinningRuns <= Math.max(1, metrics.baselineUnsupportedThinningRuns / 2));
}
