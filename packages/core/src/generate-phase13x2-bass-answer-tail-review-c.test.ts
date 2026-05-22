import test from "node:test";
import {
  assertPhase13X2BassAnswerTailRepair,
  PHASE_13X2_BASS_ANSWER_TAIL_REVIEW_BATCH_C,
} from "./generate-phase13x2-bass-answer-tail-test-helpers.js";

test("Phase 13X2 review batch C repairs bass-answer tail thinning", () => {
  assertPhase13X2BassAnswerTailRepair(PHASE_13X2_BASS_ANSWER_TAIL_REVIEW_BATCH_C);
});
