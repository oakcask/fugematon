import { assertCandidateDiversityAdoptionSeedsReady } from "./generate-candidate-diversity-adoption-test-helpers.js";
import { CANDIDATE_DIVERSITY_ADOPTION_SEEDS } from "./generate-quality-review-test-helpers.js";
import { reviewTest } from "./test-profile.js";

reviewTest(
  "generateScore keeps candidate-diversity adoption seed batch A ready for generator-side quality work",
  () => {
    assertCandidateDiversityAdoptionSeedsReady(CANDIDATE_DIVERSITY_ADOPTION_SEEDS.slice(0, 2));
  },
);
