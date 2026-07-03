import {
  assertCounterSubjectReviewSeedsExposePressure,
  COUNTER_SUBJECT_MODAL_REVIEW_SEEDS,
} from "./generate-counter-subject-support-review-test-helpers.js";
import { reviewTest } from "./test-profile.js";

reviewTest("counter-subject support modal review seeds stay under the repaired support-collision ceiling", () => {
  assertCounterSubjectReviewSeedsExposePressure(COUNTER_SUBJECT_MODAL_REVIEW_SEEDS, {
    minWindowCount: 160,
    minPreservedWindowCount: 77,
    minTradeoffWindowCount: 55,
    minWeakWindowCount: 4,
    maxSupportCollisionCount: 700,
  });
});
