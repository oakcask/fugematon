import assert from "node:assert/strict";
import test from "node:test";
import { PHASE_5_11_ROTATION_SEEDS, PHASE_5_LENGTH_TICKS, PHASE_5_REVIEW_SEEDS } from "./constants.js";
import { generateScore } from "./generate.js";
import { summarizeContinuationPatterns } from "./generate-test-helpers.js";
import { evaluatePhase6Diagnostics, evaluatePhase7Diagnostics } from "./review-gate.js";

test("generateScore rotates long-run continuation patterns without gate regressions", () => {
  const seeds = [...PHASE_5_REVIEW_SEEDS, ...PHASE_5_11_ROTATION_SEEDS];
  let highSelectedSectionSoloTextureRiskCount = 0;
  let uniqueContinuationPatternCount = 0;
  let maxRepeatedContinuationPatternCount = 0;

  for (const { seed } of seeds) {
    const output = generateScore({ seed, lengthTicks: PHASE_5_LENGTH_TICKS, selectionModel: "baseline" });
    const gate6 = evaluatePhase6Diagnostics(seed, output.diagnostics);
    const gate7 = evaluatePhase7Diagnostics(seed, output.diagnostics);
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

  assert.ok(highSelectedSectionSoloTextureRiskCount <= 317);
  assert.ok(uniqueContinuationPatternCount >= 112);
  assert.ok(maxRepeatedContinuationPatternCount <= 7);
});
