import assert from "node:assert/strict";
import { collectPhase1112PlanningMetrics } from "./generate-phase-review-test-helpers.js";

export function assertPhase1112ReviewBatch(
  seeds: readonly string[],
  expectation: {
    uniqueContinuationPatternRatio: number;
    sectionGrammarRiskRatio: number;
    topEntryPatternFamilyDelta: number;
    unisonOverlapDelta: number;
    sharedRhythmOverlapDelta: number;
    leapRecoveryMissDelta: number;
  },
): void {
  const metrics = collectPhase1112PlanningMetrics(seeds);
  assert.equal(metrics.changedStateSequenceCount, metrics.seedCount);
  assert.ok(
    metrics.variantUniqueContinuationPatternCount >=
      metrics.baselineUniqueContinuationPatternCount * expectation.uniqueContinuationPatternRatio,
  );
  assert.ok(
    metrics.variantSectionGrammarRisk <= metrics.baselineSectionGrammarRisk * expectation.sectionGrammarRiskRatio,
  );
  assert.ok(
    metrics.variantTopEntryPatternFamilyCount <=
      metrics.baselineTopEntryPatternFamilyCount + expectation.topEntryPatternFamilyDelta,
  );
  assert.ok(metrics.variantUnsupportedThinningRuns <= metrics.baselineUnsupportedThinningRuns / 2);
  assert.ok(metrics.variantBassRootSupportCount > metrics.baselineBassRootSupportCount);
  assert.ok(metrics.variantUnisonOverlapCount <= metrics.baselineUnisonOverlapCount + expectation.unisonOverlapDelta);
  assert.ok(
    metrics.variantSharedRhythmOverlapCount <=
      metrics.baselineSharedRhythmOverlapCount + expectation.sharedRhythmOverlapDelta,
  );
  assert.ok(
    metrics.variantLeapRecoveryMisses <= metrics.baselineLeapRecoveryMisses + expectation.leapRecoveryMissDelta,
  );
  assert.ok(metrics.variantCounterSubjectIdentityRetention >= metrics.baselineCounterSubjectIdentityRetention - 0.08);
}
