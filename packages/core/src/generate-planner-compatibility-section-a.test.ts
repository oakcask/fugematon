import test from "node:test";
import {
  assertPlannerCompletionCompatibility,
  PLANNER_COMPLETION_COMPATIBILITY_SEEDS,
} from "./generate-planner-compatibility-test-helpers.js";

test("generateScore preserves section-local planner compatibility across representative seeds", () => {
  assertPlannerCompletionCompatibility("section-local-planner", PLANNER_COMPLETION_COMPATIBILITY_SEEDS.slice(0, 2));
});
