import assert from "node:assert/strict";
import test from "node:test";
import {
  collectScoreBeautyReviewMetrics,
  SCORE_BEAUTY_REVIEW_BATCHES,
} from "./generate-score-beauty-review-test-helpers.js";

test("generateScore keeps score-beauty CI evidence in the second review batch", () => {
  const metrics = collectScoreBeautyReviewMetrics(SCORE_BEAUTY_REVIEW_BATCHES.second);

  assert.equal(metrics.seedCount, 4);
  assert.ok(metrics.uniqueInitialSubjectRhythmPatternCount >= 3);
  assert.ok(metrics.uniqueInitialSubjectClimaxIndexCount >= 3);
  assert.ok(metrics.topSubjectFragmentFamilyShare <= 0.5);
  assert.ok(metrics.unresolvedEntrySevereIntervalQuarters <= 30);
  assert.ok(metrics.counterSubjectIdentityRetentionTotal >= 2.137);
});
