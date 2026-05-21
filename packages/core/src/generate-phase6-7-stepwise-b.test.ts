import test from "node:test";

import { PHASE_5_11_ROTATION_SEEDS } from "./constants.js";
import { assertPhase7StepwisePatternEvidenceBatch } from "./generate-phase6-7-stepwise-batch-test-helpers.js";

test("generateScore keeps stepwise pattern evidence across phase-7 review seed batch B", () => {
  assertPhase7StepwisePatternEvidenceBatch(PHASE_5_11_ROTATION_SEEDS.map(({ seed }) => seed));
});
