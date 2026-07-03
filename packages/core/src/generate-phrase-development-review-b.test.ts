import assert from "node:assert/strict";
import { REVIEW_LENGTH_TICKS } from "./constants.js";
import { cachedGenerateScore as generateScore } from "./generate-test-helpers.js";
import { evaluateReviewGatePolicy } from "./review-gate.js";
import { reviewTest } from "./test-profile.js";

const PHRASE_DEVELOPMENT_FOCUSED_REVIEW_SEEDS = ["modal-answer", "minor-entry", "sparse-cadence"] as const;

reviewTest(
  "phrase-development focused seeds preserve hard constraints and repair subject-stem concentration, group B1",
  () => {
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
      assert.equal(gate.adoptionReady, true, `${seed} should preserve review gate readiness context`);
      assert.equal(
        hasSubjectStemConcentration,
        false,
        `${seed} should keep subject-stem concentration resolved in group B1`,
      );
    }
  },
);
