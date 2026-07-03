import {
  assertScoreWindowAcceptanceHarnessInputs,
  SCORE_WINDOW_ACCEPTANCE_HARNESS_SEEDS,
} from "./generate-score-window-acceptance-harness-test-helpers.js";
import { reviewTest } from "./test-profile.js";

reviewTest("score-window acceptance harness seed batch B keeps acceptance inputs observable", () => {
  assertScoreWindowAcceptanceHarnessInputs(SCORE_WINDOW_ACCEPTANCE_HARNESS_SEEDS.slice(4));
});
