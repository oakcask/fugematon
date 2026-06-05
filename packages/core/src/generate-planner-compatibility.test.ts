import assert from "node:assert/strict";
import test from "node:test";
import { REVIEW_LENGTH_TICKS } from "./constants.js";
import { generateScore } from "./generate.js";
import { assertPlannerCompletionCompatibility } from "./generate-planner-compatibility-test-helpers.js";
import { evaluateMelodyTextureGate } from "./review-gate.js";

test("generateScore can compare the candidate-oracle selection model against baseline", () => {
  const baseline = generateScore({ seed: "bach-001", lengthTicks: REVIEW_LENGTH_TICKS, selectionModel: "baseline" });
  const variant = generateScore({
    seed: "bach-001",
    lengthTicks: REVIEW_LENGTH_TICKS,
    selectionModel: "candidate-oracle-selection",
  });
  const baselineGate = evaluateMelodyTextureGate("bach-001", baseline.diagnostics);
  const variantGate = evaluateMelodyTextureGate("bach-001", variant.diagnostics);

  assert.deepEqual(baselineGate.failures, []);
  assert.deepEqual(variantGate.failures, []);
  assert.equal(variant.diagnostics.rangeViolations, baseline.diagnostics.rangeViolations);
  assert.equal(variant.diagnostics.voiceCrossings, baseline.diagnostics.voiceCrossings);
  assert.equal(variant.diagnostics.subjectIdentityViolations, baseline.diagnostics.subjectIdentityViolations);
  assert.equal(variant.diagnostics.answerPlanViolations, baseline.diagnostics.answerPlanViolations);
  assert.ok(variant.diagnostics.candidatePoolOracle.viableCandidateCount > 0);
});

test("generateScore preserves planner completion compatibility across the readiness subset", () => {
  assertPlannerCompletionCompatibility("baseline");
});
