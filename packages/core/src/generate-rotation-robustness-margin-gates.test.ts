import test from "node:test";
import { ROTATION_REVIEW_SEEDS } from "./constants.js";
import { assertRotationRobustnessMarginGate } from "./generate-quality-margin-gates-test-helpers.js";

test("generateScore applies rotation robustness margin gates across rotation seeds", () => {
  for (const { seed } of ROTATION_REVIEW_SEEDS) {
    assertRotationRobustnessMarginGate(seed);
  }
});
