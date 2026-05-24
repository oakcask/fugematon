import test from "node:test";

import { ROTATION_REVIEW_SEEDS } from "./constants.js";
import { assertStepwisePatternEvidenceBatch } from "./generate-phase6-7-stepwise-batch-test-helpers.js";

test("generateScore keeps stepwise pattern evidence across phase-7 review seed batch B", () => {
  assertStepwisePatternEvidenceBatch(ROTATION_REVIEW_SEEDS.map(({ seed }) => seed));
});
