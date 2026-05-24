import test from "node:test";
import {
  assertBassAnswerTailTextureRepair,
  BASS_ANSWER_TAIL_TEXTURE_REVIEW_BATCH_B,
} from "./generate-bass-answer-tail-texture-test-helpers.js";

test("bass-answer tail-texture review batch B repairs bass-answer tail thinning", () => {
  assertBassAnswerTailTextureRepair(BASS_ANSWER_TAIL_TEXTURE_REVIEW_BATCH_B);
});
