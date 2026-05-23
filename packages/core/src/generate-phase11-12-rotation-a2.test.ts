import test from "node:test";
import { PHASE_11_12_ROTATION_SEEDS } from "./generate-phase-review-test-helpers.js";
import { assertPhase1112RotationBatch } from "./generate-phase11-12-rotation-test-helpers.js";

test("generateScore applies phase-11 and phase-12 phrase-unit planning across rotation seed batch A2", () => {
  assertPhase1112RotationBatch(PHASE_11_12_ROTATION_SEEDS.slice(2, 5), {
    topEntryPatternFamilyDelta: 4,
    leapRecoveryMissDelta: 42,
  });
});
