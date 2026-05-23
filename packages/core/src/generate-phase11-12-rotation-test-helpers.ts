import assert from "node:assert/strict";
import { collectPhase1112PlanningMetrics } from "./generate-phase-review-test-helpers.js";

type Phase1112RotationExpectation = {
  topEntryPatternFamilyDelta: number;
  leapRecoveryMissDelta: number;
  unisonOverlapDelta?: number;
  sharedRhythmOverlapDelta?: number;
  uniqueContinuationPatternMultiplier?: number;
  sectionGrammarRiskMultiplier?: number;
};

export function assertPhase1112RotationBatch(
  seeds: readonly string[],
  expectation: Phase1112RotationExpectation,
): void {
  const metrics = collectPhase1112PlanningMetrics(seeds);
  assert.equal(metrics.changedStateSequenceCount, metrics.seedCount);
  assert.ok(
    metrics.variantUniqueContinuationPatternCount >=
      metrics.baselineUniqueContinuationPatternCount * (expectation.uniqueContinuationPatternMultiplier ?? 2.5),
  );
  assert.ok(
    metrics.variantSectionGrammarRisk <=
      metrics.baselineSectionGrammarRisk * (expectation.sectionGrammarRiskMultiplier ?? 0.45),
  );
  assert.ok(
    metrics.variantTopEntryPatternFamilyCount <=
      metrics.baselineTopEntryPatternFamilyCount + expectation.topEntryPatternFamilyDelta,
  );
  assert.ok(metrics.variantUnsupportedThinningRuns <= metrics.baselineUnsupportedThinningRuns / 2);
  assert.ok(metrics.variantBassRootSupportCount > metrics.baselineBassRootSupportCount);
  assert.ok(
    metrics.variantUnisonOverlapCount <= metrics.baselineUnisonOverlapCount + (expectation.unisonOverlapDelta ?? 100),
  );
  assert.ok(
    metrics.variantSharedRhythmOverlapCount <=
      metrics.baselineSharedRhythmOverlapCount + (expectation.sharedRhythmOverlapDelta ?? 170),
  );
  assert.ok(
    metrics.variantLeapRecoveryMisses <= metrics.baselineLeapRecoveryMisses + expectation.leapRecoveryMissDelta,
  );
  assert.ok(metrics.variantCounterSubjectIdentityRetention >= metrics.baselineCounterSubjectIdentityRetention - 0.18);
}
