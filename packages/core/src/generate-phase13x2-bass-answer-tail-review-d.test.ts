import test from "node:test";
import {
  assertPhase13X2CurrentBassAnswerTailEvidence,
  PHASE_13X2_BASS_ANSWER_TAIL_REVIEW_BATCH_D,
} from "./generate-phase13x2-bass-answer-tail-test-helpers.js";

test("Phase 13X2 review batch D detects current bass-answer tail thinning", () => {
  assertPhase13X2CurrentBassAnswerTailEvidence(PHASE_13X2_BASS_ANSWER_TAIL_REVIEW_BATCH_D, {
    bassOnlySeeds: ["modal-cadence"],
    oneOrZeroOutsideSeeds: PHASE_13X2_BASS_ANSWER_TAIL_REVIEW_BATCH_D,
  });
});
