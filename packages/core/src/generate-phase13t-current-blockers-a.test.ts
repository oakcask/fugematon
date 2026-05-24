import test from "node:test";
import { SCORE_BEAUTY_REVIEW_BATCHES } from "./generate-phase13s-music-beauty-test-helpers.js";
import { assertCurrentBeautyCompletionEvidenceBatch } from "./generate-phase13t-current-blockers-test-helpers.js";

test("generateScore keeps Phase 13T completion evidence in batch A", () => {
  assertCurrentBeautyCompletionEvidenceBatch(SCORE_BEAUTY_REVIEW_BATCHES.first);
});
