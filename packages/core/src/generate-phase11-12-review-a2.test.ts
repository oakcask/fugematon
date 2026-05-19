import test from "node:test";
import { PHASE_11_12_REVIEW_BATCH_A } from "./generate-phase-review-test-helpers.js";
import { assertPhase1112ReviewBatch } from "./generate-phase11-12-review-test-helpers.js";

test("generateScore applies phase-11 and phase-12 phrase-unit planning across review seeds batch A2", () => {
  assertPhase1112ReviewBatch(PHASE_11_12_REVIEW_BATCH_A.slice(4), {
    uniqueContinuationPatternRatio: 3.4,
    sectionGrammarRiskRatio: 0.2,
    topEntryPatternFamilyDelta: -1,
    unisonOverlapDelta: 20,
    sharedRhythmOverlapDelta: 10,
    leapRecoveryMissDelta: 30,
  });
});
