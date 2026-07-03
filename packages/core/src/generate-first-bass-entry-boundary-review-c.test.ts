import {
  assertFirstBassEntryBoundaryContinuityEvidence,
  FIRST_BASS_ENTRY_BOUNDARY_REVIEW_BATCH_C,
} from "./generate-first-bass-entry-boundary-test-helpers.js";
import { reviewTest } from "./test-profile.js";

reviewTest("first bass-entry boundary review batch C repairs initial bass-entry outside-voice continuity", () => {
  assertFirstBassEntryBoundaryContinuityEvidence(FIRST_BASS_ENTRY_BOUNDARY_REVIEW_BATCH_C);
});
