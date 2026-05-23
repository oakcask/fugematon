import test from "node:test";
import {
  assertPhase14PostEntryPhrasePressureIsObservable,
  PHASE_14_POST_ENTRY_PHRASE_REVIEW_BATCH_B,
} from "./generate-phase14-post-entry-phrase-review-helpers.js";

test("Phase 14C post-entry and phrase review batch B keeps open pressure observable", () => {
  assertPhase14PostEntryPhrasePressureIsObservable(PHASE_14_POST_ENTRY_PHRASE_REVIEW_BATCH_B, {
    minReviewedPostEntryWindowCount: 4,
    minFourQuarterThinSupportWindowCount: 1,
    minTopPhraseSignatureSeedCount: 2,
  });
});
