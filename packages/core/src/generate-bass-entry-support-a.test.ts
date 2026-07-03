import { assertBassEntrySupportSeeds } from "./generate-bass-entry-support-test-helpers.js";
import { reviewTest } from "./test-profile.js";

reviewTest("generateScore keeps bass silent until its exposition entry support is earned for fixed seeds", () => {
  assertBassEntrySupportSeeds(["bach-001", "fugue-smoke", "minor-entry"]);
});
