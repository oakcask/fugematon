import test from "node:test";
import { assertPlannerCompletionCompatibility } from "./generate-phase10-compatibility-test-helpers.js";

test("generateScore preserves phase-10 oracle-selection compatibility across the readiness subset", () => {
  assertPlannerCompletionCompatibility("candidate-oracle-selection");
});
