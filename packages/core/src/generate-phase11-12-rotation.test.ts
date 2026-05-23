import assert from "node:assert/strict";
import test from "node:test";
import { collectPhase1112PlanningMetrics, PHASE_11_12_ROTATION_SEEDS } from "./generate-phase-review-test-helpers.js";

test("generateScore applies phase-11 and phase-12 phrase-unit planning across rotation seed batch A", () => {
  assertPhase1112RotationBatch(PHASE_11_12_ROTATION_SEEDS.slice(0, 5), {
    topEntryPatternFamilyDelta: 4,
    leapRecoveryMissDelta: 42,
  });
});

function assertPhase1112RotationBatch(
  seeds: readonly string[],
  expectation: {
    topEntryPatternFamilyDelta: number;
    leapRecoveryMissDelta: number;
  },
): void {
  const metrics = collectPhase1112PlanningMetrics(seeds);
  assert.equal(metrics.changedStateSequenceCount, metrics.seedCount);
  assert.ok(metrics.variantUniqueContinuationPatternCount >= metrics.baselineUniqueContinuationPatternCount * 2.5);
  assert.ok(metrics.variantSectionGrammarRisk <= metrics.baselineSectionGrammarRisk * 0.45);
  assert.ok(
    metrics.variantTopEntryPatternFamilyCount <=
      metrics.baselineTopEntryPatternFamilyCount + expectation.topEntryPatternFamilyDelta,
  );
  assert.ok(metrics.variantUnsupportedThinningRuns <= metrics.baselineUnsupportedThinningRuns / 2);
  assert.ok(metrics.variantBassRootSupportCount > metrics.baselineBassRootSupportCount);
  assert.ok(metrics.variantUnisonOverlapCount <= metrics.baselineUnisonOverlapCount + 100);
  assert.ok(metrics.variantSharedRhythmOverlapCount <= metrics.baselineSharedRhythmOverlapCount + 165);
  assert.ok(
    metrics.variantLeapRecoveryMisses <= metrics.baselineLeapRecoveryMisses + expectation.leapRecoveryMissDelta,
  );
  assert.ok(metrics.variantCounterSubjectIdentityRetention >= metrics.baselineCounterSubjectIdentityRetention - 0.18);
}
