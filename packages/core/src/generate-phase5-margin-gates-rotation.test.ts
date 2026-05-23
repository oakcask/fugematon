import test from "node:test";
import { ROTATION_REVIEW_SEEDS } from "./constants.js";
import { assertRotationRobustnessMarginGate } from "./generate-phase5-margin-gates-test-helpers.js";

test("generateScore applies phase-5.11 margin gates across rotation seeds", () => {
  for (const { seed } of ROTATION_REVIEW_SEEDS) {
    assertRotationRobustnessMarginGate(seed);
  }
});
