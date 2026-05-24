import test from "node:test";

import { REPRESENTATIVE_REVIEW_SEEDS } from "./constants.js";
import { assertStepwisePatternEvidenceBatch } from "./generate-stepwise-pattern-batch-test-helpers.js";

test("generateScore keeps stepwise pattern evidence across stepwise-pattern review seed batch A", () => {
  assertStepwisePatternEvidenceBatch(REPRESENTATIVE_REVIEW_SEEDS.map(({ seed }) => seed));
});
