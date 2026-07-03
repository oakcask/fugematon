import { REPRESENTATIVE_REVIEW_SEEDS } from "./constants.js";
import { assertMelodyTextureObservationGateSeeds } from "./generate-melody-texture-observation-gate-test-helpers.js";
import { reviewTest } from "./test-profile.js";

reviewTest("generateScore applies melody texture observation gate across fixed seeds", () => {
  assertMelodyTextureObservationGateSeeds(REPRESENTATIVE_REVIEW_SEEDS);
});
