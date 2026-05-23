import assert from "node:assert/strict";
import test from "node:test";
import { PHASE_5_LENGTH_TICKS } from "./constants.js";
import { generateScore } from "./generate.js";

test("Phase 13Z user-reported seed no longer has one dominant late subject-stem family", () => {
  const output = generateScore({ seed: "seed-0zereox-1v729ih", lengthTicks: PHASE_5_LENGTH_TICKS });
  const subjectFamily = output.diagnostics.phase12Review.subjectStemFamilies.find(
    (family) => family.form === "subject",
  );

  assert.ok(subjectFamily !== undefined);
  assert.ok(subjectFamily.share <= 0.42);
  assert.equal(output.diagnostics.phase13ZReview.reviewRequired, false);
  assert.ok(output.diagnostics.phase13ZReview.functionBearingWindowCount > 0);
  assert.ok(
    output.diagnostics.phase13ZReview.functionBearingWindowCount >
      output.diagnostics.phase13ZReview.mechanicalReuseWindowCount,
  );
  assert.ok(
    output.diagnostics.phase13ZReview.windows.some(
      (window) =>
        window.judgement === "function-bearing-recurrence" &&
        (window.changedEntryVoice || window.changedLocalKey || window.changedPhraseFunction),
    ),
  );
});
