import assert from "node:assert/strict";
import test from "node:test";
import { PHASE_5_LENGTH_TICKS } from "./constants.js";
import { generateScore } from "./generate.js";

const PHASE_13R_FOCUSED_SEEDS = [
  "bach-001",
  "fugue-smoke",
  "modal-cadence",
  "dense-modal",
  "angular-answer",
  "modal-answer",
  "minor-entry",
  "sparse-cadence",
  "random-listen-check",
] as const;

test("generateScore exposes phase-13R review signals for the implicit legacy default path", () => {
  const output = generateScore({ seed: "fugue-smoke", lengthTicks: PHASE_5_LENGTH_TICKS });
  const review = output.diagnostics.phase13RReview;

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
        finding.code === "mechanical-section-pattern-repetition" ||
        finding.code === "low-section-pattern-diversity",
    ),
  );
  assert.ok(review.findings.every((finding) => finding.severity === "review-required"));
});

test("phase-13R focused seeds make legacy-default and current-planner convergence comparable in CI", () => {
  for (const seed of PHASE_13R_FOCUSED_SEEDS) {
    const legacy = generateScore({ seed, lengthTicks: PHASE_5_LENGTH_TICKS });
    const current = generateScore({
      seed,
      lengthTicks: PHASE_5_LENGTH_TICKS,
      selectionModel: "phase10-section-local-planner",
    });

    assert.equal(legacy.diagnostics.phase13RReview.selectionModel, "baseline");
    assert.equal(current.diagnostics.phase13RReview.selectionModel, "phase10-section-local-planner");
    assert.ok(
      legacy.diagnostics.phase13RReview.findings.some((finding) => finding.code === "legacy-default-selection-model"),
    );
    assert.ok(
      !current.diagnostics.phase13RReview.findings.some(
        (finding) => finding.code === "legacy-default-selection-model",
      ),
    );
    assert.ok(
      current.diagnostics.phase13RReview.metrics.mostRepeatedFourSectionPatternCount <=
        legacy.diagnostics.phase13RReview.metrics.mostRepeatedFourSectionPatternCount,
    );
    assert.ok(
      current.diagnostics.phase13RReview.metrics.uniqueFourSectionPatternCount >=
        legacy.diagnostics.phase13RReview.metrics.uniqueFourSectionPatternCount,
    );
    assert.ok(current.diagnostics.phase13RReview.metrics.topSubjectStemFamilyShare > 0);
    assert.ok(current.diagnostics.phase13RReview.metrics.topSubjectFragmentFamilyShare > 0);
  }
});
