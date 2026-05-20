import assert from "node:assert/strict";
import test from "node:test";
import { PHASE_5_LENGTH_TICKS } from "./constants.js";
import { generateScore } from "./generate.js";

const PHASE_13R_FOLLOWUP_CONVERGENCE_SEEDS_A = [
  "bach-001",
  "fugue-smoke",
  "modal-cadence",
  "dense-modal",
  "angular-answer",
] as const;

test("phase-13R follow-up representative seeds repair mechanical subject-fragment convergence", () => {
  const seedsWithFragmentFindings = PHASE_13R_FOLLOWUP_CONVERGENCE_SEEDS_A.filter((seed) =>
    generateScore({ seed, lengthTicks: PHASE_5_LENGTH_TICKS }).diagnostics.phase13RReview.findings.some(
      (finding) => finding.code === "subject-fragment-family-concentration",
    ),
  );

  assert.deepEqual(seedsWithFragmentFindings, []);
});
