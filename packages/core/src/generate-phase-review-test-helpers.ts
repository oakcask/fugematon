import assert from "node:assert/strict";
import { PHASE_5_11_ROTATION_SEEDS, PHASE_5_LENGTH_TICKS, PHASE_5_REVIEW_SEEDS } from "./constants.js";
import type { CandidatePoolOracleBlocker } from "./events.js";
import { generateScore } from "./generate.js";
import { evaluatePhase7BGatePolicy } from "./review-gate.js";

export const PHASE_11_12_REVIEW_SEEDS = PHASE_5_REVIEW_SEEDS.map(({ seed }) => seed);
export const PHASE_11_12_ROTATION_SEEDS = PHASE_5_11_ROTATION_SEEDS.map(({ seed }) => seed);
export const PHASE_12_REPETITION_FOCUSED_SEEDS = [
  "angular-answer",
  "modal-dorian",
  "modal-answer",
  "modal-cadence",
  "dense-modal",
] as const;

const PHASE_12_REPETITION_REVIEW_SEEDS = [...PHASE_5_REVIEW_SEEDS, ...PHASE_5_11_ROTATION_SEEDS].map(
  ({ seed }) => seed,
);

export const PHASE_12_REPETITION_REVIEW_BATCH_A = PHASE_12_REPETITION_REVIEW_SEEDS.slice(0, 11);
export const PHASE_12_REPETITION_REVIEW_BATCH_B = PHASE_12_REPETITION_REVIEW_SEEDS.slice(11);

export type Phase1112PlanningMetrics = {
  seedCount: number;
  changedStateSequenceCount: number;
  baselineUniqueContinuationPatternCount: number;
  variantUniqueContinuationPatternCount: number;
  baselineSectionGrammarRisk: number;
  variantSectionGrammarRisk: number;
  baselineTopEntryPatternFamilyCount: number;
  variantTopEntryPatternFamilyCount: number;
  baselineUnsupportedThinningRuns: number;
  variantUnsupportedThinningRuns: number;
  baselineUnisonOverlapCount: number;
  variantUnisonOverlapCount: number;
  baselineSharedRhythmOverlapCount: number;
  variantSharedRhythmOverlapCount: number;
  baselineLeapRecoveryMisses: number;
  variantLeapRecoveryMisses: number;
  baselineCounterSubjectIdentityRetention: number;
  variantCounterSubjectIdentityRetention: number;
  baselineBassRootSupportCount: number;
  variantBassRootSupportCount: number;
};

export type Phase12RepetitionMetrics = {
  seedCount: number;
  baselineTopEntryPatternFamilyCount: number;
  variantTopEntryPatternFamilyCount: number;
  baselineUnsupportedThinningRuns: number;
  variantUnsupportedThinningRuns: number;
};

export function collectPhase1112PlanningMetrics(seeds: readonly string[]): Phase1112PlanningMetrics {
  const metrics: Phase1112PlanningMetrics = {
    seedCount: seeds.length,
    changedStateSequenceCount: 0,
    baselineUniqueContinuationPatternCount: 0,
    variantUniqueContinuationPatternCount: 0,
    baselineSectionGrammarRisk: 0,
    variantSectionGrammarRisk: 0,
    baselineTopEntryPatternFamilyCount: 0,
    variantTopEntryPatternFamilyCount: 0,
    baselineUnsupportedThinningRuns: 0,
    variantUnsupportedThinningRuns: 0,
    baselineUnisonOverlapCount: 0,
    variantUnisonOverlapCount: 0,
    baselineSharedRhythmOverlapCount: 0,
    variantSharedRhythmOverlapCount: 0,
    baselineLeapRecoveryMisses: 0,
    variantLeapRecoveryMisses: 0,
    baselineCounterSubjectIdentityRetention: 0,
    variantCounterSubjectIdentityRetention: 0,
    baselineBassRootSupportCount: 0,
    variantBassRootSupportCount: 0,
  };

  for (const seed of seeds) {
    const baseline = generateScore({
      seed,
      lengthTicks: PHASE_5_LENGTH_TICKS,
      selectionModel: "phase10-oracle-selection",
    });
    const variant = generateScore({
      seed,
      lengthTicks: PHASE_5_LENGTH_TICKS,
      selectionModel: "phase10-section-local-planner",
    });
    const gate = evaluatePhase7BGatePolicy(seed, variant.diagnostics);
    const baselineStats = summarizeContinuationPatterns(baseline.diagnostics.stateTransitions);
    const variantStats = summarizeContinuationPatterns(variant.diagnostics.stateTransitions);
    const baselineGrammar = requireOracleBlocker(
      baseline.diagnostics.candidatePoolOracle,
      "section-grammar-repetition",
    );
    const variantGrammar = requireOracleBlocker(variant.diagnostics.candidatePoolOracle, "section-grammar-repetition");

    assert.equal(gate.phase8Ready, true);
    assert.equal(gate.hardConstraintPassed, true);
    assert.deepEqual(gate.hardFailures, []);
    if (
      JSON.stringify(variant.diagnostics.stateTransitions) !== JSON.stringify(baseline.diagnostics.stateTransitions)
    ) {
      metrics.changedStateSequenceCount += 1;
    }

    metrics.baselineUniqueContinuationPatternCount += baselineStats.uniqueCount;
    metrics.variantUniqueContinuationPatternCount += variantStats.uniqueCount;
    metrics.baselineSectionGrammarRisk += baselineGrammar.selectedRiskTotal;
    metrics.variantSectionGrammarRisk += variantGrammar.selectedRiskTotal;
    metrics.baselineTopEntryPatternFamilyCount +=
      baseline.diagnostics.phase11Review.entryPatternFamilies[0]?.count ?? 0;
    metrics.variantTopEntryPatternFamilyCount += variant.diagnostics.phase11Review.entryPatternFamilies[0]?.count ?? 0;
    metrics.baselineUnsupportedThinningRuns +=
      baseline.diagnostics.phase11Review.functionalThinning.unsupportedRunCount;
    metrics.variantUnsupportedThinningRuns += variant.diagnostics.phase11Review.functionalThinning.unsupportedRunCount;
    metrics.baselineUnisonOverlapCount += baseline.diagnostics.unisonOverlapCount;
    metrics.variantUnisonOverlapCount += variant.diagnostics.unisonOverlapCount;
    metrics.baselineSharedRhythmOverlapCount += baseline.diagnostics.sharedRhythmOverlapCount;
    metrics.variantSharedRhythmOverlapCount += variant.diagnostics.sharedRhythmOverlapCount;
    metrics.baselineLeapRecoveryMisses += baseline.diagnostics.leapRecoveryMisses;
    metrics.variantLeapRecoveryMisses += variant.diagnostics.leapRecoveryMisses;
    metrics.baselineCounterSubjectIdentityRetention += baseline.diagnostics.counterSubjectIdentityRetention;
    metrics.variantCounterSubjectIdentityRetention += variant.diagnostics.counterSubjectIdentityRetention;
    metrics.baselineBassRootSupportCount +=
      baseline.diagnostics.phase11Review.metricalHarmony.strongBeatBassRootSupportCount;
    metrics.variantBassRootSupportCount +=
      variant.diagnostics.phase11Review.metricalHarmony.strongBeatBassRootSupportCount;
  }

  return metrics;
}

export function assertPhase12FocusedRepetitionAdoption(seeds: readonly string[]): void {
  for (const seed of seeds) {
    const baseline = generateScore({
      seed,
      lengthTicks: PHASE_5_LENGTH_TICKS,
      selectionModel: "phase10-oracle-selection",
    });
    const variant = generateScore({
      seed,
      lengthTicks: PHASE_5_LENGTH_TICKS,
      selectionModel: "phase10-section-local-planner",
    });
    const gate = evaluatePhase7BGatePolicy(seed, variant.diagnostics);

    assert.equal(gate.phase8Ready, true);
    assert.equal(gate.hardConstraintPassed, true);
    assert.deepEqual(gate.hardFailures, []);
    assert.ok(
      variant.diagnostics.phase12Review.sectionStatePatterns.mostRepeatedPatternCount <
        baseline.diagnostics.phase12Review.sectionStatePatterns.mostRepeatedPatternCount,
    );
    assert.ok(
      variant.diagnostics.phase12Review.sectionStatePatterns.uniquePatternCount >
        baseline.diagnostics.phase12Review.sectionStatePatterns.uniquePatternCount,
    );
  }
}

export function collectPhase12RepetitionMetrics(seeds: readonly string[]): Phase12RepetitionMetrics {
  const metrics: Phase12RepetitionMetrics = {
    seedCount: seeds.length,
    baselineTopEntryPatternFamilyCount: 0,
    variantTopEntryPatternFamilyCount: 0,
    baselineUnsupportedThinningRuns: 0,
    variantUnsupportedThinningRuns: 0,
  };

  for (const seed of seeds) {
    const baseline = generateScore({
      seed,
      lengthTicks: PHASE_5_LENGTH_TICKS,
      selectionModel: "phase10-oracle-selection",
    });
    const variant = generateScore({
      seed,
      lengthTicks: PHASE_5_LENGTH_TICKS,
      selectionModel: "phase10-section-local-planner",
    });

    metrics.baselineTopEntryPatternFamilyCount +=
      baseline.diagnostics.phase12Review.entryPatternFamilyConcentration.topFamilyCount;
    metrics.variantTopEntryPatternFamilyCount +=
      variant.diagnostics.phase12Review.entryPatternFamilyConcentration.topFamilyCount;
    metrics.baselineUnsupportedThinningRuns +=
      baseline.diagnostics.phase11Review.functionalThinning.unsupportedRunCount;
    metrics.variantUnsupportedThinningRuns += variant.diagnostics.phase11Review.functionalThinning.unsupportedRunCount;
  }

  return metrics;
}

function summarizeContinuationPatterns(stateTransitions: readonly string[]): {
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

function requireOracleBlocker(
  oracle: ReturnType<typeof generateScore>["diagnostics"]["candidatePoolOracle"],
  blocker: CandidatePoolOracleBlocker,
) {
  const summary = oracle.blockerClassifications.find((candidate) => candidate.blocker === blocker);
  assert.ok(summary !== undefined);
  return summary;
}

function maximum(values: readonly number[]): number {
  assert.ok(values.length > 0);
  return Math.max(...values);
}
