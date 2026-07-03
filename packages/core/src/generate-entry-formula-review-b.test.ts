import { assertEntryFormulaReviewSeeds } from "./generate-entry-formula-review-test-helpers.js";
import { ENTRY_FORMULA_REVIEW_SEEDS } from "./generate-score-beauty-adoption-test-helpers.js";
import { reviewTest } from "./test-profile.js";

reviewTest("score-beauty entry formula review seeds expose score-window sonority evidence batch B", () => {
  assertEntryFormulaReviewSeeds(ENTRY_FORMULA_REVIEW_SEEDS.slice(3));
});
