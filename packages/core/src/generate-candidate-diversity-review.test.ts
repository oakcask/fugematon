import { assertCandidateDiversityReviewSeedsReady } from "./generate-candidate-diversity-review-test-helpers.js";
import { QUALITY_VECTOR_REVIEW_SEEDS } from "./generate-quality-review-test-helpers.js";
import { reviewTest } from "./test-profile.js";

reviewTest("generateScore keeps candidate-diversity focused seed batch A ready for candidate-diversity review", () => {
  assertCandidateDiversityReviewSeedsReady(QUALITY_VECTOR_REVIEW_SEEDS.slice(0, 4));
});
