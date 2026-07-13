import { TEXTURE_PHRASE_PLANNING_ROTATION_SEEDS } from "./generate-quality-review-test-helpers.js";
import { assertTexturePhrasePlanningRotationBatch } from "./generate-texture-phrase-planning-rotation-test-helpers.js";
import { reviewTest } from "./test-profile.js";

reviewTest("generateScore applies texture and phrase-unit planning across rotation seed batch A2", () => {
  assertTexturePhrasePlanningRotationBatch(TEXTURE_PHRASE_PLANNING_ROTATION_SEEDS.slice(2, 5), {
    topEntryPatternFamilyDelta: 4,
    leapRecoveryMissDelta: 80,
    uniqueContinuationPatternMultiplier: 1.9,
    sectionGrammarRiskMultiplier: 0.69,
    unisonOverlapDelta: 215,
    sharedRhythmOverlapDelta: 465,
    counterSubjectIdentityRetentionDelta: 0.72,
  });
});
