import test from "node:test";
import {
  assertCounterSubjectReviewSeedsExposePressure,
  COUNTER_SUBJECT_HIGH_COLLISION_REVIEW_SEEDS,
} from "./generate-phase14-counter-subject-review-helpers.js";

test("Phase 14 counter-subject high-collision review seeds stay under the repaired support-collision ceiling", () => {
  assertCounterSubjectReviewSeedsExposePressure(COUNTER_SUBJECT_HIGH_COLLISION_REVIEW_SEEDS, {
    minWindowCount: 180,
    minPreservedWindowCount: 65,
    minTradeoffWindowCount: 110,
    minWeakWindowCount: 4,
    maxSupportCollisionCount: 880,
  });
});
