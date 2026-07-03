import { assertFragmentTransformationEvidence } from "./generate-fragment-transformation-review-test-helpers.js";
import { FRAGMENT_TRANSFORMATION_REVIEW_SEEDS } from "./generate-score-beauty-adoption-test-helpers.js";
import { reviewTest } from "./test-profile.js";

reviewTest("score-beauty fragment review seed batch B exposes transformation evidence", () => {
  assertFragmentTransformationEvidence(FRAGMENT_TRANSFORMATION_REVIEW_SEEDS.slice(3));
});
