import assert from "node:assert/strict";
import test from "node:test";
import { REVIEW_LENGTH_TICKS } from "./constants.js";
import { generateScore } from "./generate.js";
import { evaluateReviewGatePolicy } from "./review-gate.js";

const PHRASE_DEVELOPMENT_FOCUSED_REVIEW_SEEDS = [
  "modal-answer",
  "minor-entry",
  "sparse-cadence",
  "random-listen-check",
  "seed-0zereox-1v729ih",
] as const;

test("Phase 13Z focused seeds preserve hard constraints and repair subject-stem concentration, group B", () => {
  for (const seed of PHRASE_DEVELOPMENT_FOCUSED_REVIEW_SEEDS) {
    const output = generateScore({ seed, lengthTicks: REVIEW_LENGTH_TICKS });
    const gate = evaluateReviewGatePolicy(seed, output.diagnostics);
    const hasSubjectStemConcentration = output.diagnostics.phraseConvergenceReview.findings.some(
      (finding) => finding.code === "subject-stem-family-concentration",
    );

    assert.equal(output.diagnostics.rangeViolations, 0, `${seed} should keep range guardrail`);
    assert.equal(output.diagnostics.voiceCrossings, 0, `${seed} should keep voice-crossing guardrail`);
    assert.equal(output.diagnostics.subjectIdentityViolations, 0, `${seed} should keep subject identity guardrail`);
    assert.equal(output.diagnostics.answerPlanViolations, 0, `${seed} should keep answer-plan guardrail`);
    assert.equal(output.diagnostics.keyMetadataMismatches, 0, `${seed} should keep key metadata guardrail`);
    assert.equal(gate.adoptionReady, true, `${seed} should preserve Phase 7B readiness context`);
    assert.equal(hasSubjectStemConcentration, false, `${seed} should avoid top subject-stem concentration`);
  }
});
