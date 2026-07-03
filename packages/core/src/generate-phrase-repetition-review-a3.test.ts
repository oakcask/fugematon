import assert from "node:assert/strict";
import {
  collectPhraseRepetitionMetrics,
  PHRASE_REPETITION_REVIEW_BATCH_A,
} from "./generate-quality-review-test-helpers.js";
import { reviewTest } from "./test-profile.js";

reviewTest("generateScore completes phrase-repetition adoption across review seeds batch A2b", () => {
  const metrics = collectPhraseRepetitionMetrics(PHRASE_REPETITION_REVIEW_BATCH_A.slice(9));

  assert.equal(metrics.seedCount, 2);
  assert.ok(metrics.variantTopEntryPatternFamilyCount <= metrics.baselineTopEntryPatternFamilyCount - 3);
  assert.ok(metrics.variantUnsupportedThinningRuns <= Math.max(1, metrics.baselineUnsupportedThinningRuns / 2));
});
