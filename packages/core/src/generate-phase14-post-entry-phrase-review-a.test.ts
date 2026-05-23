import test from "node:test";
import {
  assertPhase14PostEntryPhrasePressureIsObservable,
  PHASE_14_POST_ENTRY_PHRASE_REVIEW_BATCH_A,
} from "./generate-phase14-post-entry-phrase-review-helpers.js";

test("Phase 14C post-entry and phrase review batch A keeps open pressure observable", () => {
  assertPhase14PostEntryPhrasePressureIsObservable(PHASE_14_POST_ENTRY_PHRASE_REVIEW_BATCH_A, {
    minReviewedPostEntryWindowCount: 4,
    minFourQuarterThinSupportWindowCount: 1,
    minTopPhraseSignatureSeedCount: 2,
  });
});
