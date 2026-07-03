import {
  assertEpisodeMotivicRepetitionReviewBatch,
  EPISODE_MOTIVIC_REPETITION_REVIEW_BATCHES,
} from "./generate-episode-motivic-repetition-test-helpers.js";
import { reviewTest } from "./test-profile.js";

reviewTest("episode motivic repetition review batch D keeps derivation coverage and texture guardrails", () => {
  assertEpisodeMotivicRepetitionReviewBatch(EPISODE_MOTIVIC_REPETITION_REVIEW_BATCHES[3]);
});
