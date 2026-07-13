import { TEXTURE_PHRASE_PLANNING_REVIEW_BATCH_B } from "./generate-quality-review-test-helpers.js";
import { assertTexturePhrasePlanningReviewBatch } from "./generate-texture-phrase-planning-review-test-helpers.js";
import { reviewTest } from "./test-profile.js";

reviewTest("generateScore applies texture and phrase-unit planning across review seeds batch B", () => {
  const cases = [
    {
      seeds: TEXTURE_PHRASE_PLANNING_REVIEW_BATCH_B.slice(0, 4),
      expectation: {
        uniqueContinuationPatternRatio: 3.1,
        sectionGrammarRiskRatio: 0.37,
        topEntryPatternFamilyDelta: -4,
        unisonOverlapDelta: 403,
        sharedRhythmOverlapDelta: 365,
        leapRecoveryMissDelta: 220,
        bassRootSupportDelta: -19,
        counterSubjectIdentityRetentionDelta: 1.08,
      },
    },
    {
      seeds: TEXTURE_PHRASE_PLANNING_REVIEW_BATCH_B.slice(4),
      expectation: {
        uniqueContinuationPatternRatio: 2.5,
        sectionGrammarRiskRatio: 0.47,
        topEntryPatternFamilyDelta: -3,
        unisonOverlapDelta: 150,
        sharedRhythmOverlapDelta: 318,
        leapRecoveryMissDelta: 166,
        bassRootSupportDelta: 0,
        counterSubjectIdentityRetentionDelta: 0.82,
      },
    },
  ] as const;

  for (const testCase of cases) {
    assertTexturePhrasePlanningReviewBatch(testCase.seeds, testCase.expectation);
  }
});
