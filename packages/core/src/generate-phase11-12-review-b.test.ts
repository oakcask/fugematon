import test from "node:test";
import { PHASE_11_12_REVIEW_BATCH_B } from "./generate-phase-review-test-helpers.js";
import { assertPhase1112ReviewBatch } from "./generate-phase11-12-review-test-helpers.js";

test("generateScore applies phase-11 and phase-12 phrase-unit planning across review seeds batch B1", () => {
  assertPhase1112ReviewBatch(PHASE_11_12_REVIEW_BATCH_B.slice(0, 4), {
    uniqueContinuationPatternRatio: 3.4,
    sectionGrammarRiskRatio: 0.2,
    topEntryPatternFamilyDelta: -4,
    unisonOverlapDelta: 403,
    sharedRhythmOverlapDelta: 245,
    leapRecoveryMissDelta: 60,
    bassRootSupportDelta: -15,
  });
});
