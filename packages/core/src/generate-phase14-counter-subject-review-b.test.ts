import test from "node:test";
import {
  assertPhase14CounterSubjectReviewSeedsExposePressure,
  PHASE_14_COUNTER_SUBJECT_MODAL_REVIEW_SEEDS,
} from "./generate-phase14-counter-subject-review-helpers.js";

test("Phase 14 counter-subject modal review seeds stay under the repaired support-collision ceiling", () => {
  assertPhase14CounterSubjectReviewSeedsExposePressure(PHASE_14_COUNTER_SUBJECT_MODAL_REVIEW_SEEDS, {
    minWindowCount: 170,
    minPreservedWindowCount: 105,
    minTradeoffWindowCount: 55,
    minWeakWindowCount: 4,
    maxSupportCollisionCount: 230,
  });
});
