import {
  assertFirstBassEntryBoundaryContinuityEvidence,
  FIRST_BASS_ENTRY_BOUNDARY_REVIEW_BATCH_D,
  FIRST_BASS_ENTRY_BOUNDARY_REVIEW_BATCH_D2,
} from "./generate-first-bass-entry-boundary-test-helpers.js";
import { reviewTest } from "./test-profile.js";

reviewTest("first bass-entry boundary review batch D repairs initial bass-entry outside-voice continuity", () => {
  assertFirstBassEntryBoundaryContinuityEvidence([
    ...FIRST_BASS_ENTRY_BOUNDARY_REVIEW_BATCH_D,
    ...FIRST_BASS_ENTRY_BOUNDARY_REVIEW_BATCH_D2,
  ]);
});
