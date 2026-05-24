import test from "node:test";
import { assertPlannerCompletionCompatibility } from "./generate-planner-compatibility-test-helpers.js";

test("generateScore preserves candidate-oracle selection compatibility across the readiness subset", () => {
  assertPlannerCompletionCompatibility("candidate-oracle-selection");
});
