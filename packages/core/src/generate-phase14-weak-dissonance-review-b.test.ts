import test from "node:test";
import {
  assertPhase14WeakDissonanceReviewSeedsExposePressure,
  PHASE_14_WEAK_DISSONANCE_REVIEW_SEEDS,
} from "./generate-phase14-weak-dissonance-review-helpers.js";

test("Phase 14 weak-dissonance review seeds expose semitone clash pressure in batch B", () => {
  assertPhase14WeakDissonanceReviewSeedsExposePressure(PHASE_14_WEAK_DISSONANCE_REVIEW_SEEDS.slice(3), {
    minWeakPassingSemitoneClashTicks: 8_000,
    minPassingNeighborOffbeatSemitoneClashTicks: 31_000,
  });
});
