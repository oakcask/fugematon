import test from "node:test";
import { TEXTURE_PHRASE_PLANNING_REVIEW_BATCH_A } from "./generate-quality-review-test-helpers.js";
import { assertTexturePhrasePlanningReviewBatch } from "./generate-texture-phrase-planning-review-test-helpers.js";

test("generateScore applies texture and phrase-unit planning across review seeds batch A1a", () => {
  assertTexturePhrasePlanningReviewBatch(TEXTURE_PHRASE_PLANNING_REVIEW_BATCH_A.slice(0, 2), {
    uniqueContinuationPatternRatio: 3.1,
    sectionGrammarRiskRatio: 0.37,
    topEntryPatternFamilyDelta: -3,
    unisonOverlapDelta: -100,
    sharedRhythmOverlapDelta: -100,
    leapRecoveryMissDelta: 104,
    counterSubjectIdentityRetentionDelta: 0.23,
  });
});
