import {
  assertCounterSubjectReviewSeedsExposePressure,
  COUNTER_SUBJECT_HIGH_COLLISION_REVIEW_SEEDS,
} from "./generate-counter-subject-support-review-test-helpers.js";
import { reviewTest } from "./test-profile.js";

reviewTest(
  "counter-subject support high-collision review seeds stay under the repaired support-collision ceiling",
  () => {
    assertCounterSubjectReviewSeedsExposePressure(COUNTER_SUBJECT_HIGH_COLLISION_REVIEW_SEEDS, {
      minWindowCount: 170,
      minPreservedWindowCount: 2,
      minTradeoffWindowCount: 105,
      minWeakWindowCount: 4,
      maxSupportCollisionCount: 1852,
    });
  },
);
