import assert from "node:assert/strict";
import test from "node:test";
import {
  collectTexturePhrasePlanningMetrics,
  TEXTURE_PHRASE_PLANNING_ROTATION_SEEDS,
} from "./generate-quality-review-test-helpers.js";

test("generateScore applies texture and phrase-unit planning across rotation seed batch B", () => {
  const metrics = collectTexturePhrasePlanningMetrics(TEXTURE_PHRASE_PLANNING_ROTATION_SEEDS.slice(5));

  assert.equal(metrics.changedStateSequenceCount, metrics.seedCount);
  assert.ok(metrics.variantUniqueContinuationPatternCount >= metrics.baselineUniqueContinuationPatternCount * 2.4);
  assert.ok(metrics.variantSectionGrammarRisk <= metrics.baselineSectionGrammarRisk * 0.58);
  assert.ok(metrics.variantTopEntryPatternFamilyCount <= metrics.baselineTopEntryPatternFamilyCount - 1);
  assert.ok(metrics.variantUnsupportedThinningRuns <= metrics.baselineUnsupportedThinningRuns / 2);
  assert.ok(metrics.variantBassRootSupportCount > metrics.baselineBassRootSupportCount);
  assert.ok(metrics.variantUnisonOverlapCount <= metrics.baselineUnisonOverlapCount + 220);
  assert.ok(metrics.variantSharedRhythmOverlapCount <= metrics.baselineSharedRhythmOverlapCount + 131);
  assert.ok(metrics.variantLeapRecoveryMisses <= metrics.baselineLeapRecoveryMisses + 100);
  assert.ok(metrics.variantCounterSubjectIdentityRetention >= metrics.baselineCounterSubjectIdentityRetention - 0.36);
});
