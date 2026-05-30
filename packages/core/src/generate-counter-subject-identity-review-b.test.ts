import test from "node:test";
import { assertCounterSubjectIdentityReviewSeedsExposeWindows } from "./generate-counter-subject-identity-review-helpers.js";
import { COUNTER_SUBJECT_REVIEW_SEEDS } from "./generate-score-beauty-adoption-test-helpers.js";

test("modal counter-subject identity review seeds expose rhythm, contour, and collision windows, batch B", () => {
  assertCounterSubjectIdentityReviewSeedsExposeWindows(COUNTER_SUBJECT_REVIEW_SEEDS.slice(3));
});
