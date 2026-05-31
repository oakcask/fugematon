import assert from "node:assert/strict";
import test from "node:test";
import { REVIEW_LENGTH_TICKS } from "./constants.js";
import { generateScore } from "./generate.js";

const TEXTURE_SUPPORT_FOLLOWUP_SEEDS_A = ["bach-001", "fugue-smoke", "modal-cadence"] as const;

test("phrase convergence follow-up representative seeds repair abrupt three-part silence as unsupported solo texture", () => {
  const seedsWithAbruptDrops = TEXTURE_SUPPORT_FOLLOWUP_SEEDS_A.filter(
    (seed) =>
      generateScore({ seed, lengthTicks: REVIEW_LENGTH_TICKS }).diagnostics.soloTexture.abruptTextureDropCount > 0,
  );

  assert.deepEqual(seedsWithAbruptDrops, []);
});
