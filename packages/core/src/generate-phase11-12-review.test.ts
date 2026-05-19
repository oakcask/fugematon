import assert from "node:assert/strict";
import test from "node:test";
import { collectPhase1112PlanningMetrics, PHASE_11_12_REVIEW_BATCH_A } from "./generate-phase-review-test-helpers.js";

test("generateScore applies phase-11 and phase-12 phrase-unit planning across review seeds batch A1", () => {
  assertPhase1112ReviewBatch(PHASE_11_12_REVIEW_BATCH_A.slice(0, 4), {
    uniqueContinuationPatternRatio: 3,
    sectionGrammarRiskRatio: 0.25,
    topEntryPatternFamilyDelta: -7,
    unisonOverlapDelta: 190,
    sharedRhythmOverlapDelta: 180,
    leapRecoveryMissDelta: 0,
  });
});

test("generateScore applies phase-11 and phase-12 phrase-unit planning across review seeds batch A2", () => {
  assertPhase1112ReviewBatch(PHASE_11_12_REVIEW_BATCH_A.slice(4), {
    uniqueContinuationPatternRatio: 3.4,
    sectionGrammarRiskRatio: 0.2,
    topEntryPatternFamilyDelta: -1,
    unisonOverlapDelta: 20,
    sharedRhythmOverlapDelta: 10,
    leapRecoveryMissDelta: 30,
  });
});

function assertPhase1112ReviewBatch(
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
