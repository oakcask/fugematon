import test from "node:test";
import { TEXTURE_PHRASE_PLANNING_REVIEW_BATCH_A } from "./generate-quality-review-test-helpers.js";
import { assertTexturePhrasePlanningReviewBatch } from "./generate-texture-phrase-planning-review-test-helpers.js";

test("generateScore applies texture and phrase-unit planning across review seeds batch A1", () => {
  assertTexturePhrasePlanningReviewBatch(TEXTURE_PHRASE_PLANNING_REVIEW_BATCH_A.slice(0, 4), {
    uniqueContinuationPatternRatio: 3,
    sectionGrammarRiskRatio: 0.26,
    topEntryPatternFamilyDelta: -7,
    unisonOverlapDelta: 329,
    sharedRhythmOverlapDelta: 405,
    leapRecoveryMissDelta: 63,
  });
});
