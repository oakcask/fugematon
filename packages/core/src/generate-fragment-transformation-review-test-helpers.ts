import assert from "node:assert/strict";
import { REVIEW_LENGTH_TICKS } from "./constants.js";
import { cachedGenerateScore as generateScore } from "./generate-test-helpers.js";

export function assertFragmentTransformationEvidence(seeds: readonly string[]) {
  for (const seed of seeds) {
    const output = generateScore({ seed, lengthTicks: REVIEW_LENGTH_TICKS });
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
}
