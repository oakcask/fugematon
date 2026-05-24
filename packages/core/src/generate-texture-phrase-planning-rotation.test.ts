import test from "node:test";
import { TEXTURE_PHRASE_PLANNING_ROTATION_SEEDS } from "./generate-quality-review-test-helpers.js";
import { assertTexturePhrasePlanningRotationBatch } from "./generate-texture-phrase-planning-rotation-test-helpers.js";

test("generateScore applies texture and phrase-unit planning across rotation seed batch A", () => {
  assertTexturePhrasePlanningRotationBatch(TEXTURE_PHRASE_PLANNING_ROTATION_SEEDS.slice(0, 2), {
    topEntryPatternFamilyDelta: 4,
    leapRecoveryMissDelta: 28,
    unisonOverlapDelta: 252,
    sharedRhythmOverlapDelta: 255,
  });
});
