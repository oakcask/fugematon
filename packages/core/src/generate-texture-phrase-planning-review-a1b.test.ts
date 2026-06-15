import test from "node:test";
import { TEXTURE_PHRASE_PLANNING_REVIEW_BATCH_A } from "./generate-quality-review-test-helpers.js";
import { assertTexturePhrasePlanningReviewBatch } from "./generate-texture-phrase-planning-review-test-helpers.js";

test("generateScore applies texture and phrase-unit planning across review seeds batch A1b", () => {
  assertTexturePhrasePlanningReviewBatch(TEXTURE_PHRASE_PLANNING_REVIEW_BATCH_A.slice(2, 4), {
    uniqueContinuationPatternRatio: 2.6,
    sectionGrammarRiskRatio: 0.405,
    topEntryPatternFamilyDelta: -12,
    unisonOverlapDelta: -50,
    sharedRhythmOverlapDelta: 128,
    leapRecoveryMissDelta: 70,
  });
});
