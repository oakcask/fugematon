import test from "node:test";
import {
  assertPlannerCompletionCompatibility,
  PLANNER_COMPLETION_COMPATIBILITY_SEEDS,
} from "./generate-phase10-compatibility-test-helpers.js";

test("generateScore preserves phase-10 section-local planner compatibility across representative seeds", () => {
  assertPlannerCompletionCompatibility("section-local-planner", PLANNER_COMPLETION_COMPATIBILITY_SEEDS.slice(0, 2));
});
