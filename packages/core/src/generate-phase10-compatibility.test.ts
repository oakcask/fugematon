import assert from "node:assert/strict";
import test from "node:test";
import { PHASE_5_LENGTH_TICKS } from "./constants.js";
import { generateScore } from "./generate.js";
import { assertPhase10CompletionCompatibility } from "./generate-phase10-compatibility-test-helpers.js";
import { evaluatePhase6Diagnostics } from "./review-gate.js";

test("generateScore can compare the phase-10 oracle selection model against baseline", () => {
  const baseline = generateScore({ seed: "bach-001", lengthTicks: PHASE_5_LENGTH_TICKS, selectionModel: "baseline" });
  const variant = generateScore({
    seed: "bach-001",
    lengthTicks: PHASE_5_LENGTH_TICKS,
    selectionModel: "phase10-oracle-selection",
  });
  const baselineGate = evaluatePhase6Diagnostics("bach-001", baseline.diagnostics);
  const variantGate = evaluatePhase6Diagnostics("bach-001", variant.diagnostics);

  assert.deepEqual(baselineGate.failures, []);
  assert.deepEqual(variantGate.failures, []);
  assert.equal(variant.diagnostics.rangeViolations, baseline.diagnostics.rangeViolations);
  assert.equal(variant.diagnostics.voiceCrossings, baseline.diagnostics.voiceCrossings);
  assert.equal(variant.diagnostics.subjectIdentityViolations, baseline.diagnostics.subjectIdentityViolations);
  assert.equal(variant.diagnostics.answerPlanViolations, baseline.diagnostics.answerPlanViolations);
  assert.ok(
    variant.diagnostics.candidatePoolOracle.viableCandidateCount >=
      baseline.diagnostics.candidatePoolOracle.viableCandidateCount,
  );
});

test("generateScore preserves phase-10 completion compatibility across the readiness subset", () => {
  assertPhase10CompletionCompatibility("baseline");
});
