import test from "node:test";
import { assertCandidateDiversityReviewSeedsReady } from "./generate-candidate-diversity-review-test-helpers.js";
import { PHASE_13_FOCUSED_SEEDS } from "./generate-phase-review-test-helpers.js";

test("generateScore keeps candidate-diversity focused seed batch A ready for candidate-diversity review", () => {
  assertCandidateDiversityReviewSeedsReady(PHASE_13_FOCUSED_SEEDS.slice(0, 4));
});
