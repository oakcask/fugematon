import test from "node:test";

import { REPRESENTATIVE_REVIEW_SEEDS } from "./constants.js";
import { assertPhase7StepwisePatternEvidenceBatch } from "./generate-phase6-7-stepwise-batch-test-helpers.js";

test("generateScore keeps stepwise pattern evidence across phase-7 review seed batch A", () => {
  assertPhase7StepwisePatternEvidenceBatch(REPRESENTATIVE_REVIEW_SEEDS.map(({ seed }) => seed));
});
