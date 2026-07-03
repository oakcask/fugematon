import {
  assertShortEpisodeHarmonicContinuityRegressionSeedsAreRepaired,
  SHORT_EPISODE_HARMONIC_CONTINUITY_REGRESSION_SEED_GROUPS,
} from "./generate-rhythm-harmony-handoff-test-helpers.js";
import { reviewTest } from "./test-profile.js";

reviewTest("initial short-episode harmonic-continuity regression seeds are repaired", () => {
  assertShortEpisodeHarmonicContinuityRegressionSeedsAreRepaired(
    SHORT_EPISODE_HARMONIC_CONTINUITY_REGRESSION_SEED_GROUPS.initial,
  );
});
