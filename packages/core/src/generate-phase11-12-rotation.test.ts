import test from "node:test";
import { assertTexturePhrasePlanningRotationBatch } from "./generate-phase11-12-rotation-test-helpers.js";
import { TEXTURE_PHRASE_PLANNING_ROTATION_SEEDS } from "./generate-quality-review-test-helpers.js";

test("generateScore applies texture and phrase-unit planning across rotation seed batch A", () => {
  assertTexturePhrasePlanningRotationBatch(TEXTURE_PHRASE_PLANNING_ROTATION_SEEDS.slice(0, 2), {
    topEntryPatternFamilyDelta: 4,
    leapRecoveryMissDelta: 21,
    unisonOverlapDelta: 205,
    sharedRhythmOverlapDelta: 195,
  });
});
