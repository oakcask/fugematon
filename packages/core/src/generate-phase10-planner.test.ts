import assert from "node:assert/strict";
import test from "node:test";
import { PHASE_5_LENGTH_TICKS } from "./constants.js";
import { generateScore } from "./generate.js";
import { requireOracleBlocker, summarizeContinuationPatterns } from "./generate-test-helpers.js";
import { evaluatePhase7BGatePolicy } from "./review-gate.js";

test("generateScore adds guarded phase-10 section-local planner candidates", () => {
  const blockerSeeds = ["modal-cadence", "dense-modal"] as const;
  let baselineHighSoloTextureSections = 0;
  let variantHighSoloTextureSections = 0;
  let baselineSoloTextureRisk = 0;
  let variantSoloTextureRisk = 0;

  for (const seed of blockerSeeds) {
    const baseline = generateScore({
      seed,
      lengthTicks: PHASE_5_LENGTH_TICKS,
      selectionModel: "phase10-oracle-selection",
    });
    const variant = generateScore({
      seed,
      lengthTicks: PHASE_5_LENGTH_TICKS,
      selectionModel: "phase10-section-local-planner",
    });
    const baselineGate = evaluatePhase7BGatePolicy(seed, baseline.diagnostics);
    const variantGate = evaluatePhase7BGatePolicy(seed, variant.diagnostics);
    const baselineRisks = baseline.diagnostics.selectedCandidateEvaluations.flatMap((evaluation) =>
      evaluation.explanations.sections.map((section) => section.soloTextureRisk),
    );
    const variantRisks = variant.diagnostics.selectedCandidateEvaluations.flatMap((evaluation) =>
      evaluation.explanations.sections.map((section) => section.soloTextureRisk),
    );

    assert.equal(baselineGate.phase8Ready, true);
    assert.equal(variantGate.phase8Ready, true);
    assert.equal(
      variant.diagnostics.candidatePoolOracle.schemaVersion,
      baseline.diagnostics.candidatePoolOracle.schemaVersion,
    );
    assert.ok(
      variant.diagnostics.candidatePoolOracle.candidateCount >= baseline.diagnostics.candidatePoolOracle.candidateCount,
    );
    assert.ok(variant.diagnostics.samePitchOverlapCount <= baseline.diagnostics.samePitchOverlapCount + 5);
    assert.ok(variant.diagnostics.unisonOverlapCount <= baseline.diagnostics.unisonOverlapCount + 14);
    assert.ok(variant.diagnostics.sharedRhythmOverlapCount <= baseline.diagnostics.sharedRhythmOverlapCount);
    assert.ok(variant.diagnostics.leapRecoveryMisses <= baseline.diagnostics.leapRecoveryMisses + 3);
    assert.ok(
      variant.diagnostics.counterSubjectIdentityRetention >=
        baseline.diagnostics.counterSubjectIdentityRetention - 0.025,
    );
    assert.ok(
      variant.diagnostics.pitchContourMotion.fourBeat.outerVoiceSameDirectionRatio <=
        baseline.diagnostics.pitchContourMotion.fourBeat.outerVoiceSameDirectionRatio + 0.03,
    );

    baselineHighSoloTextureSections += baselineRisks.filter((risk) => risk >= 6).length;
    variantHighSoloTextureSections += variantRisks.filter((risk) => risk >= 6).length;
    baselineSoloTextureRisk += baselineRisks.reduce((sum, risk) => sum + risk, 0);
    variantSoloTextureRisk += variantRisks.reduce((sum, risk) => sum + risk, 0);
  }

  assert.ok(variantHighSoloTextureSections < baselineHighSoloTextureSections);
  assert.ok(variantSoloTextureRisk < baselineSoloTextureRisk);
});

test("generateScore adds register-blended section-local planner alternatives", () => {
  const seed = "dense-modal";
  const baseline = generateScore({
    seed,
    lengthTicks: PHASE_5_LENGTH_TICKS,
    selectionModel: "phase10-oracle-selection",
  });
  const variant = generateScore({
    seed,
    lengthTicks: PHASE_5_LENGTH_TICKS,
    selectionModel: "phase10-section-local-planner",
  });
  const baselineGate = evaluatePhase7BGatePolicy(seed, baseline.diagnostics);
  const variantGate = evaluatePhase7BGatePolicy(seed, variant.diagnostics);

  assert.equal(baselineGate.phase8Ready, true);
  assert.equal(variantGate.phase8Ready, true);
  assert.ok(
    variant.diagnostics.candidatePoolOracle.candidateCount > baseline.diagnostics.candidatePoolOracle.candidateCount,
  );
  assert.ok(
    variant.diagnostics.candidatePoolOracle.viableCandidateCount >
      baseline.diagnostics.candidatePoolOracle.viableCandidateCount,
  );
  assert.ok(
    requireOracleBlocker(variant.diagnostics.candidatePoolOracle, "register-blending").generatorNeededRate <
      requireOracleBlocker(baseline.diagnostics.candidatePoolOracle, "register-blending").generatorNeededRate,
  );
  assert.ok(
    requireOracleBlocker(variant.diagnostics.candidatePoolOracle, "metrical-harmony").generatorNeededRate <
      requireOracleBlocker(baseline.diagnostics.candidatePoolOracle, "metrical-harmony").generatorNeededRate,
  );
  assert.ok(
    requireOracleBlocker(variant.diagnostics.candidatePoolOracle, "bass-root-support").generatorNeededRate <
      requireOracleBlocker(baseline.diagnostics.candidatePoolOracle, "bass-root-support").generatorNeededRate,
  );
});

test("generateScore adds section grammar alternatives to the oracle pool", () => {
  const seed = "dense-modal";
  const baseline = generateScore({
    seed,
    lengthTicks: PHASE_5_LENGTH_TICKS,
    selectionModel: "phase10-oracle-selection",
  });
  const variant = generateScore({
    seed,
    lengthTicks: PHASE_5_LENGTH_TICKS,
    selectionModel: "phase10-section-local-planner",
  });
  const baselineGrammar = requireOracleBlocker(baseline.diagnostics.candidatePoolOracle, "section-grammar-repetition");
  const variantGrammar = requireOracleBlocker(variant.diagnostics.candidatePoolOracle, "section-grammar-repetition");

  assert.ok(
    variant.diagnostics.candidatePoolOracle.candidateCount > baseline.diagnostics.candidatePoolOracle.candidateCount,
  );
  assert.ok(variantGrammar.selectedRiskTotal < baselineGrammar.selectedRiskTotal);
  assert.ok(variantGrammar.selectedRiskMax < baselineGrammar.selectedRiskMax);
});

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
      selectionModel: "phase10-oracle-selection",
    });
    const variant = generateScore({
      seed,
      lengthTicks: PHASE_5_LENGTH_TICKS,
      selectionModel: "phase10-section-local-planner",
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
