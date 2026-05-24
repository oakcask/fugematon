import test from "node:test";
import {
  assertWeakDissonanceReviewSeedsExposePressure,
  WEAK_DISSONANCE_REVIEW_SEEDS,
} from "./generate-phase14-weak-dissonance-review-helpers.js";

test("Phase 14 weak-dissonance review seeds keep semitone clash pressure at the repaired ceiling in batch A", () => {
  assertWeakDissonanceReviewSeedsExposePressure(WEAK_DISSONANCE_REVIEW_SEEDS.slice(0, 3), {
    maxWeakPassingSemitoneClashTicks: 16_000,
    maxPassingNeighborOffbeatSemitoneClashTicks: 32_000,
  });
});
