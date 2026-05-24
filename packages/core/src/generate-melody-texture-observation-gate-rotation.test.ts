import test from "node:test";
import { ROTATION_REVIEW_SEEDS } from "./constants.js";
import { assertMelodyTextureObservationGateSeeds } from "./generate-melody-texture-observation-gate-test-helpers.js";

test("generateScore applies melody texture observation gate across rotation seeds", () => {
  assertMelodyTextureObservationGateSeeds(ROTATION_REVIEW_SEEDS);
});
