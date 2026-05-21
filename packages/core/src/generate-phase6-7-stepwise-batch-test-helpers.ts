import assert from "node:assert/strict";

import { PHASE_5_LENGTH_TICKS } from "./constants.js";
import { generateScore } from "./generate.js";
import { stepwisePatternRole } from "./generate-test-helpers.js";
import { evaluatePhase6Diagnostics, evaluatePhase7Diagnostics } from "./review-gate.js";

export function assertPhase7StepwisePatternEvidenceBatch(seeds: readonly string[]): void {
  for (const seed of seeds) {
    const output = generateScore({ seed, lengthTicks: PHASE_5_LENGTH_TICKS, selectionModel: "baseline" });
    const gate6 = evaluatePhase6Diagnostics(seed, output.diagnostics);
    const gate7 = evaluatePhase7Diagnostics(seed, output.diagnostics);
    const freeCounterpoint = stepwisePatternRole(output.diagnostics.stepwisePattern.roles, "free-counterpoint");

    assert.deepEqual(gate6.failures, []);
    assert.deepEqual(gate7.failures, []);
    assert.equal(gate6.passed, true);
    assert.equal(gate7.passed, true);
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
