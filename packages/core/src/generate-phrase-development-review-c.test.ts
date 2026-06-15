import assert from "node:assert/strict";
import test from "node:test";
import { REVIEW_LENGTH_TICKS } from "./constants.js";
import { cachedGenerateScore as generateScore } from "./generate-test-helpers.js";

test("user-reported phrase-development seed no longer has one dominant late subject-stem family", () => {
  const output = generateScore({ seed: "seed-0zereox-1v729ih", lengthTicks: REVIEW_LENGTH_TICKS });
  const subjectFamily = output.diagnostics.phraseRepetitionReview.subjectStemFamilies.find(
    (family) => family.form === "subject",
  );

  assert.ok(subjectFamily !== undefined);
  assert.ok(subjectFamily.share <= 0.45);
  assert.equal(output.diagnostics.phraseDevelopmentReview.reviewRequired, false);
  assert.ok(output.diagnostics.phraseDevelopmentReview.functionBearingWindowCount > 0);
  assert.ok(output.diagnostics.phraseDevelopmentReview.mechanicalReuseWindowCount <= 11);
  assert.ok(
    output.diagnostics.phraseDevelopmentReview.windows.some(
      (window) =>
        window.judgement === "function-bearing-recurrence" &&
        (window.changedEntryVoice || window.changedLocalKey || window.changedPhraseFunction),
    ),
  );
});
