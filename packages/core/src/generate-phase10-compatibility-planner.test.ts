import test from "node:test";
import { assertPhase10CompletionCompatibility } from "./generate-phase10-compatibility-test-helpers.js";

test("generateScore preserves phase-10 section-local planner compatibility across the readiness subset", () => {
  assertPhase10CompletionCompatibility("phase10-section-local-planner");
});
