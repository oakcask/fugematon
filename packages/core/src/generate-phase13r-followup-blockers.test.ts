import assert from "node:assert/strict";
import test from "node:test";
import { PHASE_5_LENGTH_TICKS } from "./constants.js";
import { generateScore } from "./generate.js";

const PHASE_13R_FOLLOWUP_SEEDS = [
  "bach-001",
  "fugue-smoke",
  "modal-cadence",
  "dense-modal",
  "angular-answer",
  "modal-answer",
  "minor-entry",
  "sparse-cadence",
  "random-listen-check",
] as const;

test("phase-13R follow-up seeds localize phrase-family convergence review signals", () => {
  const seedsWithConvergenceFindings = PHASE_13R_FOLLOWUP_SEEDS.filter((seed) =>
    generateScore({ seed, lengthTicks: PHASE_5_LENGTH_TICKS }).diagnostics.phase13RReview.findings.some(
      (finding) =>
        finding.code === "subject-stem-family-concentration" ||
        finding.code === "subject-fragment-family-concentration",
    ),
  );

  assert.deepEqual(seedsWithConvergenceFindings, [
    "fugue-smoke",
    "modal-cadence",
    "dense-modal",
    "angular-answer",
    "modal-answer",
    "minor-entry",
    "sparse-cadence",
    "random-listen-check",
  ]);
});

test("phase-13R follow-up seeds localize abrupt three-part silence as unsupported solo texture", () => {
  const seedsWithAbruptDrops = PHASE_13R_FOLLOWUP_SEEDS.filter(
    (seed) =>
      generateScore({ seed, lengthTicks: PHASE_5_LENGTH_TICKS }).diagnostics.soloTexture.abruptTextureDropCount > 0,
  );

  assert.deepEqual(seedsWithAbruptDrops, [
    "bach-001",
    "fugue-smoke",
    "modal-cadence",
    "dense-modal",
    "angular-answer",
    "modal-answer",
    "minor-entry",
    "random-listen-check",
  ]);
});
