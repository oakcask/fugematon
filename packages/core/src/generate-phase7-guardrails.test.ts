import assert from "node:assert/strict";
import test from "node:test";
import { PHASE_5_LENGTH_TICKS } from "./constants.js";
import { generateScore } from "./generate.js";
import { maximum, requireSelectedCandidateEvaluation } from "./generate-test-helpers.js";
import { evaluatePhase6Diagnostics, evaluatePhase7Diagnostics } from "./review-gate.js";

test("generateScore balances phase-7 entry harmony scoring with preservation guardrails", () => {
  const blockerSeeds = [
    ["fugue-smoke", 139, 98, 72, 3, 3, 3],
    ["modal-cadence", 149, 101, 70, 4, 3, 3],
    ["lyrical-line", 136, 98, 72, 3, 3, 3],
    ["tight-stretto", 144, 96, 72, 4, 3, 3],
    ["wide-key", 130, 96, 72, 3, 3, 3],
    ["contrary-answer", 137, 96, 72, 3, 3, 3],
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
    const output = generateScore({ seed, lengthTicks: PHASE_5_LENGTH_TICKS, selectionModel: "baseline" });
    const gate = evaluatePhase7Diagnostics(seed, output.diagnostics);
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

test("generateScore preserves phase-7 voice-pair independence blocker evidence under scoring changes", () => {
  const blockerSeeds = [
    ["contrary-motion", 24, 539, 793, 3, 2, 26, 7, 57, 15],
    ["fugue-smoke", 15, 581, 837, 0, 0, 27, 7, 57, 13],
    ["minor-entry", 26, 736, 909, 0, 0, 50, 15, 73, 20],
    ["modal-answer", 13, 752, 909, 0, 0, 47, 14, 73, 20],
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
    const output = generateScore({ seed, lengthTicks: PHASE_5_LENGTH_TICKS, selectionModel: "baseline" });
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

test("generateScore guards phase-7 exact pitch lockstep without gate regressions", () => {
  const blockerSeeds = [
    ["bright-answer", 8, 736, 630, 31, 0.9],
    ["quiet-cadence", 7, 728, 656, 15, 0.87],
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
    const output = generateScore({ seed, lengthTicks: PHASE_5_LENGTH_TICKS, selectionModel: "baseline" });
    const gate6 = evaluatePhase6Diagnostics(seed, output.diagnostics);
    const gate7 = evaluatePhase7Diagnostics(seed, output.diagnostics);

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
