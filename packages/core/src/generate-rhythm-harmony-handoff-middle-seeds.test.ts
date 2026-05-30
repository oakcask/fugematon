import test from "node:test";
import {
  assertShortEpisodeHarmonicContinuityRegressionSeedsAreRepaired,
  SHORT_EPISODE_HARMONIC_CONTINUITY_REGRESSION_SEED_GROUPS,
} from "./generate-rhythm-harmony-handoff-test-helpers.js";

test("middle short-episode harmonic-continuity regression seeds are repaired", () => {
  assertShortEpisodeHarmonicContinuityRegressionSeedsAreRepaired(
    SHORT_EPISODE_HARMONIC_CONTINUITY_REGRESSION_SEED_GROUPS.middle,
  );
});
