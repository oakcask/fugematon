import test from "node:test";
import { assertTexturePhrasePlanningReviewBatch } from "./generate-phase11-12-review-test-helpers.js";
import { TEXTURE_PHRASE_PLANNING_REVIEW_BATCH_A } from "./generate-quality-review-test-helpers.js";

test("generateScore applies texture and phrase-unit planning across review seeds batch A2", () => {
  assertTexturePhrasePlanningReviewBatch(TEXTURE_PHRASE_PLANNING_REVIEW_BATCH_A.slice(4), {
    uniqueContinuationPatternRatio: 3.4,
    sectionGrammarRiskRatio: 0.2,
    topEntryPatternFamilyDelta: -1,
    unisonOverlapDelta: 70,
    sharedRhythmOverlapDelta: 36,
    leapRecoveryMissDelta: 32,
  });
});
