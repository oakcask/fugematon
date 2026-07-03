import assert from "node:assert/strict";
import { REVIEW_LENGTH_TICKS } from "./constants.js";
import { cachedGenerateScore as generateScore, requireOracleBlocker } from "./generate-test-helpers.js";
import { evaluateReviewGatePolicy } from "./review-gate.js";
import { reviewTest } from "./test-profile.js";

reviewTest("generateScore adds register-blended section-local planner alternatives", () => {
  const seed = "dense-modal";
  const baseline = generateScore({
    seed,
    lengthTicks: REVIEW_LENGTH_TICKS,
    selectionModel: "candidate-oracle-selection",
  });
  const variant = generateScore({
    seed,
    lengthTicks: REVIEW_LENGTH_TICKS,
    selectionModel: "section-local-planner",
  });
  const baselineGate = evaluateReviewGatePolicy(seed, baseline.diagnostics);
  const variantGate = evaluateReviewGatePolicy(seed, variant.diagnostics);

  assert.equal(baselineGate.adoptionReady, true);
  assert.equal(variantGate.adoptionReady, true);
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
    requireOracleBlocker(variant.diagnostics.candidatePoolOracle, "bass-root-support").selectedRiskTotal <=
      requireOracleBlocker(baseline.diagnostics.candidatePoolOracle, "bass-root-support").selectedRiskTotal + 3,
  );
});

reviewTest("generateScore adds section grammar alternatives to the oracle pool", () => {
  const seed = "dense-modal";
  const baseline = generateScore({
    seed,
    lengthTicks: REVIEW_LENGTH_TICKS,
    selectionModel: "candidate-oracle-selection",
  });
  const variant = generateScore({
    seed,
    lengthTicks: REVIEW_LENGTH_TICKS,
    selectionModel: "section-local-planner",
  });
  const baselineGrammar = requireOracleBlocker(baseline.diagnostics.candidatePoolOracle, "section-grammar-repetition");
  const variantGrammar = requireOracleBlocker(variant.diagnostics.candidatePoolOracle, "section-grammar-repetition");

  assert.ok(
    variant.diagnostics.candidatePoolOracle.candidateCount > baseline.diagnostics.candidatePoolOracle.candidateCount,
  );
  assert.ok(variantGrammar.selectedRiskTotal < baselineGrammar.selectedRiskTotal);
  assert.ok(variantGrammar.selectedRiskMax <= baselineGrammar.selectedRiskMax);
});
