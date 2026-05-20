import assert from "node:assert/strict";
import test from "node:test";
import { collectPhase1112PlanningMetrics, PHASE_11_12_ROTATION_SEEDS } from "./generate-phase-review-test-helpers.js";

test("generateScore applies phase-11 and phase-12 phrase-unit planning across rotation seed batch B", () => {
  const metrics = collectPhase1112PlanningMetrics(PHASE_11_12_ROTATION_SEEDS.slice(5));

  assert.equal(metrics.changedStateSequenceCount, metrics.seedCount);
  assert.ok(metrics.variantUniqueContinuationPatternCount >= metrics.baselineUniqueContinuationPatternCount * 2.5);
  assert.ok(metrics.variantSectionGrammarRisk <= metrics.baselineSectionGrammarRisk * 0.45);
  assert.ok(metrics.variantTopEntryPatternFamilyCount <= metrics.baselineTopEntryPatternFamilyCount - 1);
  assert.ok(metrics.variantUnsupportedThinningRuns <= metrics.baselineUnsupportedThinningRuns / 2);
  assert.ok(metrics.variantBassRootSupportCount > metrics.baselineBassRootSupportCount);
  assert.ok(metrics.variantUnisonOverlapCount <= metrics.baselineUnisonOverlapCount + 180);
  assert.ok(metrics.variantSharedRhythmOverlapCount <= metrics.baselineSharedRhythmOverlapCount + 80);
  assert.ok(metrics.variantLeapRecoveryMisses <= metrics.baselineLeapRecoveryMisses + 10);
  assert.ok(metrics.variantCounterSubjectIdentityRetention >= metrics.baselineCounterSubjectIdentityRetention - 0.18);
});
