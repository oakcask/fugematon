import assert from "node:assert/strict";
import test from "node:test";
import { PHASE_5_LENGTH_TICKS } from "./constants.js";
import { generateScore } from "./generate.js";
import { requireOracleBlocker, summarizeContinuationPatterns } from "./generate-test-helpers.js";
import { evaluatePhase7BGatePolicy } from "./review-gate.js";

test("generateScore applies history-aware section grammar planning to selected output", () => {
  const seeds = ["bach-001", "fugue-smoke", "minor-entry", "modal-cadence", "dense-modal"] as const;
  let baselineUniqueContinuationPatternCount = 0;
  let variantUniqueContinuationPatternCount = 0;
  let baselineMaxRepeatedContinuationPatternCount = 0;
  let variantMaxRepeatedContinuationPatternCount = 0;
  let baselineSectionGrammarRisk = 0;
  let variantSectionGrammarRisk = 0;
  let changedStateSequenceCount = 0;

  for (const seed of seeds) {
    const baseline = generateScore({
      seed,
      lengthTicks: PHASE_5_LENGTH_TICKS,
      selectionModel: "candidate-oracle-selection",
    });
    const variant = generateScore({
      seed,
      lengthTicks: PHASE_5_LENGTH_TICKS,
      selectionModel: "section-local-planner",
    });
    const baselineGate = evaluatePhase7BGatePolicy(seed, baseline.diagnostics);
    const variantGate = evaluatePhase7BGatePolicy(seed, variant.diagnostics);
    const baselineStats = summarizeContinuationPatterns(baseline.diagnostics.stateTransitions);
    const variantStats = summarizeContinuationPatterns(variant.diagnostics.stateTransitions);
    const baselineGrammar = requireOracleBlocker(
      baseline.diagnostics.candidatePoolOracle,
      "section-grammar-repetition",
    );
    const variantGrammar = requireOracleBlocker(variant.diagnostics.candidatePoolOracle, "section-grammar-repetition");

    assert.equal(baselineGate.phase8Ready, true);
    assert.equal(variantGate.phase8Ready, true);
    assert.equal(variant.diagnostics.rangeViolations, 0);
    assert.equal(variant.diagnostics.voiceCrossings, 0);
    assert.equal(variant.diagnostics.subjectIdentityViolations, 0);
    assert.equal(variant.diagnostics.answerPlanViolations, 0);
    if (
      JSON.stringify(variant.diagnostics.stateTransitions) !== JSON.stringify(baseline.diagnostics.stateTransitions)
    ) {
      changedStateSequenceCount += 1;
    }
    if (seed === "fugue-smoke") {
      assert.ok(variantStats.maxRepeatedCount <= baselineStats.maxRepeatedCount);
    }

    baselineUniqueContinuationPatternCount += baselineStats.uniqueCount;
    variantUniqueContinuationPatternCount += variantStats.uniqueCount;
    baselineMaxRepeatedContinuationPatternCount = Math.max(
      baselineMaxRepeatedContinuationPatternCount,
      baselineStats.maxRepeatedCount,
    );
    variantMaxRepeatedContinuationPatternCount = Math.max(
      variantMaxRepeatedContinuationPatternCount,
      variantStats.maxRepeatedCount,
    );
    baselineSectionGrammarRisk += baselineGrammar.selectedRiskTotal;
    variantSectionGrammarRisk += variantGrammar.selectedRiskTotal;
  }

  assert.ok(changedStateSequenceCount >= 3);
  assert.ok(variantUniqueContinuationPatternCount > baselineUniqueContinuationPatternCount);
  assert.ok(variantMaxRepeatedContinuationPatternCount <= baselineMaxRepeatedContinuationPatternCount);
  assert.ok(variantSectionGrammarRisk < baselineSectionGrammarRisk);
});
