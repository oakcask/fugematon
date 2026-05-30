import test from "node:test";
import {
  assertPhraseRepetitionFamilyDiagnostics,
  PHRASE_REPETITION_REVIEW_SEEDS,
} from "./generate-candidate-pool-phrase-review-test-helpers.js";

test("generateScore exposes phrase-repetition family diagnostics for seed batch B", () => {
  assertPhraseRepetitionFamilyDiagnostics(PHRASE_REPETITION_REVIEW_SEEDS.slice(3));
});
