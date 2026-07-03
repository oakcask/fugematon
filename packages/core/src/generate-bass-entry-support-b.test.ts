import { assertBassEntrySupportSeeds } from "./generate-bass-entry-support-test-helpers.js";
import { reviewTest } from "./test-profile.js";

reviewTest("generateScore keeps bass silent until its exposition entry support is earned for boundary seeds", () => {
  assertBassEntrySupportSeeds(["wide-key", "modal-dorian", "angular-answer"]);
});
