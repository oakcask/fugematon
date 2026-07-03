import { assertCounterSubjectIdentityReviewSeedsExposeWindows } from "./generate-counter-subject-identity-review-helpers.js";
import { COUNTER_SUBJECT_REVIEW_SEEDS } from "./generate-score-beauty-adoption-test-helpers.js";
import { reviewTest } from "./test-profile.js";

reviewTest("modal counter-subject identity review seeds expose rhythm, contour, and collision windows, batch A", () => {
  assertCounterSubjectIdentityReviewSeedsExposeWindows(COUNTER_SUBJECT_REVIEW_SEEDS.slice(0, 3));
});
