import test from "node:test";
import {
  assertPhase13XFirstBassEntryResetEvidence,
  PHASE_13X_FIRST_BASS_ENTRY_REVIEW_BATCH_C,
} from "./generate-phase13x-first-bass-entry-review-test-helpers.js";

test("Phase 13X review batch C exposes initial bass-entry outside-voice reset", () => {
  assertPhase13XFirstBassEntryResetEvidence(PHASE_13X_FIRST_BASS_ENTRY_REVIEW_BATCH_C);
});
