import test from "node:test";
import {
  assertPhase14CounterSubjectReviewSeedsExposePressure,
  PHASE_14_COUNTER_SUBJECT_HIGH_COLLISION_REVIEW_SEEDS,
} from "./generate-phase14-counter-subject-review-helpers.js";

test("Phase 14 counter-subject high-collision review seeds keep support pressure visible", () => {
  assertPhase14CounterSubjectReviewSeedsExposePressure(PHASE_14_COUNTER_SUBJECT_HIGH_COLLISION_REVIEW_SEEDS, {
    minWindowCount: 180,
    minTradeoffWindowCount: 170,
    minWeakWindowCount: 4,
    minSupportCollisionCount: 1_500,
    maxPreservedWindowCount: 12,
  });
});
