import {
  assertPlannerCompletionCompatibility,
  PLANNER_COMPLETION_COMPATIBILITY_SEEDS,
} from "./generate-planner-compatibility-test-helpers.js";
import { reviewTest } from "./test-profile.js";

reviewTest("generateScore preserves section-local planner compatibility across rotation seeds", () => {
  assertPlannerCompletionCompatibility("section-local-planner", PLANNER_COMPLETION_COMPATIBILITY_SEEDS.slice(2));
});
