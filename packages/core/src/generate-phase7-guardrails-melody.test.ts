import assert from "node:assert/strict";
import test from "node:test";
import { PHASE_5_LENGTH_TICKS } from "./constants.js";
import { generateScore } from "./generate.js";
import { maximum, requireSelectedCandidateEvaluation, roundMetric } from "./generate-test-helpers.js";
import { evaluatePhase6Diagnostics, evaluatePhase7Diagnostics } from "./review-gate.js";

test("generateScore preserves phase-7 modal counter-subject retention guardrails", () => {
  const blockerSeeds = [
    ["modal-cadence", 0.58],
    ["dense-modal", 0.586],
    ["angular-answer", 0.591],
    ["modal-answer", 0.631],
    ["modal-dorian", 0.604],
  ] as const;

  for (const [seed, counterSubjectIdentityRetention] of blockerSeeds) {
    const output = generateScore({ seed, lengthTicks: PHASE_5_LENGTH_TICKS, selectionModel: "baseline" });
    const gate6 = evaluatePhase6Diagnostics(seed, output.diagnostics);
    const gate7 = evaluatePhase7Diagnostics(seed, output.diagnostics);
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

test("generateScore preserves phase-7 melody and form guardrails", () => {
  const blockerSeeds = [
    ["modal-answer", 33, 2, 1, 38, 13, 13, 2],
    ["contrary-motion", 26, 6, 4, 42, 15, 15, 8],
    ["modal-dorian", 34, 3, 1, 41, 13, 13, 8],
    ["bright-answer", 31, 7, 3, 38, 12, 12, 2],
    ["lyrical-line", 25, 2, 1, 42, 16, 16, 8],
    ["dark-episode", 21, 7, 3, 38, 12, 12, 8],
    ["contrary-answer", 31, 3, 2, 43, 16, 16, 8],
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
    const output = generateScore({ seed, lengthTicks: PHASE_5_LENGTH_TICKS, selectionModel: "baseline" });
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
