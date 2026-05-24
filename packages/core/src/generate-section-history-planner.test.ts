import test from "node:test";
import { assertSectionHistoryPlannerBatch } from "./generate-section-history-planner-test-helpers.js";

test("generateScore applies history-aware section grammar planning to selected output", () => {
  assertSectionHistoryPlannerBatch(["bach-001", "fugue-smoke", "minor-entry"]);
});
