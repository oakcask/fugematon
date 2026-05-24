import test from "node:test";
import { TEXTURE_PHRASE_PLANNING_ROTATION_SEEDS } from "./generate-quality-review-test-helpers.js";
import { assertTexturePhrasePlanningRotationBatch } from "./generate-texture-phrase-planning-rotation-test-helpers.js";

test("generateScore applies texture and phrase-unit planning across rotation seed batch A2", () => {
  assertTexturePhrasePlanningRotationBatch(TEXTURE_PHRASE_PLANNING_ROTATION_SEEDS.slice(2, 5), {
    topEntryPatternFamilyDelta: 4,
    leapRecoveryMissDelta: 42,
    sectionGrammarRiskMultiplier: 0.47,
  });
});
