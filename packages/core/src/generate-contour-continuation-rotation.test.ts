import assert from "node:assert/strict";
import test from "node:test";
import { REPRESENTATIVE_REVIEW_SEEDS, REVIEW_LENGTH_TICKS } from "./constants.js";
import { cachedGenerateScore as generateScore, summarizeContinuationPatterns } from "./generate-test-helpers.js";
import { evaluateContourMotionGate, evaluateMelodyTextureGate } from "./review-gate.js";

test("generateScore rotates representative long-run continuation patterns without gate regressions", () => {
  const seeds = REPRESENTATIVE_REVIEW_SEEDS;
  let highSelectedSectionSoloTextureRiskCount = 0;
  let uniqueContinuationPatternCount = 0;
  let maxRepeatedContinuationPatternCount = 0;

  for (const { seed } of seeds) {
    const output = generateScore({ seed, lengthTicks: REVIEW_LENGTH_TICKS, selectionModel: "baseline" });
    const gate6 = evaluateMelodyTextureGate(seed, output.diagnostics);
    const gate7 = evaluateContourMotionGate(seed, output.diagnostics);
    const selectedSectionRisks = output.diagnostics.selectedCandidateEvaluations.flatMap((evaluation) =>
      evaluation.explanations.sections.map((section) => section.soloTextureRisk),
    );
    const continuationPatternStats = summarizeContinuationPatterns(output.diagnostics.stateTransitions);

    assert.deepEqual(gate6.failures, []);
    assert.deepEqual(gate7.failures, []);
    assert.equal(gate6.passed, true);
    assert.equal(gate7.passed, true);
    assert.ok(continuationPatternStats.uniqueCount >= 4);
    assert.ok(continuationPatternStats.maxRepeatedCount <= 7);

    highSelectedSectionSoloTextureRiskCount += selectedSectionRisks.filter((risk) => risk >= 6).length;
    uniqueContinuationPatternCount += continuationPatternStats.uniqueCount;
    maxRepeatedContinuationPatternCount = Math.max(
      maxRepeatedContinuationPatternCount,
      continuationPatternStats.maxRepeatedCount,
    );
  }

  assert.ok(highSelectedSectionSoloTextureRiskCount <= 210);
  assert.ok(uniqueContinuationPatternCount >= 71);
  assert.ok(maxRepeatedContinuationPatternCount <= 7);
});
