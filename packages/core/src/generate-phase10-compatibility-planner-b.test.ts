import test from "node:test";
import {
  assertPhase10CompletionCompatibility,
  PHASE10_COMPLETION_COMPATIBILITY_SEEDS,
} from "./generate-phase10-compatibility-test-helpers.js";

test("generateScore preserves phase-10 section-local planner compatibility across rotation seeds", () => {
  assertPhase10CompletionCompatibility("section-local-planner", PHASE10_COMPLETION_COMPATIBILITY_SEEDS.slice(2));
});
