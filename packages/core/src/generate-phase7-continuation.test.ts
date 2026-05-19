import assert from "node:assert/strict";
import test from "node:test";
import {
  PHASE_5_11_ROTATION_SEEDS,
  PHASE_5_LENGTH_TICKS,
  PHASE_5_REVIEW_SEEDS,
  PHASE_7_DIAGNOSTICS_PROFILE,
} from "./constants.js";
import { generateScore } from "./generate.js";
import { requireSelectedCandidateEvaluation, stepwisePatternRole } from "./generate-test-helpers.js";
import { evaluatePhase6Diagnostics, evaluatePhase7Diagnostics } from "./review-gate.js";

test("generateScore nudges non-modal stepwise pattern fixation without modal guardrail regressions", () => {
  const blockerSeeds = [
    ["fugue-smoke", 0.72, 5, 566, 25],
    ["lyrical-line", 0.71, 4, 589, 16],
    ["contrary-answer", 0.731, 4, 537, 31],
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
    assert.ok(selectedEvaluation.dimensions.melody.features.selectedFreeCounterpointStepwiseFixationCost > 0);
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
    assert.ok(output.diagnostics.counterSubjectIdentityRetention >= 0.627);
  }
});

test("generateScore applies phase-7 contour gates across fixed and rotation seeds", () => {
  const seeds = [...PHASE_5_REVIEW_SEEDS, ...PHASE_5_11_ROTATION_SEEDS];

  for (const { seed } of seeds) {
    const output = generateScore({ seed, lengthTicks: PHASE_5_LENGTH_TICKS, selectionModel: "baseline" });
    const gate = evaluatePhase7Diagnostics(seed, output.diagnostics);

    assert.deepEqual(gate.failures, []);
    assert.equal(gate.passed, true);
    assert.ok(
      gate.metrics.fourBeatBassUpperSameDirectionRatio <=
        PHASE_7_DIAGNOSTICS_PROFILE.maxFourBeatBassUpperSameDirectionRatio,
    );
    assert.ok(
      gate.metrics.fourBeatBassUpperContraryRatio >= PHASE_7_DIAGNOSTICS_PROFILE.minFourBeatBassUpperContraryRatio,
    );
    assert.ok(
      gate.metrics.eightBeatBassUpperSameDirectionRatio <=
        PHASE_7_DIAGNOSTICS_PROFILE.maxEightBeatBassUpperSameDirectionRatio,
    );
    assert.ok(
      gate.metrics.eightBeatBassUpperContraryRatio >= PHASE_7_DIAGNOSTICS_PROFILE.minEightBeatBassUpperContraryRatio,
    );
    assert.ok(
      gate.metrics.fourBeatOuterVoiceSameDirectionRatio <=
        PHASE_7_DIAGNOSTICS_PROFILE.maxFourBeatOuterVoiceSameDirectionRatio,
    );
    assert.ok(
      gate.metrics.fourBeatOuterVoiceContraryRatio >= PHASE_7_DIAGNOSTICS_PROFILE.minFourBeatOuterVoiceContraryRatio,
    );
    assert.ok(gate.metrics.fourBeatBassUpperComparisonCount >= PHASE_7_DIAGNOSTICS_PROFILE.minContourComparisonCount);
    assert.ok(gate.metrics.eightBeatBassUpperComparisonCount >= PHASE_7_DIAGNOSTICS_PROFILE.minContourComparisonCount);
  }
});
