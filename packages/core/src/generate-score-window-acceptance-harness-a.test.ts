import test from "node:test";
import {
  assertScoreWindowAcceptanceHarnessInputs,
  SCORE_WINDOW_ACCEPTANCE_HARNESS_SEEDS,
} from "./generate-score-window-acceptance-harness-test-helpers.js";

test("score-window acceptance harness seed batch A keeps acceptance inputs observable", () => {
  assertScoreWindowAcceptanceHarnessInputs(SCORE_WINDOW_ACCEPTANCE_HARNESS_SEEDS.slice(0, 4));
});
