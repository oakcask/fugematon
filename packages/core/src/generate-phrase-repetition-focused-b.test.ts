import test from "node:test";
import {
  assertFocusedPhraseRepetitionAdoption,
  PHRASE_REPETITION_FOCUSED_SEEDS,
} from "./generate-quality-review-test-helpers.js";

test("generateScore completes phrase-repetition adoption across focused seeds, batch B", () => {
  assertFocusedPhraseRepetitionAdoption(PHRASE_REPETITION_FOCUSED_SEEDS.slice(3));
});
