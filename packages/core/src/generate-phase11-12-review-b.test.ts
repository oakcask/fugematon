import test from "node:test";
import { assertTexturePhrasePlanningReviewBatch } from "./generate-phase11-12-review-test-helpers.js";
import { TEXTURE_PHRASE_PLANNING_REVIEW_BATCH_B } from "./generate-quality-review-test-helpers.js";

test("generateScore applies texture and phrase-unit planning across review seeds batch B1", () => {
  assertTexturePhrasePlanningReviewBatch(TEXTURE_PHRASE_PLANNING_REVIEW_BATCH_B.slice(0, 4), {
    uniqueContinuationPatternRatio: 3.4,
    sectionGrammarRiskRatio: 0.2,
    topEntryPatternFamilyDelta: -4,
    unisonOverlapDelta: 403,
    sharedRhythmOverlapDelta: 245,
    leapRecoveryMissDelta: 60,
    bassRootSupportDelta: -15,
  });
});
