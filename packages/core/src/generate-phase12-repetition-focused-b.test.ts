import test from "node:test";
import {
  assertPhase12FocusedRepetitionAdoption,
  PHASE_12_REPETITION_FOCUSED_SEEDS,
} from "./generate-phase-review-test-helpers.js";

test("generateScore completes phase-12 repetition adoption across focused seeds, batch B", () => {
  assertPhase12FocusedRepetitionAdoption(PHASE_12_REPETITION_FOCUSED_SEEDS.slice(3));
});
