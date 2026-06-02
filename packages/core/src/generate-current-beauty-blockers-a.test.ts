import test from "node:test";
import { assertCurrentBeautyCompletionEvidenceBatch } from "./generate-current-beauty-blockers-test-helpers.js";
import { CURRENT_BEAUTY_BLOCKER_CI_SEEDS } from "./generate-score-beauty-review-test-helpers.js";

test("generateScore keeps focused current beauty completion evidence", () => {
  assertCurrentBeautyCompletionEvidenceBatch(CURRENT_BEAUTY_BLOCKER_CI_SEEDS);
});
