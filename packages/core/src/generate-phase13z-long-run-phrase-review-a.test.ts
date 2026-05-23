import assert from "node:assert/strict";
import test from "node:test";
import { PHASE_5_LENGTH_TICKS } from "./constants.js";
import { generateScore } from "./generate.js";
import { evaluatePhase7BGatePolicy } from "./review-gate.js";

const PHASE_13Z_FOCUSED_REVIEW_SEEDS = [
  "bach-001",
  "fugue-smoke",
  "modal-cadence",
  "dense-modal",
  "angular-answer",
] as const;

test("Phase 13Z focused seeds preserve hard constraints and repair subject-stem concentration, group A", () => {
  for (const seed of PHASE_13Z_FOCUSED_REVIEW_SEEDS) {
    const output = generateScore({ seed, lengthTicks: PHASE_5_LENGTH_TICKS });
    const gate = evaluatePhase7BGatePolicy(seed, output.diagnostics);
    const hasSubjectStemConcentration = output.diagnostics.phraseConvergenceReview.findings.some(
      (finding) => finding.code === "subject-stem-family-concentration",
    );

    assert.equal(output.diagnostics.rangeViolations, 0, `${seed} should keep range guardrail`);
    assert.equal(output.diagnostics.voiceCrossings, 0, `${seed} should keep voice-crossing guardrail`);
    assert.equal(output.diagnostics.subjectIdentityViolations, 0, `${seed} should keep subject identity guardrail`);
    assert.equal(output.diagnostics.answerPlanViolations, 0, `${seed} should keep answer-plan guardrail`);
    assert.equal(output.diagnostics.keyMetadataMismatches, 0, `${seed} should keep key metadata guardrail`);
    assert.equal(gate.phase8Ready, true, `${seed} should preserve Phase 7B readiness context`);
    assert.equal(hasSubjectStemConcentration, false, `${seed} should avoid top subject-stem concentration`);
  }
});
