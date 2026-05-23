import test from "node:test";
import {
  assertPhase14ScoreWindowHarnessInputs,
  PHASE_14_SCORE_WINDOW_HARNESS_SEEDS,
} from "./generate-phase14-score-window-harness-test-helpers.js";

test("Phase 14 score-window harness seed batch B keeps acceptance inputs observable", () => {
  assertPhase14ScoreWindowHarnessInputs(PHASE_14_SCORE_WINDOW_HARNESS_SEEDS.slice(4));
});
