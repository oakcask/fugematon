import assert from "node:assert/strict";
import test from "node:test";
import {
  collectScoreBeautyReviewMetrics,
  SCORE_BEAUTY_REVIEW_BATCHES,
} from "./generate-score-beauty-review-test-helpers.js";

test("generateScore improves score-beauty evidence in the first review batch", () => {
  const metrics = collectScoreBeautyReviewMetrics(SCORE_BEAUTY_REVIEW_BATCHES.first);

  assert.equal(metrics.seedCount, 4);
  assert.ok(metrics.uniqueInitialSubjectRhythmPatternCount >= 4);
  assert.ok(metrics.uniqueInitialSubjectClimaxIndexCount >= 3);
  assert.ok(metrics.topSubjectFragmentFamilyShare <= 0.5);
  assert.ok(metrics.unresolvedEntrySevereIntervalQuarters <= 18);
  assert.ok(metrics.counterSubjectIdentityRetentionTotal >= 3.5);
});
