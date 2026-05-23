import test from "node:test";
import {
  assertPhase14CounterSubjectReviewSeedsExposePressure,
  PHASE_14_COUNTER_SUBJECT_MODAL_REVIEW_SEEDS,
} from "./generate-phase14-counter-subject-review-helpers.js";

test("Phase 14 counter-subject modal review seeds keep preservation tradeoffs visible", () => {
  assertPhase14CounterSubjectReviewSeedsExposePressure(PHASE_14_COUNTER_SUBJECT_MODAL_REVIEW_SEEDS, {
    minWindowCount: 170,
    minTradeoffWindowCount: 100,
    minWeakWindowCount: 4,
    minSupportCollisionCount: 400,
  });
});
