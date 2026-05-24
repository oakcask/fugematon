import test from "node:test";
import {
  assertScoreWindowAcceptanceHarnessInputs,
  SCORE_WINDOW_ACCEPTANCE_HARNESS_SEEDS,
} from "./generate-phase14-score-window-harness-test-helpers.js";

test("Phase 14 score-window harness seed batch A keeps acceptance inputs observable", () => {
  assertScoreWindowAcceptanceHarnessInputs(SCORE_WINDOW_ACCEPTANCE_HARNESS_SEEDS.slice(0, 4));
});
