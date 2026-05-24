import test from "node:test";
import { assertTexturePhrasePlanningReviewBatch } from "./generate-phase11-12-review-test-helpers.js";
import { TEXTURE_PHRASE_PLANNING_REVIEW_BATCH_B } from "./generate-quality-review-test-helpers.js";

test("generateScore applies texture and phrase-unit planning across review seeds batch B2", () => {
  assertTexturePhrasePlanningReviewBatch(TEXTURE_PHRASE_PLANNING_REVIEW_BATCH_B.slice(4), {
    uniqueContinuationPatternRatio: 3.4,
    sectionGrammarRiskRatio: 0.2,
    topEntryPatternFamilyDelta: -3,
    unisonOverlapDelta: 150,
    sharedRhythmOverlapDelta: 153,
    leapRecoveryMissDelta: 48,
  });
});
