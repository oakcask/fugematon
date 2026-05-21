import test from "node:test";
import { assertPhase13ReviewPreconditions, PHASE_13_FOCUSED_SEEDS } from "./generate-phase-review-test-helpers.js";

test("generateScore keeps phase-13 focused seed batch B2 ready for review-only diagnostics", () => {
  assertPhase13ReviewPreconditions(PHASE_13_FOCUSED_SEEDS.slice(6));
});
