import {
  assertFocusedPhraseRepetitionAdoption,
  PHRASE_REPETITION_FOCUSED_SEEDS,
} from "./generate-quality-review-test-helpers.js";
import { reviewTest } from "./test-profile.js";

reviewTest("generateScore completes phrase-repetition adoption across focused seeds, batch A", () => {
  assertFocusedPhraseRepetitionAdoption(PHRASE_REPETITION_FOCUSED_SEEDS.slice(0, 3));
});
