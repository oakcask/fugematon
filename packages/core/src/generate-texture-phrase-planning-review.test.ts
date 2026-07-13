import { TEXTURE_PHRASE_PLANNING_REVIEW_BATCH_A } from "./generate-quality-review-test-helpers.js";
import { assertTexturePhrasePlanningReviewBatch } from "./generate-texture-phrase-planning-review-test-helpers.js";
import { reviewTest } from "./test-profile.js";

reviewTest("generateScore applies texture and phrase-unit planning across review seeds batch A", () => {
  const cases = [
    {
      seeds: TEXTURE_PHRASE_PLANNING_REVIEW_BATCH_A.slice(0, 2),
      expectation: {
        uniqueContinuationPatternRatio: 2.2,
        sectionGrammarRiskRatio: 0.74,
        topEntryPatternFamilyDelta: -3,
        unisonOverlapDelta: -100,
        sharedRhythmOverlapDelta: 100,
        leapRecoveryMissDelta: 113,
        counterSubjectIdentityRetentionDelta: 0.23,
      },
    },
    {
      seeds: TEXTURE_PHRASE_PLANNING_REVIEW_BATCH_A.slice(2, 4),
      expectation: {
        uniqueContinuationPatternRatio: 2.33,
        sectionGrammarRiskRatio: 0.54,
        topEntryPatternFamilyDelta: -9,
        unisonOverlapDelta: -50,
        sharedRhythmOverlapDelta: 128,
        leapRecoveryMissDelta: 124,
      },
    },
    {
      seeds: TEXTURE_PHRASE_PLANNING_REVIEW_BATCH_A.slice(4),
      expectation: {
        uniqueContinuationPatternRatio: 2.9,
        sectionGrammarRiskRatio: 0.36,
        topEntryPatternFamilyDelta: -1,
        unisonOverlapDelta: 70,
        sharedRhythmOverlapDelta: 272,
        leapRecoveryMissDelta: 171,
        bassRootSupportDelta: -2,
        counterSubjectIdentityRetentionDelta: 0.76,
      },
    },
  ] as const;

  for (const testCase of cases) {
    assertTexturePhrasePlanningReviewBatch(testCase.seeds, testCase.expectation);
  }
});
