import test from "node:test";
import { TEXTURE_PHRASE_PLANNING_REVIEW_BATCH_A } from "./generate-quality-review-test-helpers.js";
import { assertTexturePhrasePlanningReviewBatch } from "./generate-texture-phrase-planning-review-test-helpers.js";

test("generateScore applies texture and phrase-unit planning across review seeds batch A2", () => {
  assertTexturePhrasePlanningReviewBatch(TEXTURE_PHRASE_PLANNING_REVIEW_BATCH_A.slice(4), {
    uniqueContinuationPatternRatio: 2.9,
    sectionGrammarRiskRatio: 0.36,
    topEntryPatternFamilyDelta: -1,
    unisonOverlapDelta: 70,
    sharedRhythmOverlapDelta: 272,
    leapRecoveryMissDelta: 171,
    bassRootSupportDelta: -2,
    counterSubjectIdentityRetentionDelta: 0.76,
  });
});
