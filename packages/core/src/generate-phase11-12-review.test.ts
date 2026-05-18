import assert from "node:assert/strict";
import test from "node:test";
import { collectPhase1112PlanningMetrics, PHASE_11_12_REVIEW_SEEDS } from "./generate-phase-review-test-helpers.js";

test("generateScore applies phase-11 and phase-12 phrase-unit planning across review seeds", () => {
  const metrics = collectPhase1112PlanningMetrics(PHASE_11_12_REVIEW_SEEDS);

  assert.equal(metrics.changedStateSequenceCount, metrics.seedCount);
  assert.ok(metrics.variantUniqueContinuationPatternCount >= metrics.baselineUniqueContinuationPatternCount * 3.4);
  assert.ok(metrics.variantSectionGrammarRisk <= metrics.baselineSectionGrammarRisk * 0.2);
  assert.ok(metrics.variantTopEntryPatternFamilyCount <= metrics.baselineTopEntryPatternFamilyCount - 12);
  assert.ok(metrics.variantUnsupportedThinningRuns <= metrics.baselineUnsupportedThinningRuns / 2);
  assert.ok(metrics.variantBassRootSupportCount > metrics.baselineBassRootSupportCount);
  assert.ok(metrics.variantUnisonOverlapCount <= metrics.baselineUnisonOverlapCount + 380);
  assert.ok(metrics.variantSharedRhythmOverlapCount <= metrics.baselineSharedRhythmOverlapCount + 360);
  assert.ok(metrics.variantLeapRecoveryMisses <= metrics.baselineLeapRecoveryMisses + 60);
  assert.ok(metrics.variantCounterSubjectIdentityRetention >= metrics.baselineCounterSubjectIdentityRetention - 0.16);
});
