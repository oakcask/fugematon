import test from "node:test";
import {
  assertQualityVectorReviewPreconditions,
  QUALITY_VECTOR_REVIEW_SEEDS,
} from "./generate-quality-review-test-helpers.js";

test("generateScore keeps quality-vector review seed batch A2 ready for review-only diagnostics", () => {
  assertQualityVectorReviewPreconditions(QUALITY_VECTOR_REVIEW_SEEDS.slice(2, 4));
});
