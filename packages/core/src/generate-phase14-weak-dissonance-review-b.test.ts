import test from "node:test";
import {
  assertPhase14WeakDissonanceReviewSeedsExposePressure,
  PHASE_14_WEAK_DISSONANCE_REVIEW_SEEDS,
} from "./generate-phase14-weak-dissonance-review-helpers.js";

test("Phase 14 weak-dissonance review seeds keep semitone clash pressure at the repaired ceiling in batch B", () => {
  assertPhase14WeakDissonanceReviewSeedsExposePressure(PHASE_14_WEAK_DISSONANCE_REVIEW_SEEDS.slice(3), {
    maxWeakPassingSemitoneClashTicks: 19_000,
    maxPassingNeighborOffbeatSemitoneClashTicks: 52_000,
  });
});
