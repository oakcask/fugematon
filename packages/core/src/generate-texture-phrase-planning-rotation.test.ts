import { TEXTURE_PHRASE_PLANNING_ROTATION_SEEDS } from "./generate-quality-review-test-helpers.js";
import { assertTexturePhrasePlanningRotationBatch } from "./generate-texture-phrase-planning-rotation-test-helpers.js";
import { reviewTest } from "./test-profile.js";

reviewTest("generateScore applies texture and phrase-unit planning across rotation seed batch A", () => {
  assertTexturePhrasePlanningRotationBatch(TEXTURE_PHRASE_PLANNING_ROTATION_SEEDS.slice(0, 2), {
    uniqueContinuationPatternMultiplier: 2.3,
    sectionGrammarRiskMultiplier: 0.62,
    topEntryPatternFamilyDelta: 4,
    leapRecoveryMissDelta: 72,
    unisonOverlapDelta: 265,
    sharedRhythmOverlapDelta: 300,
    bassRootSupportDelta: -2,
    counterSubjectIdentityRetentionDelta: 0.45,
  });
});
