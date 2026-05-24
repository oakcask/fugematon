import test from "node:test";
import {
  assertCounterSubjectReviewSeedsExposePressure,
  COUNTER_SUBJECT_MODAL_REVIEW_SEEDS,
} from "./generate-counter-subject-support-review-test-helpers.js";

test("counter-subject support modal review seeds stay under the repaired support-collision ceiling", () => {
  assertCounterSubjectReviewSeedsExposePressure(COUNTER_SUBJECT_MODAL_REVIEW_SEEDS, {
    minWindowCount: 170,
    minPreservedWindowCount: 105,
    minTradeoffWindowCount: 55,
    minWeakWindowCount: 4,
    maxSupportCollisionCount: 230,
  });
});
