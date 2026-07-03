import { ROTATION_REVIEW_SEEDS } from "./constants.js";
import { assertContourMotionGateSeeds } from "./generate-contour-motion-gates-test-helpers.js";
import { reviewTest } from "./test-profile.js";

reviewTest("generateScore applies contour motion gates across rotation seeds", () => {
  assertContourMotionGateSeeds(ROTATION_REVIEW_SEEDS);
});
