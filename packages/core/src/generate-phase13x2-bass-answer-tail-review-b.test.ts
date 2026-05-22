import test from "node:test";
import {
  assertPhase13X2CurrentBassAnswerTailEvidence,
  PHASE_13X2_BASS_ANSWER_TAIL_REVIEW_BATCH_B,
} from "./generate-phase13x2-bass-answer-tail-test-helpers.js";

test("Phase 13X2 review batch B detects current bass-answer tail thinning", () => {
  assertPhase13X2CurrentBassAnswerTailEvidence(PHASE_13X2_BASS_ANSWER_TAIL_REVIEW_BATCH_B, {
    bassOnlySeeds: [],
    oneOrZeroOutsideSeeds: PHASE_13X2_BASS_ANSWER_TAIL_REVIEW_BATCH_B.filter((seed) => seed !== "sparse-cadence"),
  });
});
