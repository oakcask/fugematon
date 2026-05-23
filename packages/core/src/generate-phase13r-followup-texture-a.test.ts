import assert from "node:assert/strict";
import test from "node:test";
import { REVIEW_LENGTH_TICKS } from "./constants.js";
import { generateScore } from "./generate.js";

const PHASE_13R_FOLLOWUP_TEXTURE_SEEDS_A = [
  "bach-001",
  "fugue-smoke",
  "modal-cadence",
  "dense-modal",
  "angular-answer",
] as const;

test("phase-13R follow-up representative seeds repair abrupt three-part silence as unsupported solo texture", () => {
  const seedsWithAbruptDrops = PHASE_13R_FOLLOWUP_TEXTURE_SEEDS_A.filter(
    (seed) =>
      generateScore({ seed, lengthTicks: REVIEW_LENGTH_TICKS }).diagnostics.soloTexture.abruptTextureDropCount > 0,
  );

  assert.deepEqual(seedsWithAbruptDrops, []);
});
