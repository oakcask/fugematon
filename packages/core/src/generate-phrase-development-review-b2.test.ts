import assert from "node:assert/strict";
import test from "node:test";
import { REVIEW_LENGTH_TICKS } from "./constants.js";
import { cachedGenerateScore as generateScore } from "./generate-test-helpers.js";
import { evaluateReviewGatePolicy } from "./review-gate.js";

const PHRASE_DEVELOPMENT_FOCUSED_REVIEW_SEEDS = ["random-listen-check", "seed-0zereox-1v729ih"] as const;

test("phrase-development focused seeds preserve hard constraints and repair subject-stem concentration, group B2", () => {
  for (const seed of PHRASE_DEVELOPMENT_FOCUSED_REVIEW_SEEDS) {
    const output = generateScore({ seed, lengthTicks: REVIEW_LENGTH_TICKS });
    const gate = evaluateReviewGatePolicy(seed, output.diagnostics);

    assert.equal(output.diagnostics.rangeViolations, 0, `${seed} should keep range guardrail`);
    assert.equal(output.diagnostics.voiceCrossings, 0, `${seed} should keep voice-crossing guardrail`);
    assert.equal(output.diagnostics.subjectIdentityViolations, 0, `${seed} should keep subject identity guardrail`);
    assert.equal(output.diagnostics.answerPlanViolations, 0, `${seed} should keep answer-plan guardrail`);
    assert.equal(output.diagnostics.keyMetadataMismatches, 0, `${seed} should keep key metadata guardrail`);
    assert.equal(gate.adoptionReady, true, `${seed} should preserve review gate readiness context`);
    assert.equal(
      output.diagnostics.phraseDevelopmentReview.reviewRequired,
      false,
      `${seed} should keep subject-stem concentration below the phrase-development blocker`,
    );
  }
});
