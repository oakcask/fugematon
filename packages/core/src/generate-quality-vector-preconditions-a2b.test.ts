import {
  assertQualityVectorReviewPreconditions,
  QUALITY_VECTOR_REVIEW_SEEDS,
} from "./generate-quality-review-test-helpers.js";
import { reviewTest } from "./test-profile.js";

reviewTest("generateScore keeps quality-vector review seed batch A2b ready for review-only diagnostics", () => {
  assertQualityVectorReviewPreconditions(QUALITY_VECTOR_REVIEW_SEEDS.slice(3, 4));
});
