import assert from "node:assert/strict";
import test from "node:test";
import {
  collectScoreBeautyReviewMetrics,
  SCORE_BEAUTY_REVIEW_BATCHES,
} from "./generate-score-beauty-review-test-helpers.js";

test("generateScore improves score-beauty evidence in the fourth review batch", () => {
  const metrics = collectScoreBeautyReviewMetrics(SCORE_BEAUTY_REVIEW_BATCHES.fourth);

  assert.equal(metrics.seedCount, 4);
  assert.ok(metrics.uniqueInitialSubjectRhythmPatternCount >= 3);
  assert.ok(metrics.uniqueInitialSubjectClimaxIndexCount >= 2);
  assert.ok(metrics.topSubjectFragmentFamilyShare <= 0.75);
  assert.ok(metrics.unresolvedEntrySevereIntervalQuarters <= 48);
  assert.ok(metrics.counterSubjectIdentityRetentionTotal >= 3.56);
});
