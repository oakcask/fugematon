import assert from "node:assert/strict";
import test from "node:test";
import {
  collectScoreBeautyReviewMetrics,
  SCORE_BEAUTY_REVIEW_BATCHES,
} from "./generate-score-beauty-review-test-helpers.js";

test("generateScore improves score-beauty evidence in the fifth review batch", () => {
  const metrics = collectScoreBeautyReviewMetrics(SCORE_BEAUTY_REVIEW_BATCHES.fifth);

  assert.equal(metrics.seedCount, 3);
  assert.ok(metrics.uniqueInitialSubjectRhythmPatternCount >= 2);
  assert.ok(metrics.uniqueInitialSubjectClimaxIndexCount >= 1);
  assert.ok(metrics.topSubjectFragmentFamilyShare <= 2 / 3);
  assert.ok(metrics.unresolvedEntrySevereIntervalQuarters <= 13);
  assert.ok(metrics.counterSubjectIdentityRetentionTotal >= 1.95);
});
