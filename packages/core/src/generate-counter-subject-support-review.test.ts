import test from "node:test";
import {
  assertCounterSubjectReviewSeedsExposePressure,
  COUNTER_SUBJECT_HIGH_COLLISION_REVIEW_SEEDS,
} from "./generate-counter-subject-support-review-test-helpers.js";

test("counter-subject support high-collision review seeds stay under the repaired support-collision ceiling", () => {
  assertCounterSubjectReviewSeedsExposePressure(COUNTER_SUBJECT_HIGH_COLLISION_REVIEW_SEEDS, {
    minWindowCount: 170,
    minPreservedWindowCount: 60,
    minTradeoffWindowCount: 105,
    minWeakWindowCount: 4,
    maxSupportCollisionCount: 880,
  });
});
