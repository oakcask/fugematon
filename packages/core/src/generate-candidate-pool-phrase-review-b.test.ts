import {
  assertPhraseRepetitionFamilyDiagnostics,
  PHRASE_REPETITION_REVIEW_SEEDS,
} from "./generate-candidate-pool-phrase-review-test-helpers.js";
import { reviewTest } from "./test-profile.js";

reviewTest("generateScore exposes phrase-repetition family diagnostics for seed batch B", () => {
  assertPhraseRepetitionFamilyDiagnostics(PHRASE_REPETITION_REVIEW_SEEDS.slice(3));
});
