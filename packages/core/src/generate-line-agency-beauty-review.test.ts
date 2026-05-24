import assert from "node:assert/strict";
import test from "node:test";
import {
  collectLineAgencyBeautyReviewMetrics,
  FOCUSED_LINE_AGENCY_REVIEW_SEEDS,
} from "./generate-line-agency-beauty-review-test-helpers.js";

test("line-agency focused review seeds keep line-agency and long-run beauty blockers observable", () => {
  const metrics = collectLineAgencyBeautyReviewMetrics(FOCUSED_LINE_AGENCY_REVIEW_SEEDS);

  assert.equal(metrics.seedCount, FOCUSED_LINE_AGENCY_REVIEW_SEEDS.length);
  assert.ok(metrics.durationBasedLockstepReviewSeedCount > 0);
  assert.ok(metrics.voicePairSpanCount >= metrics.seedCount * 6);
  assert.ok(metrics.entryFormulaSummaryCount >= 1);
  assert.equal(metrics.reviewRequiredEntryFormulaCount, 0);
  assert.ok(metrics.reviewRequiredEntryFormulaCount + metrics.justifiedEntryFormulaCount > 0);
  assert.ok(metrics.counterSubjectWindowCount >= metrics.seedCount * 8);
  assert.ok(metrics.preservedCounterSubjectWindowCount > 0);
  assert.ok(metrics.tradeoffCounterSubjectWindowCount > 0);
  assert.ok(metrics.fragmentTransformationClaimCount >= metrics.seedCount);
  assert.ok(metrics.topFragmentFunctionShareTotal > 0);
});
