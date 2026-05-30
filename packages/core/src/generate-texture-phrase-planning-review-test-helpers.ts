import assert from "node:assert/strict";
import { collectTexturePhrasePlanningMetrics } from "./generate-quality-review-test-helpers.js";

export function assertTexturePhrasePlanningReviewBatch(
  seeds: readonly string[],
  expectation: {
    uniqueContinuationPatternRatio: number;
    sectionGrammarRiskRatio: number;
    topEntryPatternFamilyDelta: number;
    unisonOverlapDelta: number;
    sharedRhythmOverlapDelta: number;
    leapRecoveryMissDelta: number;
    bassRootSupportDelta?: number;
    counterSubjectIdentityRetentionDelta?: number;
  },
): void {
  const metrics = collectTexturePhrasePlanningMetrics(seeds);
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
  assert.ok(metrics.variantUnsupportedThinningRuns <= Math.max(1, metrics.baselineUnsupportedThinningRuns / 2));
  assert.ok(
    metrics.variantBassRootSupportCount >=
      metrics.baselineBassRootSupportCount + (expectation.bassRootSupportDelta ?? 1),
  );
  assert.ok(metrics.variantUnisonOverlapCount <= metrics.baselineUnisonOverlapCount + expectation.unisonOverlapDelta);
  assert.ok(
    metrics.variantSharedRhythmOverlapCount <=
      metrics.baselineSharedRhythmOverlapCount + expectation.sharedRhythmOverlapDelta,
  );
  assert.ok(
    metrics.variantLeapRecoveryMisses <= metrics.baselineLeapRecoveryMisses + expectation.leapRecoveryMissDelta,
  );
  assert.ok(
    metrics.variantCounterSubjectIdentityRetention >=
      metrics.baselineCounterSubjectIdentityRetention - (expectation.counterSubjectIdentityRetentionDelta ?? 0.08),
  );
}
