import assert from "node:assert/strict";
import test from "node:test";
import { PHASE_5_LENGTH_TICKS } from "./constants.js";
import { generateScore } from "./generate.js";

const PHASE_13R_FOLLOWUP_CONVERGENCE_SEEDS_B = [
  "modal-answer",
  "minor-entry",
  "sparse-cadence",
  "random-listen-check",
] as const;

test("phase-13R follow-up boundary seeds repair mechanical subject-fragment convergence", () => {
  const seedsWithFragmentFindings = PHASE_13R_FOLLOWUP_CONVERGENCE_SEEDS_B.filter((seed) =>
    generateScore({ seed, lengthTicks: PHASE_5_LENGTH_TICKS }).diagnostics.phraseConvergenceReview.findings.some(
      (finding) => finding.code === "subject-fragment-family-concentration",
    ),
  );

  assert.deepEqual(seedsWithFragmentFindings, []);
});
