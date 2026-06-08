import assert from "node:assert/strict";
import test from "node:test";
import { REVIEW_LENGTH_TICKS } from "./constants.js";
import {
  cachedGenerateScore as generateScore,
  requireSelectedCandidateEvaluation,
  stepwisePatternRole,
} from "./generate-test-helpers.js";
import { evaluateContourMotionGate, evaluateMelodyTextureGate } from "./review-gate.js";

test("generateScore nudges non-modal stepwise pattern fixation without modal guardrail regressions", () => {
  const blockerSeeds = [
    ["fugue-smoke", 0.743, 6, 570, 90],
    ["lyrical-line", 0.73, 6, 589, 92],
    ["contrary-answer", 0.733, 5, 549, 62],
  ] as const;

  for (const [
    seed,
    maxStepwiseRunRatio,
    maxMonotoneStepRun,
    maxRepeatedDegreePatternCount,
    maxLeapRecoveryMisses,
  ] of blockerSeeds) {
    const output = generateScore({ seed, lengthTicks: REVIEW_LENGTH_TICKS, selectionModel: "baseline" });
    const gate6 = evaluateMelodyTextureGate(seed, output.diagnostics);
    const gate7 = evaluateContourMotionGate(seed, output.diagnostics);
    const freeCounterpoint = stepwisePatternRole(output.diagnostics.stepwisePattern.roles, "free-counterpoint");
    const selectedEvaluation = requireSelectedCandidateEvaluation(output.diagnostics.selectedCandidateEvaluations);

    assert.deepEqual(gate6.failures, []);
    assert.deepEqual(gate7.failures, []);
    assert.equal(gate6.passed, true);
    assert.equal(gate7.passed, true);
    assert.ok(freeCounterpoint.stepwiseRunRatio <= maxStepwiseRunRatio);
    assert.ok(freeCounterpoint.maxMonotoneStepRun <= maxMonotoneStepRun);
    assert.ok(freeCounterpoint.repeatedDegreePatternCount <= maxRepeatedDegreePatternCount);
    assert.ok(output.diagnostics.leapRecoveryMisses <= maxLeapRecoveryMisses);
    assert.ok(selectedEvaluation.dimensions.melody.features.selectedFreeCounterpointStepwiseFixationCost >= 0);
  }

  for (const seed of ["modal-dorian", "modal-answer"] as const) {
    const output = generateScore({ seed, lengthTicks: REVIEW_LENGTH_TICKS, selectionModel: "baseline" });
    const gate6 = evaluateMelodyTextureGate(seed, output.diagnostics);
    const gate7 = evaluateContourMotionGate(seed, output.diagnostics);
    const selectedEvaluation = requireSelectedCandidateEvaluation(output.diagnostics.selectedCandidateEvaluations);

    assert.deepEqual(gate6.failures, []);
    assert.deepEqual(gate7.failures, []);
    assert.equal(gate6.passed, true);
    assert.equal(gate7.passed, true);
    assert.ok(selectedEvaluation.dimensions.melody.features.selectedFreeCounterpointStepwiseFixationCost >= 0);
    assert.ok(selectedEvaluation.dimensions.melody.features.selectedFreeCounterpointStepwiseFixationCost <= 2);
    assert.ok(output.diagnostics.counterSubjectIdentityRetention >= 0.58);
  }
});
