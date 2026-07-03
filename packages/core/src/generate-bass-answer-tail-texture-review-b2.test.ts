import {
  assertBassAnswerTailTextureRepair,
  BASS_ANSWER_TAIL_TEXTURE_REVIEW_BATCH_B,
} from "./generate-bass-answer-tail-texture-test-helpers.js";
import { reviewTest } from "./test-profile.js";

reviewTest("bass-answer tail-texture review batch B2 repairs bass-answer tail thinning", () => {
  assertBassAnswerTailTextureRepair(BASS_ANSWER_TAIL_TEXTURE_REVIEW_BATCH_B.slice(3));
});
