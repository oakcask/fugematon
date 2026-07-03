import assert from "node:assert/strict";
import { MELODY_TEXTURE_DIAGNOSTICS_PROFILE, REVIEW_LENGTH_TICKS } from "./constants.js";
import { cachedGenerateScore as generateScore } from "./generate-test-helpers.js";
import { reviewTest } from "./test-profile.js";

const TEXTURE_SUPPORT_FOLLOWUP_SEEDS_A2 = ["dense-modal", "angular-answer"] as const;

reviewTest("phrase convergence follow-up representative seeds repair unsupported solo texture in batch A2", () => {
  const seedsWithAbruptDrops = TEXTURE_SUPPORT_FOLLOWUP_SEEDS_A2.filter(
    (seed) =>
      generateScore({ seed, lengthTicks: REVIEW_LENGTH_TICKS }).diagnostics.soloTexture.abruptTextureDropCount >
      MELODY_TEXTURE_DIAGNOSTICS_PROFILE.maxAbruptTextureDropCount,
  );

  assert.deepEqual(seedsWithAbruptDrops, []);
});
