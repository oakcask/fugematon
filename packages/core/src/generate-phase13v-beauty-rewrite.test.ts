import assert from "node:assert/strict";
import test from "node:test";
import {
  collectPhase13VBeautyReviewMetrics,
  PHASE_13V_FOCUSED_REVIEW_SEEDS,
} from "./generate-phase13v-beauty-rewrite-test-helpers.js";

test("Phase 13V focused review seeds keep line-agency and long-run beauty blockers observable", () => {
  const metrics = collectPhase13VBeautyReviewMetrics(PHASE_13V_FOCUSED_REVIEW_SEEDS);

  assert.equal(metrics.seedCount, PHASE_13V_FOCUSED_REVIEW_SEEDS.length);
  assert.ok(metrics.durationBasedLockstepReviewSeedCount > 0);
  assert.ok(metrics.voicePairSpanCount >= metrics.seedCount * 6);
  assert.ok(metrics.entryFormulaSummaryCount >= metrics.seedCount * 2);
  assert.ok(metrics.reviewRequiredEntryFormulaCount > 0);
  assert.ok(metrics.reviewRequiredEntryFormulaCount + metrics.justifiedEntryFormulaCount > 0);
  assert.ok(metrics.counterSubjectWindowCount >= metrics.seedCount * 8);
  assert.ok(metrics.preservedCounterSubjectWindowCount > 0);
  assert.ok(metrics.tradeoffCounterSubjectWindowCount > 0);
  assert.ok(metrics.fragmentTransformationClaimCount >= metrics.seedCount);
  assert.ok(metrics.topFragmentFunctionShareTotal > 0);
});
