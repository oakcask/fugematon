import test from "node:test";
import {
  assertWeakDissonanceReviewSeedsExposePressure,
  WEAK_DISSONANCE_REVIEW_SEEDS,
} from "./generate-weak-dissonance-review-test-helpers.js";

test("weak-dissonance review seeds keep semitone clash pressure at the repaired ceiling in batch A", () => {
  assertWeakDissonanceReviewSeedsExposePressure(WEAK_DISSONANCE_REVIEW_SEEDS.slice(0, 3), {
    maxWeakPassingSemitoneClashTicks: 23_760,
    maxPassingNeighborOffbeatSemitoneClashTicks: 32_880,
  });
});
