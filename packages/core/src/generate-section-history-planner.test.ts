import { assertSectionHistoryPlannerBatch } from "./generate-section-history-planner-test-helpers.js";
import { reviewTest } from "./test-profile.js";

reviewTest("generateScore applies history-aware section grammar planning to selected output", () => {
  assertSectionHistoryPlannerBatch(["bach-001", "fugue-smoke", "minor-entry"]);
});
