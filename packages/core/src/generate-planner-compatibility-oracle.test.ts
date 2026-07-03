import { assertPlannerCompletionCompatibility } from "./generate-planner-compatibility-test-helpers.js";
import { reviewTest } from "./test-profile.js";

reviewTest("generateScore preserves candidate-oracle selection compatibility across the readiness subset", () => {
  assertPlannerCompletionCompatibility("candidate-oracle-selection");
});
