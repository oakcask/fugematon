import test from "node:test";
import {
  assertWeakDissonanceReviewSeedsExposePressure,
  WEAK_DISSONANCE_REVIEW_SEEDS,
} from "./generate-weak-dissonance-review-test-helpers.js";

test("weak-dissonance review seeds keep semitone clash pressure at the repaired ceiling in batch B", () => {
  assertWeakDissonanceReviewSeedsExposePressure(WEAK_DISSONANCE_REVIEW_SEEDS.slice(3), {
    maxWeakPassingSemitoneClashTicks: 20_200,
    maxPassingNeighborOffbeatSemitoneClashTicks: 52_800,
  });
});
