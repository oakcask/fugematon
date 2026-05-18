import assert from "node:assert/strict";
import test from "node:test";
import {
  collectPhase12RepetitionMetrics,
  PHASE_12_REPETITION_REVIEW_BATCH_B,
} from "./generate-phase-review-test-helpers.js";

test("generateScore completes phase-12 repetition adoption across review seeds batch B", () => {
  const metrics = collectPhase12RepetitionMetrics(PHASE_12_REPETITION_REVIEW_BATCH_B);

  assert.equal(metrics.seedCount, 11);
  assert.ok(metrics.variantTopEntryPatternFamilyCount <= metrics.baselineTopEntryPatternFamilyCount + 4);
  assert.ok(metrics.variantUnsupportedThinningRuns <= metrics.baselineUnsupportedThinningRuns / 2);
});
