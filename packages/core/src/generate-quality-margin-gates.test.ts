import test from "node:test";
import { REPRESENTATIVE_REVIEW_SEEDS } from "./constants.js";
import { assertRotationRobustnessMarginGate } from "./generate-quality-margin-gates-test-helpers.js";

test("generateScore applies rotation robustness margin gates across fixed seeds", () => {
  for (const { seed } of REPRESENTATIVE_REVIEW_SEEDS) {
    assertRotationRobustnessMarginGate(seed);
  }
});
