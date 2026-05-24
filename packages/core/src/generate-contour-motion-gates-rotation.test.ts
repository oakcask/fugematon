import test from "node:test";
import { ROTATION_REVIEW_SEEDS } from "./constants.js";
import { assertContourMotionGateSeeds } from "./generate-contour-motion-gates-test-helpers.js";

test("generateScore applies contour motion gates across rotation seeds", () => {
  assertContourMotionGateSeeds(ROTATION_REVIEW_SEEDS);
});
