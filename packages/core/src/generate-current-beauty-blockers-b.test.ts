import test from "node:test";
import { assertCurrentBeautyCompletionEvidenceBatch } from "./generate-current-beauty-blockers-test-helpers.js";
import { SCORE_BEAUTY_REVIEW_BATCHES } from "./generate-score-beauty-review-test-helpers.js";

test("generateScore keeps current beauty completion evidence in batch B", () => {
  assertCurrentBeautyCompletionEvidenceBatch(SCORE_BEAUTY_REVIEW_BATCHES.second);
});
