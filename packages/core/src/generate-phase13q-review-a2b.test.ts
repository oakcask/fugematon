import test from "node:test";
import { PHASE_13Q_FOCUSED_SEEDS } from "./generate-phase-review-test-helpers.js";
import { assertPhase13QAdoptionSeedsReady } from "./generate-phase13q-review-test-helpers.js";

test("generateScore keeps phase-13Q adoption seed batch A2b ready for generator-side quality work", () => {
  assertPhase13QAdoptionSeedsReady(PHASE_13Q_FOCUSED_SEEDS.slice(4, 6));
});
