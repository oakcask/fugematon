import assert from "node:assert/strict";
import test from "node:test";
import { REVIEW_LENGTH_TICKS } from "./constants.js";
import { generateScore } from "./generate.js";

test("generateScore exposes phrase convergence review signals for the explicit legacy baseline path", () => {
  const output = generateScore({ seed: "fugue-smoke", lengthTicks: REVIEW_LENGTH_TICKS, selectionModel: "baseline" });
  const review = output.diagnostics.phraseConvergenceReview;

  assert.equal(output.diagnostics.selectionModel, "baseline");
  assert.equal(review.schemaVersion, 1);
  assert.equal(review.selectionModel, "baseline");
  assert.equal(review.reviewRequired, true);
  assert.ok(review.metrics.mostRepeatedFourSectionPatternCount >= 0);
  assert.ok(review.metrics.uniqueFourSectionPatternCount >= 0);
  assert.ok(review.metrics.topEntryPatternFamilyShare > 0);
  assert.ok(review.metrics.topSubjectStemFamilyShare > 0);
  assert.ok(review.metrics.topSubjectFragmentFamilyShare > 0);
  assert.ok(review.findings.some((finding) => finding.code === "legacy-default-selection-model"));
  assert.ok(
    review.findings.some(
      (finding) =>
        finding.code === "mechanical-section-pattern-repetition" || finding.code === "low-section-pattern-diversity",
    ),
  );
  assert.ok(review.findings.every((finding) => finding.severity === "review-required"));
});

test("generateScore uses the adopted planner as the normal phrase convergence default path", () => {
  const output = generateScore({ seed: "bach-001", lengthTicks: REVIEW_LENGTH_TICKS });

  assert.equal(output.diagnostics.selectionModel, "section-local-planner");
  assert.equal(output.diagnostics.phraseConvergenceReview.selectionModel, "section-local-planner");
  assert.ok(
    !output.diagnostics.phraseConvergenceReview.findings.some(
      (finding) => finding.code === "legacy-default-selection-model",
    ),
  );
});
