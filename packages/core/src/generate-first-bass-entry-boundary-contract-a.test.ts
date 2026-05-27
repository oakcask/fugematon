import test from "node:test";
import {
  assertFirstBassEntryBoundaryContract,
  FIRST_BASS_ENTRY_BOUNDARY_REVIEW_BATCH_A,
} from "./generate-first-bass-entry-boundary-test-helpers.js";

test("first bass-entry boundary contract batch A separates first-bass evidence", () => {
  assertFirstBassEntryBoundaryContract(FIRST_BASS_ENTRY_BOUNDARY_REVIEW_BATCH_A.slice(0, 3));
});
