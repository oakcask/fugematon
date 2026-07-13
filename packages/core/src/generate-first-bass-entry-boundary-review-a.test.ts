import {
  assertFirstBassEntryBoundaryContinuityEvidence,
  FIRST_BASS_ENTRY_BOUNDARY_REVIEW_BATCH_A,
} from "./generate-first-bass-entry-boundary-test-helpers.js";
import { reviewTest } from "./test-profile.js";

reviewTest("first bass-entry boundary review batch A repairs initial bass-entry outside-voice continuity", () => {
  assertFirstBassEntryBoundaryContinuityEvidence(FIRST_BASS_ENTRY_BOUNDARY_REVIEW_BATCH_A);
});
