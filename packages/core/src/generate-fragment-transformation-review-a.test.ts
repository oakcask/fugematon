import test from "node:test";
import { assertFragmentTransformationEvidence } from "./generate-fragment-transformation-review-test-helpers.js";
import { FRAGMENT_TRANSFORMATION_REVIEW_SEEDS } from "./generate-score-beauty-adoption-test-helpers.js";

test("score-beauty fragment review seed batch A exposes transformation evidence", () => {
  assertFragmentTransformationEvidence(FRAGMENT_TRANSFORMATION_REVIEW_SEEDS.slice(0, 3));
});
