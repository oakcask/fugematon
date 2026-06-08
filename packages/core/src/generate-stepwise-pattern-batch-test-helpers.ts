import assert from "node:assert/strict";

import { REVIEW_LENGTH_TICKS } from "./constants.js";
import { cspMetricalBoundaryReviewFailures } from "./generate-csp-metrical-boundary-test-helpers.js";
import { cachedGenerateScore as generateScore, stepwisePatternRole } from "./generate-test-helpers.js";
import { evaluateContourMotionGate, evaluateMelodyTextureGate } from "./review-gate.js";

export function assertStepwisePatternEvidenceBatch(seeds: readonly string[]): void {
  for (const seed of seeds) {
    const output = generateScore({ seed, lengthTicks: REVIEW_LENGTH_TICKS, selectionModel: "baseline" });
    const gate6 = evaluateMelodyTextureGate(seed, output.diagnostics);
    const gate7 = evaluateContourMotionGate(seed, output.diagnostics);
    const freeCounterpoint = stepwisePatternRole(output.diagnostics.stepwisePattern.roles, "free-counterpoint");

    assert.deepEqual(cspMetricalBoundaryReviewFailures(seed, gate6.failures), []);
    assert.deepEqual(cspMetricalBoundaryReviewFailures(seed, gate7.failures), []);
    assert.ok(freeCounterpoint.noteCount > 0);
    assert.ok(freeCounterpoint.stepwiseRunRatio >= 0);
    assert.ok(freeCounterpoint.stepwiseRunRatio <= 1);
    assert.ok(freeCounterpoint.ascendingStepRatio >= 0);
    assert.ok(freeCounterpoint.descendingStepRatio >= 0);
    assert.ok(freeCounterpoint.maxMonotoneStepRun >= 0);
    assert.ok(freeCounterpoint.repeatedDegreePatternCount >= 0);
    assert.ok(Number.isFinite(freeCounterpoint.rolePatternEntropy));
  }
}
