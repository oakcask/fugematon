import { TEXTURE_PHRASE_PLANNING_REVIEW_BATCH_A } from "./generate-quality-review-test-helpers.js";
import { assertTexturePhrasePlanningReviewBatch } from "./generate-texture-phrase-planning-review-test-helpers.js";
import { reviewTest } from "./test-profile.js";

reviewTest("generateScore applies texture and phrase-unit planning across review seeds batch A1a", () => {
  assertTexturePhrasePlanningReviewBatch(TEXTURE_PHRASE_PLANNING_REVIEW_BATCH_A.slice(0, 2), {
    uniqueContinuationPatternRatio: 2.2,
    sectionGrammarRiskRatio: 0.57,
    topEntryPatternFamilyDelta: -3,
    unisonOverlapDelta: -100,
    sharedRhythmOverlapDelta: -70,
    leapRecoveryMissDelta: 108,
    counterSubjectIdentityRetentionDelta: 0.23,
  });
});
