import test from "node:test";
import {
  assertPhase13XFirstBassEntryContinuityEvidence,
  PHASE_13X_FIRST_BASS_ENTRY_REVIEW_BATCH_D,
} from "./generate-phase13x-first-bass-entry-review-test-helpers.js";

test("Phase 13X review batch D repairs initial bass-entry outside-voice continuity", () => {
  assertPhase13XFirstBassEntryContinuityEvidence(PHASE_13X_FIRST_BASS_ENTRY_REVIEW_BATCH_D);
});
