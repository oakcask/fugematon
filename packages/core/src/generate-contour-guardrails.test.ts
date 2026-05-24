import assert from "node:assert/strict";
import test from "node:test";
import { REVIEW_LENGTH_TICKS } from "./constants.js";
import { generateScore } from "./generate.js";
import { maximum, requireSelectedCandidateEvaluation } from "./generate-test-helpers.js";
import { evaluateContourMotionGate, evaluateMelodyTextureGate } from "./review-gate.js";

test("generateScore balances entry harmony scoring with preservation guardrails", () => {
  const blockerSeeds = [
    ["fugue-smoke", 140, 98, 72, 4, 3, 3],
    ["modal-cadence", 149, 101, 70, 4, 3, 3],
    ["lyrical-line", 136, 98, 72, 3, 3, 3],
    ["tight-stretto", 144, 96, 72, 4, 3, 3],
    ["wide-key", 130, 96, 72, 3, 3, 3],
    ["contrary-answer", 137, 96, 72, 4, 3, 3],
  ] as const;

  for (const [
    seed,
    instabilityCount,
    severeIntervalCount,
    unresolvedSevereIntervalCount,
    selectedInstabilityCount,
    selectedSevereIntervalCount,
    selectedUnresolvedSevereIntervalCount,
  ] of blockerSeeds) {
    const output = generateScore({ seed, lengthTicks: REVIEW_LENGTH_TICKS, selectionModel: "baseline" });
    const gate = evaluateContourMotionGate(seed, output.diagnostics);
    const selectedEvaluation = requireSelectedCandidateEvaluation(output.diagnostics.selectedCandidateEvaluations);

    assert.deepEqual(gate.failures, []);
    assert.equal(gate.passed, true);
    assert.ok(output.diagnostics.entrySupportInstabilityCount <= instabilityCount);
    assert.ok(output.diagnostics.severeEntryIntervalCount <= severeIntervalCount);
    assert.ok(output.diagnostics.unresolvedSevereEntryIntervalCount <= unresolvedSevereIntervalCount);
    assert.equal(
      output.diagnostics.entrySupportInstabilityCount,
      output.diagnostics.entrySupportInstabilityDetails.reduce((sum, detail) => sum + detail.instabilityCount, 0),
    );
    assert.equal(
      output.diagnostics.severeEntryIntervalCount,
      output.diagnostics.entrySupportSevereIntervalDetails.reduce((sum, detail) => sum + detail.severeIntervalCount, 0),
    );
    assert.ok(selectedEvaluation.dimensions.harmony.cost > 0);
    assert.ok(selectedEvaluation.dimensions.harmony.features.selectedEntryHarmonyRiskCost > 0);
    assert.equal(
      selectedEvaluation.dimensions.harmony.features.selectedModalCadenceEntrySupportRiskCost,
      seed === "modal-cadence" ? 19 : 0,
    );
    assert.equal(selectedEvaluation.dimensions.harmony.features.entrySupportInstabilityCount, selectedInstabilityCount);
    assert.equal(selectedEvaluation.dimensions.harmony.features.severeEntryIntervalCount, selectedSevereIntervalCount);
    assert.equal(
      selectedEvaluation.dimensions.harmony.features.unresolvedSevereEntryIntervalCount,
      selectedUnresolvedSevereIntervalCount,
    );
    assert.ok(
      selectedEvaluation.explanations.entries.some(
        (entry) =>
          entry.instabilityCount === selectedInstabilityCount &&
          entry.severeIntervalCount === selectedSevereIntervalCount &&
          entry.unresolvedSevereIntervalCount === selectedUnresolvedSevereIntervalCount,
      ),
    );
  }
});

test("generateScore preserves voice-pair independence blocker evidence under scoring changes", () => {
  const blockerSeeds = [
    ["contrary-motion", 24, 534, 786, 2, 2, 21, 7, 50, 12],
    ["fugue-smoke", 15, 576, 830, 0, 0, 22, 7, 50, 12],
    ["minor-entry", 26, 731, 902, 0, 0, 45, 15, 66, 20],
    ["modal-answer", 13, 752, 902, 0, 0, 47, 14, 66, 21],
  ] as const;

  for (const [
    seed,
    samePitchOverlapCount,
    unisonOverlapCount,
    sharedRhythmOverlapCount,
    selectedSamePitchFeatureCount,
    selectedSamePitchExplanationCount,
    selectedUnisonFeatureCount,
    selectedUnisonExplanationCount,
    selectedSharedRhythmFeatureCount,
    selectedSharedRhythmExplanationCount,
  ] of blockerSeeds) {
    const output = generateScore({ seed, lengthTicks: REVIEW_LENGTH_TICKS, selectionModel: "baseline" });
    const selectedEvaluation = requireSelectedCandidateEvaluation(output.diagnostics.selectedCandidateEvaluations);

    assert.equal(output.diagnostics.samePitchOverlapCount, samePitchOverlapCount);
    assert.equal(output.diagnostics.unisonOverlapCount, unisonOverlapCount);
    assert.equal(output.diagnostics.sharedRhythmOverlapCount, sharedRhythmOverlapCount);
    assert.equal(selectedEvaluation.dimensions.texture.features.samePitchOverlapCount, selectedSamePitchFeatureCount);
    assert.equal(selectedEvaluation.dimensions.texture.features.unisonOverlapCount, selectedUnisonFeatureCount);
    assert.equal(
      selectedEvaluation.dimensions.texture.features.sharedRhythmOverlapCount,
      selectedSharedRhythmFeatureCount,
    );
    assert.equal(
      maximum(selectedEvaluation.explanations.voicePairs.map((pair) => pair.samePitchOverlapCount)),
      selectedSamePitchExplanationCount,
    );
    assert.equal(
      maximum(selectedEvaluation.explanations.voicePairs.map((pair) => pair.unisonOverlapCount)),
      selectedUnisonExplanationCount,
    );
    assert.equal(
      maximum(selectedEvaluation.explanations.voicePairs.map((pair) => pair.sharedRhythmOverlapCount)),
      selectedSharedRhythmExplanationCount,
    );
  }
});

test("generateScore guards exact pitch lockstep without gate regressions", () => {
  const blockerSeeds = [
    ["bright-answer", 8, 737, 630, 31, 0.9],
    ["quiet-cadence", 8, 729, 656, 15, 0.87],
    ["modal-answer", 13, 752, 814, 33, 0.573],
  ] as const;

  for (const [
    seed,
    maxSamePitchOverlapCount,
    maxUnisonOverlapCount,
    maxSameDirectionMotionCount,
    maxLeapRecoveryMisses,
    minCounterSubjectIdentityRetention,
  ] of blockerSeeds) {
    const output = generateScore({ seed, lengthTicks: REVIEW_LENGTH_TICKS, selectionModel: "baseline" });
    const gate6 = evaluateMelodyTextureGate(seed, output.diagnostics);
    const gate7 = evaluateContourMotionGate(seed, output.diagnostics);

    assert.deepEqual(gate6.failures, []);
    assert.deepEqual(gate7.failures, []);
    assert.equal(gate6.passed, true);
    assert.equal(gate7.passed, true);
    assert.ok(output.diagnostics.samePitchOverlapCount <= maxSamePitchOverlapCount);
    assert.ok(output.diagnostics.unisonOverlapCount <= maxUnisonOverlapCount);
    assert.ok(output.diagnostics.sameDirectionMotionCount <= maxSameDirectionMotionCount);
    assert.ok(output.diagnostics.leapRecoveryMisses <= maxLeapRecoveryMisses);
    assert.ok(output.diagnostics.counterSubjectIdentityRetention >= minCounterSubjectIdentityRetention);
  }
});
