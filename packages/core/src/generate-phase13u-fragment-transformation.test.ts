import assert from "node:assert/strict";
import test from "node:test";
import { PHASE_5_LENGTH_TICKS } from "./constants.js";
import { generateScore } from "./generate.js";
import { FRAGMENT_TRANSFORMATION_REVIEW_SEEDS } from "./generate-phase13u-beauty-rewrite-test-helpers.js";

test("Phase 13U fragment review seeds expose transformation evidence instead of only aggregate counts", () => {
  for (const seed of FRAGMENT_TRANSFORMATION_REVIEW_SEEDS) {
    const output = generateScore({ seed, lengthTicks: PHASE_5_LENGTH_TICKS });
    const evidence = output.diagnostics.qualityVector.fragmentFunctionEvidence;

    assert.ok(evidence.fragmentSectionCount > 0, `${seed} should include fragment sections`);
    assert.ok(evidence.uniqueFunctionCount > 0);
    assert.ok(evidence.topFunctionShare > 0 && evidence.topFunctionShare <= 1);
    assert.ok(
      evidence.topFunctions.every((summary) => {
        const [transform, sequencePattern, cadenceKind, mode] = summary.functionKey.split(":");
        return (
          transform !== undefined &&
          sequencePattern !== undefined &&
          cadenceKind !== undefined &&
          mode !== undefined &&
          summary.count > 0 &&
          summary.share > 0
        );
      }),
    );
  }
});
