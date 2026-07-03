import assert from "node:assert/strict";
import {
  collectScoreBeautyReviewMetrics,
  SCORE_BEAUTY_REVIEW_BATCHES,
} from "./generate-score-beauty-review-test-helpers.js";
import { reviewTest } from "./test-profile.js";

reviewTest("generateScore keeps score-beauty CI evidence in the first review batch", () => {
  const metrics = collectScoreBeautyReviewMetrics(SCORE_BEAUTY_REVIEW_BATCHES.first);

  assert.equal(metrics.seedCount, 4);
  assert.ok(metrics.uniqueInitialSubjectRhythmPatternCount >= 3);
  assert.ok(metrics.uniqueInitialSubjectClimaxIndexCount >= 2);
  assert.ok(metrics.topSubjectFragmentFamilyShare <= 0.5);
  assert.ok(metrics.unresolvedEntrySevereIntervalQuarters <= 26.5);
  assert.ok(metrics.counterSubjectIdentityRetentionTotal >= 2.725);
});
