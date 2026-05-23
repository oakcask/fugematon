import assert from "node:assert/strict";
import test from "node:test";
import { PHASE_5_LENGTH_TICKS } from "./constants.js";
import { generateScore } from "./generate.js";
import { requireSelectedCandidateEvaluation, stepwisePatternRole } from "./generate-test-helpers.js";
import { evaluatePhase6Diagnostics, evaluatePhase7Diagnostics } from "./review-gate.js";

test("generateScore nudges non-modal stepwise pattern fixation without modal guardrail regressions", () => {
  const blockerSeeds = [
    ["fugue-smoke", 0.743, 5, 570, 28],
    ["lyrical-line", 0.73, 4, 589, 20],
    ["contrary-answer", 0.731, 5, 549, 31],
  ] as const;

  for (const [
    seed,
    maxStepwiseRunRatio,
    maxMonotoneStepRun,
    maxRepeatedDegreePatternCount,
    maxLeapRecoveryMisses,
  ] of blockerSeeds) {
    const output = generateScore({ seed, lengthTicks: PHASE_5_LENGTH_TICKS, selectionModel: "baseline" });
    const gate6 = evaluatePhase6Diagnostics(seed, output.diagnostics);
    const gate7 = evaluatePhase7Diagnostics(seed, output.diagnostics);
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
    const output = generateScore({ seed, lengthTicks: PHASE_5_LENGTH_TICKS, selectionModel: "baseline" });
    const gate6 = evaluatePhase6Diagnostics(seed, output.diagnostics);
    const gate7 = evaluatePhase7Diagnostics(seed, output.diagnostics);
    const selectedEvaluation = requireSelectedCandidateEvaluation(output.diagnostics.selectedCandidateEvaluations);

    assert.deepEqual(gate6.failures, []);
    assert.deepEqual(gate7.failures, []);
    assert.equal(gate6.passed, true);
    assert.equal(gate7.passed, true);
    assert.equal(selectedEvaluation.dimensions.melody.features.selectedFreeCounterpointStepwiseFixationCost, 0);
    assert.ok(output.diagnostics.counterSubjectIdentityRetention >= 0.604);
  }
});
