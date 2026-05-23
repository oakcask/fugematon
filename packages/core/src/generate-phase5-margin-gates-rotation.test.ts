import test from "node:test";
import { PHASE_5_11_ROTATION_SEEDS } from "./constants.js";
import { assertPhase511MarginGate } from "./generate-phase5-margin-gates-test-helpers.js";

test("generateScore applies phase-5.11 margin gates across rotation seeds", () => {
  for (const { seed } of PHASE_5_11_ROTATION_SEEDS) {
    assertPhase511MarginGate(seed);
  }
});
