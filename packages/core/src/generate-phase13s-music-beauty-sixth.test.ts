import assert from "node:assert/strict";
import test from "node:test";
import {
  collectScoreBeautyReviewMetrics,
  SCORE_BEAUTY_REVIEW_BATCHES,
} from "./generate-phase13s-music-beauty-test-helpers.js";

test("generateScore improves Phase 13S music-beauty evidence in the sixth review batch", () => {
  const metrics = collectScoreBeautyReviewMetrics(SCORE_BEAUTY_REVIEW_BATCHES.sixth);

  assert.equal(metrics.seedCount, 3);
  assert.ok(metrics.uniqueInitialSubjectRhythmPatternCount >= 2);
  assert.ok(metrics.uniqueInitialSubjectClimaxIndexCount >= 2);
  assert.ok(metrics.topSubjectFragmentFamilyShare <= 2 / 3);
  assert.ok(metrics.unresolvedEntrySevereIntervalQuarters <= 39);
  assert.ok(metrics.counterSubjectIdentityRetentionTotal >= 2.03);
});
