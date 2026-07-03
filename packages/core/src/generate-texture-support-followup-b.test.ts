import assert from "node:assert/strict";
import { MELODY_TEXTURE_DIAGNOSTICS_PROFILE, REVIEW_LENGTH_TICKS } from "./constants.js";
import { cachedGenerateScore as generateScore } from "./generate-test-helpers.js";
import { reviewTest } from "./test-profile.js";

const TEXTURE_SUPPORT_FOLLOWUP_SEEDS_B = [
  "modal-answer",
  "minor-entry",
  "sparse-cadence",
  "random-listen-check",
] as const;

reviewTest(
  "phrase convergence follow-up boundary seeds repair abrupt three-part silence as unsupported solo texture",
  () => {
    const seedsWithAbruptDrops = TEXTURE_SUPPORT_FOLLOWUP_SEEDS_B.filter(
      (seed) =>
        generateScore({ seed, lengthTicks: REVIEW_LENGTH_TICKS }).diagnostics.soloTexture.abruptTextureDropCount >
        MELODY_TEXTURE_DIAGNOSTICS_PROFILE.maxAbruptTextureDropCount,
    );

    assert.deepEqual(seedsWithAbruptDrops, []);
  },
);
