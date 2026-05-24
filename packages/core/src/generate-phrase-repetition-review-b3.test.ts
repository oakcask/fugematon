import assert from "node:assert/strict";
import test from "node:test";
import {
  collectPhraseRepetitionMetrics,
  PHRASE_REPETITION_REVIEW_BATCH_B,
} from "./generate-quality-review-test-helpers.js";

test("generateScore completes phrase-repetition adoption across review seeds batch B2b", () => {
  const metrics = collectPhraseRepetitionMetrics(PHRASE_REPETITION_REVIEW_BATCH_B.slice(9));

  assert.equal(metrics.seedCount, 2);
  assert.ok(metrics.variantTopEntryPatternFamilyCount <= metrics.baselineTopEntryPatternFamilyCount - 1);
  assert.ok(metrics.variantUnsupportedThinningRuns <= metrics.baselineUnsupportedThinningRuns / 2);
});
