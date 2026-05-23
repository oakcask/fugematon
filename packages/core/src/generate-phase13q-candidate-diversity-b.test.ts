import test from "node:test";
import { PHASE_13_FOCUSED_SEEDS } from "./generate-phase-review-test-helpers.js";
import { assertPhase13QCandidateDiversitySeedsReady } from "./generate-phase13q-candidate-diversity-test-helpers.js";

test("generateScore keeps phase-13Q focused seed batch B ready for candidate-diversity review", () => {
  assertPhase13QCandidateDiversitySeedsReady(PHASE_13_FOCUSED_SEEDS.slice(4));
});
