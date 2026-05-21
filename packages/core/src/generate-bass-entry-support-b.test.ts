import test from "node:test";
import { assertBassEntrySupportSeeds } from "./generate-bass-entry-support-test-helpers.js";

test("generateScore keeps bass silent until its exposition entry support is earned for boundary seeds", () => {
  assertBassEntrySupportSeeds(["wide-key", "modal-dorian", "angular-answer"]);
});
