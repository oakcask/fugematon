import assert from "node:assert/strict";
import { REVIEW_LENGTH_TICKS } from "./constants.js";
import type { SelectionModel } from "./events.js";
import {
  assertCandidatePoolOracleShape,
  cachedGenerateScore as generateScore,
  requireSelectedCandidateEvaluation,
} from "./generate-test-helpers.js";
import {
  compareDiagnosticsToReferenceProfile,
  REFERENCE_DIAGNOSTICS_PROFILE,
  summarizeReferenceDiagnosticsComparisons,
} from "./reference-diagnostics.js";
import { evaluateReviewGatePolicy } from "./review-gate.js";

export const PLANNER_COMPLETION_COMPATIBILITY_SEEDS = [
  { seed: "bach-001", category: "representative" },
  { seed: "minor-entry", category: "boundary" },
  { seed: "modal-cadence", category: "rotation" },
  { seed: "dense-modal", category: "adversarial" },
] as const;

type PlannerCompletionCompatibilitySeed = (typeof PLANNER_COMPLETION_COMPATIBILITY_SEEDS)[number];

export function assertPlannerCompletionCompatibility(
  selectionModel: SelectionModel,
  compatibilitySeeds: readonly PlannerCompletionCompatibilitySeed[] = PLANNER_COMPLETION_COMPATIBILITY_SEEDS,
): void {
  const referenceComparisons = [];

  for (const { seed, category } of compatibilitySeeds) {
    const output = generateScore({ seed, lengthTicks: REVIEW_LENGTH_TICKS, selectionModel });
    const repeated = generateScore({ seed, lengthTicks: REVIEW_LENGTH_TICKS, selectionModel });
    const gate = evaluateReviewGatePolicy(seed, output.diagnostics);
    const referenceComparison = compareDiagnosticsToReferenceProfile(output.diagnostics);

    assert.deepEqual(repeated.diagnostics, output.diagnostics);
    assert.equal(gate.adoptionReady, true, `${selectionModel} lost adoption readiness for ${category} seed ${seed}`);
    assert.equal(gate.hardConstraintPassed, true);
    assert.deepEqual(gate.hardFailures, []);
    assert.equal(gate.policy.schemaVersion, 3);
    assert.equal(gate.policy.name, "review-gate-policy");
    assert.equal(output.diagnostics.rangeViolations, 0);
    assert.equal(output.diagnostics.voiceCrossings, 0);
    assert.equal(output.diagnostics.subjectIdentityViolations, 0);
    assert.equal(output.diagnostics.answerPlanViolations, 0);
    assert.equal(output.diagnostics.keyMetadataMismatches, 0);
    assert.equal(output.diagnostics.unresolvedDissonanceCount, 0);
    assert.equal(output.diagnostics.allVoiceSilenceGapCount, 0);
    assertCandidatePoolOracleShape(output.diagnostics.candidatePoolOracle);
    assert.equal(referenceComparison.seed, seed);
    assert.equal(referenceComparison.profileVersion, REFERENCE_DIAGNOSTICS_PROFILE.version);
    assert.equal(referenceComparison.metrics.length, REFERENCE_DIAGNOSTICS_PROFILE.metrics.length);
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
  assert.equal(referenceSummary.profile.version, REFERENCE_DIAGNOSTICS_PROFILE.version);
  assert.equal(referenceSummary.profile.importManifest.schemaVersion, 1);
  assert.equal(referenceSummary.axes.length, REFERENCE_DIAGNOSTICS_PROFILE.metrics.length);
  assert.ok(referenceSummary.axes.every((axis) => Number.isFinite(axis.averageValue)));
  assert.ok(referenceSummary.axes.every((axis) => Number.isFinite(axis.maxDistance)));
  assert.ok(referenceSummary.outsideReferenceSeedCount >= 0);
}
