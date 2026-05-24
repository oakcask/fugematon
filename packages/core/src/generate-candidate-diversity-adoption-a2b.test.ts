import test from "node:test";
import { assertCandidateDiversityAdoptionSeedsReady } from "./generate-candidate-diversity-adoption-test-helpers.js";
import { CANDIDATE_DIVERSITY_ADOPTION_SEEDS } from "./generate-phase-review-test-helpers.js";

test("generateScore keeps candidate-diversity adoption seed batch A2b ready for generator-side quality work", () => {
  assertCandidateDiversityAdoptionSeedsReady(CANDIDATE_DIVERSITY_ADOPTION_SEEDS.slice(4, 6));
});
