import assert from "node:assert/strict";
import test from "node:test";
import { REVIEW_LENGTH_TICKS } from "./constants.js";
import {
  cachedGenerateScore as generateScore,
  maximum,
  requireSelectedCandidateEvaluation,
  roundMetric,
} from "./generate-test-helpers.js";
import { evaluateContourMotionGate, evaluateMelodyTextureGate } from "./review-gate.js";

test("generateScore preserves modal counter-subject retention guardrails", () => {
  const blockerSeeds = [
    ["modal-cadence", 0.537],
    ["dense-modal", 0.512],
    ["angular-answer", 0.504],
    ["modal-answer", 0.58],
    ["modal-dorian", 0.58],
  ] as const;

  for (const [seed, counterSubjectIdentityRetention] of blockerSeeds) {
    const output = generateScore({ seed, lengthTicks: REVIEW_LENGTH_TICKS, selectionModel: "baseline" });
    const gate6 = evaluateMelodyTextureGate(seed, output.diagnostics);
    const gate7 = evaluateContourMotionGate(seed, output.diagnostics);
    const selectedEvaluation = requireSelectedCandidateEvaluation(output.diagnostics.selectedCandidateEvaluations);

    assert.deepEqual(gate6.failures, []);
    assert.deepEqual(gate7.failures, []);
    assert.equal(gate6.passed, true);
    assert.equal(gate7.passed, true);
    assert.ok(roundMetric(output.diagnostics.counterSubjectIdentityRetention) >= counterSubjectIdentityRetention);
    assert.ok(output.diagnostics.modalContextCount > 0);
    assert.ok("counterSubjectIdentityRetention" in selectedEvaluation.dimensions.subjectClarity.features);
    assert.ok(selectedEvaluation.dimensions.subjectClarity.features.selectedModalCounterSubjectIdentityReward > 0);
  }
});

test("generateScore preserves melody and form guardrails", () => {
  const blockerSeeds = [
    ["modal-answer", 68, 2, 1, 38, 13, 13, 2],
    ["contrary-motion", 99, 7, 3, 42, 16, 16, 8],
    ["modal-dorian", 73, 5, 3, 41, 13, 13, 8],
    ["bright-answer", 84, 9, 5, 41, 12, 12, 2],
    ["lyrical-line", 92, 3, 2, 42, 16, 16, 8],
    ["dark-episode", 119, 9, 4, 39, 13, 13, 8],
    ["contrary-answer", 62, 3, 1, 43, 16, 16, 8],
  ] as const;

  for (const [
    seed,
    leapRecoveryMisses,
    selectedMelodyLeapRecoveryMisses,
    selectedVoiceLeapRecoveryMisses,
    soloRunCount,
    unsupportedSoloRunCount,
    abruptTextureDropCount,
    selectedSectionSoloTextureRisk,
  ] of blockerSeeds) {
    const output = generateScore({ seed, lengthTicks: REVIEW_LENGTH_TICKS, selectionModel: "baseline" });
    const selectedEvaluation = requireSelectedCandidateEvaluation(output.diagnostics.selectedCandidateEvaluations);

    assert.ok(output.diagnostics.leapRecoveryMisses <= leapRecoveryMisses);
    assert.equal(selectedEvaluation.dimensions.melody.features.leapRecoveryMisses, selectedMelodyLeapRecoveryMisses);
    assert.equal(
      maximum(selectedEvaluation.explanations.voices.map((voice) => voice.leapRecoveryMisses)),
      selectedVoiceLeapRecoveryMisses,
    );
    assert.ok(output.diagnostics.soloTexture.soloRunCount <= soloRunCount);
    assert.ok(output.diagnostics.soloTexture.unsupportedSoloRunCount <= unsupportedSoloRunCount);
    assert.ok(output.diagnostics.soloTexture.abruptTextureDropCount <= abruptTextureDropCount);
    assert.equal(
      maximum(selectedEvaluation.explanations.sections.map((section) => section.soloTextureRisk)),
      selectedSectionSoloTextureRisk,
    );
    assert.ok(selectedEvaluation.explanations.sections.every((section) => section.cadenceTargetCount > 0));
    assert.ok("formRepetitionWarnings" in selectedEvaluation.dimensions.form.features);
  }
});
