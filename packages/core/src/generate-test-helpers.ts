import assert from "node:assert/strict";
import { TICKS_PER_QUARTER } from "./constants.js";
import type {
  CandidatePoolOracleBlocker,
  MetaEvent,
  NoteRole,
  ScoreEvent,
  StepwisePatternRoleSummary,
} from "./events.js";
import type { generateScore } from "./generate.js";

export function countIssues(issues: readonly { code: string }[], code: string): number {
  return issues.filter((issue) => issue.code === code).length;
}

export function asMetaEvent(event: ScoreEvent | undefined): MetaEvent {
  assert.equal(event?.kind, "meta");
  if (event === undefined || event.kind !== "meta") {
    throw new Error("expected a meta event");
  }

  return event;
}

export function scoreMinutes(ticks: number): number {
  return ticks / (TICKS_PER_QUARTER * 90);
}

export function summarizeContinuationPatterns(stateTransitions: readonly string[]): {
  uniqueCount: number;
  maxRepeatedCount: number;
} {
  const windowSize = 4;
  const continuationStates = stateTransitions.filter((state) => state !== "exposition");
  const counts = new Map<string, number>();
  for (let index = 0; index <= continuationStates.length - windowSize; index += 1) {
    const key = continuationStates.slice(index, index + windowSize).join("|");
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return {
    uniqueCount: counts.size,
    maxRepeatedCount: maximum([...counts.values()]),
  };
}

export function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

export function requireSelectedCandidateEvaluation(
  selectedCandidateEvaluations: ReturnType<typeof generateScore>["diagnostics"]["selectedCandidateEvaluations"],
) {
  const selectedEvaluation = selectedCandidateEvaluations[0];

  assert.ok(selectedEvaluation !== undefined);
  assert.equal(selectedEvaluation.featureVersion, 8);
  assert.equal(selectedEvaluation.evaluationModelVersion, 16);
  assert.ok(selectedEvaluation.explanations.entries.length > 0);
  assert.ok(selectedEvaluation.explanations.voicePairs.length > 0);
  assert.ok(selectedEvaluation.explanations.voices.length > 0);
  assert.ok(selectedEvaluation.explanations.sections.length > 0);

  return selectedEvaluation;
}

export function assertCandidatePoolOracleShape(
  oracle: ReturnType<typeof generateScore>["diagnostics"]["candidatePoolOracle"],
) {
  assert.equal(oracle.schemaVersion, 5);
  assert.ok(oracle.sectionCount > 0);
  assert.ok(oracle.candidateCount >= oracle.sectionCount);
  assert.ok(oracle.phraseFamilyCandidateCount >= 0);
  assert.ok(oracle.viableCandidateCount >= 0);
  assert.ok(oracle.hardFailureRejectedCandidateCount >= 0);
  assert.ok(oracle.blockerClassifications.length > 0);

  for (const blocker of oracle.blockerClassifications) {
    assert.ok(blocker.referenceAxes.length > 0);
    assert.ok(blocker.observedSectionCount > 0);
    assert.equal(
      blocker.observedSectionCount,
      blocker.selectionModelSectionCount + blocker.generatorOrSectionPlannerSectionCount,
    );
    assert.ok(blocker.viableImprovementCount >= 0);
    assert.ok(blocker.selectedRiskTotal >= 0);
    assert.ok(blocker.bestViableRiskTotal >= 0);
    assert.ok(blocker.selectionOnlyUpperBoundRiskReduction >= 0);
    assert.ok(blocker.selectionOnlyUpperBoundRiskReductionRate >= 0);
    assert.ok(blocker.selectionOnlyUpperBoundRiskReductionRate <= 1);
    assert.ok(blocker.generatorNeededRate >= 0);
    assert.ok(blocker.generatorNeededRate <= 1);
    assert.ok(blocker.selectedRiskMax >= blocker.bestViableRiskMin);
    assert.ok(blocker.representative.candidateCount > 0);
    assert.ok(blocker.representative.selectedCandidateIndex >= 0);
    assert.ok(blocker.representative.viableCandidateCount > 0);
    assert.ok(blocker.representative.hardFailureRejectedCandidateCount >= 0);
    assert.ok(
      blocker.representative.selectedReferenceStatus === "within-reference" ||
        blocker.representative.selectedReferenceStatus === "below-reference" ||
        blocker.representative.selectedReferenceStatus === "above-reference",
    );
    assert.ok(
      blocker.representative.bestViableReferenceStatus === "within-reference" ||
        blocker.representative.bestViableReferenceStatus === "below-reference" ||
        blocker.representative.bestViableReferenceStatus === "above-reference",
    );
  }
}

export function requireOracleBlocker(
  oracle: ReturnType<typeof generateScore>["diagnostics"]["candidatePoolOracle"],
  blocker: CandidatePoolOracleBlocker,
) {
  const summary = oracle.blockerClassifications.find((candidate) => candidate.blocker === blocker);
  assert.ok(summary !== undefined);
  return summary;
}

export function stepwisePatternRole(
  summaries: readonly StepwisePatternRoleSummary[],
  role: NoteRole,
): StepwisePatternRoleSummary {
  const summary = summaries.find((candidate) => candidate.role === role);
  assert.ok(summary !== undefined);
  return summary;
}

export function maximum(values: readonly number[]): number {
  assert.ok(values.length > 0);
  return Math.max(...values);
}

export function cpuUsageMilliseconds(usage: NodeJS.CpuUsage): number {
  return (usage.user + usage.system) / 1000;
}

export function roundMetric(value: number): number {
  return Number(value.toFixed(3));
}
