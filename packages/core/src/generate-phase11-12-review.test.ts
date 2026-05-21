import test from "node:test";
import { PHASE_11_12_REVIEW_BATCH_A } from "./generate-phase-review-test-helpers.js";
import { assertPhase1112ReviewBatch } from "./generate-phase11-12-review-test-helpers.js";

test("generateScore applies phase-11 and phase-12 phrase-unit planning across review seeds batch A1", () => {
  assertPhase1112ReviewBatch(PHASE_11_12_REVIEW_BATCH_A.slice(0, 4), {
    uniqueContinuationPatternRatio: 3,
    sectionGrammarRiskRatio: 0.26,
    topEntryPatternFamilyDelta: -7,
    unisonOverlapDelta: 300,
    sharedRhythmOverlapDelta: 190,
    leapRecoveryMissDelta: 55,
  });
});
