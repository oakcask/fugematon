import test from "node:test";
import {
  assertFirstBassEntryBoundaryContinuityEvidence,
  FIRST_BASS_ENTRY_BOUNDARY_REVIEW_BATCH_A,
} from "./generate-first-bass-entry-boundary-test-helpers.js";

test("first bass-entry boundary review batch A1 repairs initial bass-entry outside-voice continuity", () => {
  assertFirstBassEntryBoundaryContinuityEvidence(FIRST_BASS_ENTRY_BOUNDARY_REVIEW_BATCH_A.slice(0, 3));
});
