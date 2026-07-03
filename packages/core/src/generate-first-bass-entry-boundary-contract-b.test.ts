import {
  assertFirstBassEntryBoundaryContract,
  FIRST_BASS_ENTRY_BOUNDARY_REVIEW_BATCH_A,
} from "./generate-first-bass-entry-boundary-test-helpers.js";
import { reviewTest } from "./test-profile.js";

reviewTest("first bass-entry boundary contract batch B separates first-bass evidence", () => {
  assertFirstBassEntryBoundaryContract(FIRST_BASS_ENTRY_BOUNDARY_REVIEW_BATCH_A.slice(3));
});
