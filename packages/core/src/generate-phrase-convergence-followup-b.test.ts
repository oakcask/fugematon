import assert from "node:assert/strict";
import test from "node:test";
import { REVIEW_LENGTH_TICKS } from "./constants.js";
import { cachedGenerateScore as generateScore } from "./generate-test-helpers.js";

const PHRASE_CONVERGENCE_FOLLOWUP_SEEDS_B = [
  "modal-answer",
  "minor-entry",
  "sparse-cadence",
  "random-listen-check",
] as const;

test("phrase convergence follow-up boundary seeds repair mechanical subject-fragment convergence", () => {
  const seedsWithFragmentFindings = PHRASE_CONVERGENCE_FOLLOWUP_SEEDS_B.filter((seed) =>
    generateScore({ seed, lengthTicks: REVIEW_LENGTH_TICKS }).diagnostics.phraseConvergenceReview.findings.some(
      (finding) => finding.code === "subject-fragment-family-concentration",
    ),
  );

  assert.deepEqual(seedsWithFragmentFindings, []);
});
