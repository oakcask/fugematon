import test from "node:test";
import {
  assertFirstBassEntryBoundaryContinuityEvidence,
  FIRST_BASS_ENTRY_BOUNDARY_REVIEW_BATCH_D2,
} from "./generate-first-bass-entry-boundary-test-helpers.js";

test("first bass-entry boundary review batch D2 repairs initial bass-entry outside-voice continuity", () => {
  assertFirstBassEntryBoundaryContinuityEvidence(FIRST_BASS_ENTRY_BOUNDARY_REVIEW_BATCH_D2);
});
