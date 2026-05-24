import assert from "node:assert/strict";
import { REPRESENTATIVE_REVIEW_SEEDS, REVIEW_LENGTH_TICKS, ROTATION_REVIEW_SEEDS } from "./constants.js";
import type { CandidatePoolOracleBlocker } from "./events.js";
import { generateScore } from "./generate.js";
import { evaluateReviewGatePolicy } from "./review-gate.js";

export const PHASE_11_12_REVIEW_SEEDS = REPRESENTATIVE_REVIEW_SEEDS.map(({ seed }) => seed);
export const PHASE_11_12_REVIEW_BATCH_A = [
  "bach-001",
  "fugue-smoke",
  "wide-key",
  "modal-dorian",
  "circle-fifths",
  "dark-episode",
  "ornament-test",
] as const;
export const PHASE_11_12_REVIEW_BATCH_B = [
  "minor-entry",
  "lyrical-line",
  "close-imitation",
  "sparse-cadence",
  "bright-answer",
  "long-arc",
  "contrary-motion",
] as const;
export const PHASE_11_12_ROTATION_SEEDS = ROTATION_REVIEW_SEEDS.map(({ seed }) => seed);
export const PHASE_12_REPETITION_FOCUSED_SEEDS = [
  "angular-answer",
  "modal-dorian",
  "modal-answer",
  "modal-cadence",
  "dense-modal",
] as const;
export const PHASE_13_FOCUSED_SEEDS = [
  "bach-001",
  "fugue-smoke",
  "dense-modal",
  "modal-cadence",
  "tight-stretto",
  "sparse-cadence",
  "long-arc",
] as const;
export const CANDIDATE_DIVERSITY_ADOPTION_SEEDS = [
  "bach-001",
  "fugue-smoke",
  "sparse-cadence",
  "minor-entry",
  "modal-cadence",
  "tight-stretto",
  "angular-answer",
  "modal-answer",
  "dense-modal",
  "wide-key",
  "circle-fifths",
  "contrary-motion",
] as const;

const PHASE_12_REPETITION_REVIEW_SEEDS = [...REPRESENTATIVE_REVIEW_SEEDS, ...ROTATION_REVIEW_SEEDS].map(
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
      lengthTicks: REVIEW_LENGTH_TICKS,
      selectionModel: "candidate-oracle-selection",
    });
    const variant = generateScore({
      seed,
      lengthTicks: REVIEW_LENGTH_TICKS,
      selectionModel: "section-local-planner",
    });
    const gate = evaluateReviewGatePolicy(seed, variant.diagnostics);
    const baselineStats = summarizeContinuationPatterns(baseline.diagnostics.stateTransitions);
    const variantStats = summarizeContinuationPatterns(variant.diagnostics.stateTransitions);
    const baselineGrammar = requireOracleBlocker(
      baseline.diagnostics.candidatePoolOracle,
      "section-grammar-repetition",
    );
    const variantGrammar = requireOracleBlocker(variant.diagnostics.candidatePoolOracle, "section-grammar-repetition");

    assert.equal(gate.adoptionReady, true);
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
      baseline.diagnostics.texturePlanningReview.entryPatternFamilies[0]?.count ?? 0;
    metrics.variantTopEntryPatternFamilyCount +=
      variant.diagnostics.texturePlanningReview.entryPatternFamilies[0]?.count ?? 0;
    metrics.baselineUnsupportedThinningRuns +=
      baseline.diagnostics.texturePlanningReview.functionalThinning.unsupportedRunCount;
    metrics.variantUnsupportedThinningRuns +=
      variant.diagnostics.texturePlanningReview.functionalThinning.unsupportedRunCount;
    metrics.baselineUnisonOverlapCount += baseline.diagnostics.unisonOverlapCount;
    metrics.variantUnisonOverlapCount += variant.diagnostics.unisonOverlapCount;
    metrics.baselineSharedRhythmOverlapCount += baseline.diagnostics.sharedRhythmOverlapCount;
    metrics.variantSharedRhythmOverlapCount += variant.diagnostics.sharedRhythmOverlapCount;
    metrics.baselineLeapRecoveryMisses += baseline.diagnostics.leapRecoveryMisses;
    metrics.variantLeapRecoveryMisses += variant.diagnostics.leapRecoveryMisses;
    metrics.baselineCounterSubjectIdentityRetention += baseline.diagnostics.counterSubjectIdentityRetention;
    metrics.variantCounterSubjectIdentityRetention += variant.diagnostics.counterSubjectIdentityRetention;
    metrics.baselineBassRootSupportCount +=
      baseline.diagnostics.texturePlanningReview.metricalHarmony.strongBeatBassRootSupportCount;
    metrics.variantBassRootSupportCount +=
      variant.diagnostics.texturePlanningReview.metricalHarmony.strongBeatBassRootSupportCount;
  }

  return metrics;
}

export function assertPhase12FocusedRepetitionAdoption(seeds: readonly string[]): void {
  for (const seed of seeds) {
    const baseline = generateScore({
      seed,
      lengthTicks: REVIEW_LENGTH_TICKS,
      selectionModel: "candidate-oracle-selection",
    });
    const variant = generateScore({
      seed,
      lengthTicks: REVIEW_LENGTH_TICKS,
      selectionModel: "section-local-planner",
    });
    const gate = evaluateReviewGatePolicy(seed, variant.diagnostics);

    assert.equal(gate.adoptionReady, true);
    assert.equal(gate.hardConstraintPassed, true);
    assert.deepEqual(gate.hardFailures, []);
    assert.ok(
      variant.diagnostics.phraseRepetitionReview.sectionStatePatterns.mostRepeatedPatternCount <
        baseline.diagnostics.phraseRepetitionReview.sectionStatePatterns.mostRepeatedPatternCount,
    );
    assert.ok(
      variant.diagnostics.phraseRepetitionReview.sectionStatePatterns.uniquePatternCount >
        baseline.diagnostics.phraseRepetitionReview.sectionStatePatterns.uniquePatternCount,
    );
  }
}

export function assertPhase13ReviewPreconditions(seeds: readonly string[]): void {
  const reviewSeedSet = new Set<string>(PHASE_12_REPETITION_REVIEW_SEEDS);

  for (const seed of seeds) {
    assert.equal(reviewSeedSet.has(seed), true);

    const first = generateScore({
      seed,
      lengthTicks: REVIEW_LENGTH_TICKS,
      selectionModel: "section-local-planner",
    });
    const repeated = generateScore({
      seed,
      lengthTicks: REVIEW_LENGTH_TICKS,
      selectionModel: "section-local-planner",
    });
    const gate = evaluateReviewGatePolicy(seed, first.diagnostics);

    assert.deepEqual(repeated.events, first.events);
    assert.deepEqual(repeated.diagnostics, first.diagnostics);
    assert.equal(gate.adoptionReady, true);
    assert.equal(gate.hardConstraintPassed, true);
    assert.deepEqual(gate.hardFailures, []);
    assert.equal(first.diagnostics.rangeViolations, 0);
    assert.equal(first.diagnostics.voiceCrossings, 0);
    assert.equal(first.diagnostics.subjectIdentityViolations, 0);
    assert.equal(first.diagnostics.answerPlanViolations, 0);
    assert.equal(first.diagnostics.keyMetadataMismatches, 0);
    assert.equal(first.diagnostics.unresolvedDissonanceCount, 0);
    assert.equal(first.diagnostics.allVoiceSilenceGapCount, 0);
    assert.equal(first.diagnostics.candidatePoolOracle.schemaVersion, 5);
    assert.equal(first.diagnostics.phraseRepetitionReview.schemaVersion, 1);
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
      lengthTicks: REVIEW_LENGTH_TICKS,
      selectionModel: "candidate-oracle-selection",
    });
    const variant = generateScore({
      seed,
      lengthTicks: REVIEW_LENGTH_TICKS,
      selectionModel: "section-local-planner",
    });

    metrics.baselineTopEntryPatternFamilyCount +=
      baseline.diagnostics.phraseRepetitionReview.entryPatternFamilyConcentration.topFamilyCount;
    metrics.variantTopEntryPatternFamilyCount +=
      variant.diagnostics.phraseRepetitionReview.entryPatternFamilyConcentration.topFamilyCount;
    metrics.baselineUnsupportedThinningRuns +=
      baseline.diagnostics.texturePlanningReview.functionalThinning.unsupportedRunCount;
    metrics.variantUnsupportedThinningRuns +=
      variant.diagnostics.texturePlanningReview.functionalThinning.unsupportedRunCount;
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
