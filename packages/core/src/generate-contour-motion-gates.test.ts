import test from "node:test";
import { REPRESENTATIVE_REVIEW_SEEDS } from "./constants.js";
import { assertContourMotionGateSeeds } from "./generate-contour-motion-gates-test-helpers.js";

test("generateScore applies contour motion gates across fixed seeds", () => {
  assertContourMotionGateSeeds(REPRESENTATIVE_REVIEW_SEEDS);
});
