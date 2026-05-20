import assert from "node:assert/strict";
import test from "node:test";
import {
  PHASE_5_11_ROTATION_SEEDS,
  PHASE_5_LENGTH_TICKS,
  PHASE_5_REVIEW_SEEDS,
  PHASE_6_DIAGNOSTICS_PROFILE,
  TICKS_PER_QUARTER,
} from "./constants.js";
import { generateScore } from "./generate.js";
import { requireSelectedCandidateEvaluation, stepwisePatternRole } from "./generate-test-helpers.js";
import {
  compareDiagnosticsToReferenceProfile,
  normalizeDiagnosticsForReference,
  PHASE_7_REFERENCE_DIAGNOSTICS_PROFILE,
} from "./reference-diagnostics.js";
import { evaluatePhase6Diagnostics, evaluatePhase7Diagnostics } from "./review-gate.js";

test("generateScore reports phase-6 melody, entry, ornament, and solo diagnostics", () => {
  const output = generateScore({ seed: "fugue-smoke", lengthTicks: PHASE_5_LENGTH_TICKS, selectionModel: "baseline" });
  const firstContinuationStartTick = output.diagnostics.sectionPlans.find(
    (plan) => plan.state !== "exposition",
  )?.startTick;

  assert.ok(output.diagnostics.severeEntryIntervalCount > 0);
  assert.ok(output.diagnostics.unresolvedSevereEntryIntervalCount > 0);
  assert.equal(
    output.diagnostics.severeEntryIntervalCount,
    output.diagnostics.entrySupportSevereIntervalDetails.reduce((sum, detail) => sum + detail.severeIntervalCount, 0),
  );
  assert.ok(output.diagnostics.soloTexture.soloRunCount > 0);
  assert.ok(output.diagnostics.soloTexture.unsupportedSoloRunCount >= 0);
  assert.ok(output.diagnostics.soloTexture.abruptTextureDropCount >= 0);
  assert.ok(output.diagnostics.soloTexture.soloVoiceImbalance >= 0);
  assert.ok(output.diagnostics.ornamentPlacementReasons.total > 0);
  assert.ok(output.diagnostics.ornamentPlacementReasons.cadenceApproach > 0);
  assert.ok(
    (output.diagnostics.sectionPlans[0]?.durationTicks ?? 0) <= PHASE_6_DIAGNOSTICS_PROFILE.maxExpositionDurationTicks,
  );
  assert.ok((firstContinuationStartTick ?? 0) <= PHASE_6_DIAGNOSTICS_PROFILE.maxFirstContinuationStartTick);
});

test("generateScore reports phase-7 contour motion diagnostics", () => {
  const output = generateScore({ seed: "wide-key", lengthTicks: PHASE_5_LENGTH_TICKS, selectionModel: "baseline" });
  const { fourBeat, eightBeat } = output.diagnostics.pitchContourMotion;

  assert.equal(fourBeat.windowTicks, TICKS_PER_QUARTER * 4);
  assert.equal(eightBeat.windowTicks, TICKS_PER_QUARTER * 8);
  assert.ok(fourBeat.bassUpperComparisonCount > 0);
  assert.ok(eightBeat.bassUpperComparisonCount > 0);
  assert.equal(fourBeat.bassUpperSameDirectionRatio + fourBeat.bassUpperContraryRatio, 1);
  assert.equal(eightBeat.bassUpperSameDirectionRatio + eightBeat.bassUpperContraryRatio, 1);
  assert.ok(fourBeat.outerVoiceSameDirectionRatio >= 0);
  assert.ok(fourBeat.outerVoiceContraryRatio >= 0);
  assert.ok(output.diagnostics.selectedCandidateEvaluations.length > 0);
  assert.equal(output.diagnostics.selectedCandidateEvaluations[0]!.featureVersion, 5);
  assert.ok(output.diagnostics.selectedCandidateEvaluations[0]!.explanations.entries.length > 0);
  assert.ok(output.diagnostics.selectedCandidateEvaluations[0]!.explanations.voicePairs.length > 0);
  assert.ok(output.diagnostics.selectedCandidateEvaluations[0]!.explanations.sections.length > 0);
  assert.equal(output.diagnostics.selectedCandidateEvaluations[0]!.evaluationModelVersion, 11);
  assert.ok(
    "fourBeatBassUpperSameDirectionRatio" in
      output.diagnostics.selectedCandidateEvaluations[0]!.dimensions.texture.features,
  );
  assert.ok(
    "fourBeatBassUpperContraryRatio" in output.diagnostics.selectedCandidateEvaluations[0]!.dimensions.texture.features,
  );
});

test("generateScore reports role and section stepwise pattern diagnostics", () => {
  const output = generateScore({ seed: "fugue-smoke", lengthTicks: PHASE_5_LENGTH_TICKS, selectionModel: "baseline" });
  const roles = new Set(output.diagnostics.stepwisePattern.roles.map((summary) => summary.role));
  const freeCounterpoint = stepwisePatternRole(output.diagnostics.stepwisePattern.roles, "free-counterpoint");
  const counterSubject = stepwisePatternRole(output.diagnostics.stepwisePattern.roles, "counter-subject");
  const selectedEvaluation = requireSelectedCandidateEvaluation(output.diagnostics.selectedCandidateEvaluations);

  assert.equal(output.diagnostics.stepwisePattern.degreePatternLength, 4);
  assert.ok(roles.has("subject"));
  assert.ok(roles.has("answer"));
  assert.ok(roles.has("subject-fragment"));
  assert.ok(roles.has("counter-subject"));
  assert.ok(roles.has("free-counterpoint"));
  assert.ok(output.diagnostics.stepwisePattern.sections.length >= output.diagnostics.sectionPlans.length * 5);
  assert.ok(output.diagnostics.stepwisePattern.sections.some((section) => section.state === "episode"));
  assert.ok(freeCounterpoint.noteCount > 0);
  assert.ok(freeCounterpoint.intervalCount > 0);
  assert.ok(freeCounterpoint.stepwiseRunRatio > 0);
  assert.ok(freeCounterpoint.ascendingStepRatio > 0);
  assert.ok(freeCounterpoint.descendingStepRatio > 0);
  assert.ok(freeCounterpoint.maxMonotoneStepRun > 1);
  assert.ok(freeCounterpoint.repeatedDegreePatternCount > 0);
  assert.ok(freeCounterpoint.rolePatternEntropy >= 0);
  assert.ok(counterSubject.noteCount > 0);
  assert.ok(selectedEvaluation.dimensions.melody.features.freeCounterpointStepwiseRunRatio > 0);
  assert.ok(selectedEvaluation.dimensions.melody.features.freeCounterpointMaxMonotoneStepRun > 0);
  assert.ok(selectedEvaluation.dimensions.melody.features.freeCounterpointRepeatedDegreePatternCount >= 0);
  assert.ok(selectedEvaluation.dimensions.melody.features.freeCounterpointRolePatternEntropy >= 0);
  assert.ok(selectedEvaluation.dimensions.melody.features.selectedFreeCounterpointStepwiseFixationCost >= 0);
  assert.ok("maxRoleMonotoneStepRun" in selectedEvaluation.dimensions.texture.features);
  assert.ok("repeatedRoleDegreePatternCount" in selectedEvaluation.dimensions.texture.features);
});

test("generateScore keeps stepwise pattern evidence across phase-7 review seeds without gate regressions", () => {
  const seeds = [...PHASE_5_REVIEW_SEEDS, ...PHASE_5_11_ROTATION_SEEDS];

  for (const { seed } of seeds) {
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
});

test("generateScore catches free-counterpoint contour false positives with stepwise evidence", () => {
  const blockerSeeds = ["fugue-smoke", "lyrical-line", "contrary-answer", "bright-answer", "modal-answer"] as const;

  for (const seed of blockerSeeds) {
    const output = generateScore({ seed, lengthTicks: PHASE_5_LENGTH_TICKS, selectionModel: "baseline" });
    const freeCounterpoint = stepwisePatternRole(output.diagnostics.stepwisePattern.roles, "free-counterpoint");

    assert.equal(output.diagnostics.freeCounterpointContourScore, 1);
    assert.ok(freeCounterpoint.ascendingStepRatio > 0);
    assert.ok(freeCounterpoint.descendingStepRatio > 0);
    assert.ok(freeCounterpoint.maxMonotoneStepRun >= 3);
    assert.ok(freeCounterpoint.repeatedDegreePatternCount > 0);
  }
});

test("generateScore compares phase-7 diagnostics to normalized reference profile axes", () => {
  const output = generateScore({ seed: "fugue-smoke", lengthTicks: PHASE_5_LENGTH_TICKS, selectionModel: "baseline" });
  const baselineMetrics = normalizeDiagnosticsForReference(output.diagnostics);
  const sharedRhythmAxis = PHASE_7_REFERENCE_DIAGNOSTICS_PROFILE.metrics.find(
    (metric) => metric.axis === "sharedRhythmOverlapPerVoicePairQuarter",
  );
  const unisonAxis = PHASE_7_REFERENCE_DIAGNOSTICS_PROFILE.metrics.find(
    (metric) => metric.axis === "unisonOverlapPerVoicePairQuarter",
  );
  const stepwiseAxis = PHASE_7_REFERENCE_DIAGNOSTICS_PROFILE.metrics.find(
    (metric) => metric.axis === "freeCounterpointStepwiseRunRatio",
  );

  assert.ok(sharedRhythmAxis !== undefined);
  assert.ok(unisonAxis !== undefined);
  assert.ok(stepwiseAxis !== undefined);
  assert.ok(sharedRhythmAxis.referenceMax > 0);
  assert.ok(unisonAxis.referenceMax > 0);
  assert.ok(stepwiseAxis.referenceMin > 0);
  assert.ok(baselineMetrics.sharedRhythmOverlapPerVoicePairQuarter > 0);
  assert.ok(baselineMetrics.unisonOverlapPerVoicePairQuarter > 0);
  assert.ok(baselineMetrics.freeCounterpointStepwiseRunRatio > 0);

  const stretchedDiagnostics = {
    ...output.diagnostics,
    lengthTicks: output.diagnostics.lengthTicks * 2,
    generatedUntilTick: output.diagnostics.generatedUntilTick * 2,
    sharedRhythmOverlapCount: output.diagnostics.sharedRhythmOverlapCount * 2,
    unisonOverlapCount: output.diagnostics.unisonOverlapCount * 2,
    samePitchOverlapCount: output.diagnostics.samePitchOverlapCount * 2,
    stepwisePattern: {
      ...output.diagnostics.stepwisePattern,
      roles: output.diagnostics.stepwisePattern.roles.map((summary) =>
        summary.role === "free-counterpoint"
          ? { ...summary, repeatedDegreePatternCount: summary.repeatedDegreePatternCount * 2 }
          : summary,
      ),
    },
  };
  const stretchedMetrics = normalizeDiagnosticsForReference(stretchedDiagnostics);
  const comparison = compareDiagnosticsToReferenceProfile(stretchedDiagnostics);

  assert.equal(
    stretchedMetrics.sharedRhythmOverlapPerVoicePairQuarter,
    baselineMetrics.sharedRhythmOverlapPerVoicePairQuarter,
  );
  assert.equal(stretchedMetrics.unisonOverlapPerVoicePairQuarter, baselineMetrics.unisonOverlapPerVoicePairQuarter);
  assert.equal(
    stretchedMetrics.samePitchOverlapPerVoicePairQuarter,
    baselineMetrics.samePitchOverlapPerVoicePairQuarter,
  );
  assert.equal(
    stretchedMetrics.freeCounterpointRepeatedDegreePatternsPerQuarter,
    baselineMetrics.freeCounterpointRepeatedDegreePatternsPerQuarter,
  );
  assert.equal(comparison.seed, "fugue-smoke");
  assert.equal(
    comparison.normalizers.scoreQuarterNotes,
    (output.diagnostics.generatedUntilTick * 2) / TICKS_PER_QUARTER,
  );
  assert.ok(comparison.metrics.every((metric) => Number.isFinite(metric.value)));
});
