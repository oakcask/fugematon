import {
  assertWeakDissonanceReviewSeedsExposePressure,
  WEAK_DISSONANCE_REVIEW_SEEDS,
} from "./generate-weak-dissonance-review-test-helpers.js";
import { reviewTest } from "./test-profile.js";

reviewTest("weak-dissonance review seeds keep semitone clash pressure at the repaired ceiling in batch A", () => {
  assertWeakDissonanceReviewSeedsExposePressure(WEAK_DISSONANCE_REVIEW_SEEDS.slice(0, 3), {
    maxWeakPassingSemitoneClashTicks: 24_000,
    maxPassingNeighborOffbeatSemitoneClashTicks: 35_760,
  });
});
