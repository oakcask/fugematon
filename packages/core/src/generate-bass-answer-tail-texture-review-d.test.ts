import {
  assertBassAnswerTailTextureRepair,
  BASS_ANSWER_TAIL_TEXTURE_REVIEW_BATCH_D,
} from "./generate-bass-answer-tail-texture-test-helpers.js";
import { reviewTest } from "./test-profile.js";

reviewTest("bass-answer tail-texture review batch D repairs bass-answer tail thinning", () => {
  assertBassAnswerTailTextureRepair(BASS_ANSWER_TAIL_TEXTURE_REVIEW_BATCH_D.slice(0, 3));
});
