import test from "node:test";
import {
  assertEpisodeMotivicRepetitionReviewBatch,
  EPISODE_MOTIVIC_REPETITION_REVIEW_BATCHES,
} from "./generate-episode-motivic-repetition-test-helpers.js";

test("episode motivic repetition review batch F keeps derivation coverage and texture guardrails", () => {
  assertEpisodeMotivicRepetitionReviewBatch(EPISODE_MOTIVIC_REPETITION_REVIEW_BATCHES[5]);
});
