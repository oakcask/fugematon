import assert from "node:assert/strict";
import test from "node:test";
import { REVIEW_LENGTH_TICKS } from "./constants.js";
import { generateScore } from "./generate.js";

const TEXTURE_SUPPORT_FOLLOWUP_SEEDS_B = [
  "modal-answer",
  "minor-entry",
  "sparse-cadence",
  "random-listen-check",
] as const;

test("phase-13R follow-up boundary seeds repair abrupt three-part silence as unsupported solo texture", () => {
  const seedsWithAbruptDrops = TEXTURE_SUPPORT_FOLLOWUP_SEEDS_B.filter(
    (seed) =>
      generateScore({ seed, lengthTicks: REVIEW_LENGTH_TICKS }).diagnostics.soloTexture.abruptTextureDropCount > 0,
  );

  assert.deepEqual(seedsWithAbruptDrops, []);
});
