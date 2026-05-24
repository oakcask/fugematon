import test from "node:test";
import {
  assertPlannerCompletionCompatibility,
  PLANNER_COMPLETION_COMPATIBILITY_SEEDS,
} from "./generate-planner-compatibility-test-helpers.js";

test("generateScore preserves section-local planner compatibility across rotation seeds", () => {
  assertPlannerCompletionCompatibility("section-local-planner", PLANNER_COMPLETION_COMPATIBILITY_SEEDS.slice(2));
});
