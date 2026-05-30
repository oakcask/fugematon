import test from "node:test";
import {
  assertDissonanceTriageReviewSeeds,
  DISSONANCE_TRIAGE_REVIEW_SEEDS,
} from "./generate-dissonance-triage-review-test-helpers.js";

test("dissonance triage seed batch B keeps entry and weak-dissonance evidence observable", () => {
  assertDissonanceTriageReviewSeeds(DISSONANCE_TRIAGE_REVIEW_SEEDS.slice(3));
});
