import assert from "node:assert/strict";
import test from "node:test";
import { PHASE_5_LENGTH_TICKS } from "./constants.js";
import type { SelectionModel } from "./events.js";
import { generateScore } from "./generate.js";
import { assertPhase10CandidatePoolOracleShape, requireSelectedCandidateEvaluation } from "./generate-test-helpers.js";
import {
  compareDiagnosticsToReferenceProfile,
  PHASE_7_REFERENCE_DIAGNOSTICS_PROFILE,
  summarizeReferenceDiagnosticsComparisons,
} from "./reference-diagnostics.js";
import { evaluatePhase6Diagnostics, evaluatePhase7BGatePolicy } from "./review-gate.js";

test("generateScore can compare the phase-10 oracle selection model against baseline", () => {
  const baseline = generateScore({ seed: "bach-001", lengthTicks: PHASE_5_LENGTH_TICKS });
  const variant = generateScore({
    seed: "bach-001",
    lengthTicks: PHASE_5_LENGTH_TICKS,
    selectionModel: "phase10-oracle-selection",
  });
  const baselineGate = evaluatePhase6Diagnostics("bach-001", baseline.diagnostics);
  const variantGate = evaluatePhase6Diagnostics("bach-001", variant.diagnostics);

  assert.deepEqual(baselineGate.failures, []);
  assert.deepEqual(variantGate.failures, []);
  assert.equal(variant.diagnostics.rangeViolations, baseline.diagnostics.rangeViolations);
  assert.equal(variant.diagnostics.voiceCrossings, baseline.diagnostics.voiceCrossings);
  assert.equal(variant.diagnostics.subjectIdentityViolations, baseline.diagnostics.subjectIdentityViolations);
  assert.equal(variant.diagnostics.answerPlanViolations, baseline.diagnostics.answerPlanViolations);
  assert.ok(
    variant.diagnostics.candidatePoolOracle.viableCandidateCount >=
      baseline.diagnostics.candidatePoolOracle.viableCandidateCount,
  );
});

test("generateScore preserves phase-10 completion compatibility across the readiness subset", () => {
  const compatibilitySeeds = [
    { seed: "bach-001", category: "representative" },
    { seed: "minor-entry", category: "boundary" },
    { seed: "modal-cadence", category: "rotation" },
    { seed: "dense-modal", category: "adversarial" },
  ] as const;
  const selectionModels = [
    "baseline",
    "phase10-oracle-selection",
    "phase10-section-local-planner",
  ] as const satisfies readonly SelectionModel[];

  for (const selectionModel of selectionModels) {
    const referenceComparisons = [];

    for (const { seed, category } of compatibilitySeeds) {
      const output = generateScore({ seed, lengthTicks: PHASE_5_LENGTH_TICKS, selectionModel });
      const repeated = generateScore({ seed, lengthTicks: PHASE_5_LENGTH_TICKS, selectionModel });
      const gate = evaluatePhase7BGatePolicy(seed, output.diagnostics);
      const referenceComparison = compareDiagnosticsToReferenceProfile(output.diagnostics);

      assert.deepEqual(repeated.diagnostics, output.diagnostics);
      assert.equal(gate.phase8Ready, true, `${selectionModel} lost Phase 8 readiness for ${category} seed ${seed}`);
      assert.equal(gate.hardConstraintPassed, true);
      assert.deepEqual(gate.hardFailures, []);
      assert.equal(gate.policy.schemaVersion, 1);
      assert.equal(output.diagnostics.rangeViolations, 0);
      assert.equal(output.diagnostics.voiceCrossings, 0);
      assert.equal(output.diagnostics.subjectIdentityViolations, 0);
      assert.equal(output.diagnostics.answerPlanViolations, 0);
      assert.equal(output.diagnostics.keyMetadataMismatches, 0);
      assert.equal(output.diagnostics.unresolvedDissonanceCount, 0);
      assert.equal(output.diagnostics.allVoiceSilenceGapCount, 0);
      assertPhase10CandidatePoolOracleShape(output.diagnostics.candidatePoolOracle);
      assert.equal(referenceComparison.seed, seed);
      assert.equal(referenceComparison.profileVersion, PHASE_7_REFERENCE_DIAGNOSTICS_PROFILE.version);
      assert.equal(referenceComparison.metrics.length, PHASE_7_REFERENCE_DIAGNOSTICS_PROFILE.metrics.length);
      assert.ok(referenceComparison.metrics.every((metric) => Number.isFinite(metric.value)));
      assert.ok(
        referenceComparison.metrics.every(
          (metric) =>
            metric.status === "within-reference" ||
            metric.status === "below-reference" ||
            metric.status === "above-reference",
        ),
      );
      requireSelectedCandidateEvaluation(output.diagnostics.selectedCandidateEvaluations);
      referenceComparisons.push(referenceComparison);
    }

    const referenceSummary = summarizeReferenceDiagnosticsComparisons(referenceComparisons);

    assert.equal(referenceSummary.seedCount, compatibilitySeeds.length);
    assert.equal(referenceSummary.profile.version, PHASE_7_REFERENCE_DIAGNOSTICS_PROFILE.version);
    assert.equal(referenceSummary.profile.importManifest.schemaVersion, 1);
    assert.equal(referenceSummary.axes.length, PHASE_7_REFERENCE_DIAGNOSTICS_PROFILE.metrics.length);
    assert.ok(referenceSummary.axes.every((axis) => Number.isFinite(axis.averageValue)));
    assert.ok(referenceSummary.axes.every((axis) => Number.isFinite(axis.maxDistance)));
    assert.ok(referenceSummary.outsideReferenceSeedCount >= 0);
  }
});
