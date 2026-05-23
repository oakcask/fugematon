import assert from "node:assert/strict";
import test from "node:test";
import { PHASE_5_LENGTH_TICKS } from "./constants.js";
import { generateScore } from "./generate.js";

const PHASE_13R_FOCUSED_SEEDS = ["bach-001", "fugue-smoke", "modal-cadence"] as const;

test("generateScore exposes phase-13R review signals for the explicit legacy baseline path", () => {
  const output = generateScore({ seed: "fugue-smoke", lengthTicks: PHASE_5_LENGTH_TICKS, selectionModel: "baseline" });
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

test("generateScore uses the adopted planner as the normal phase-13R default path", () => {
  const output = generateScore({ seed: "bach-001", lengthTicks: PHASE_5_LENGTH_TICKS });

  assert.equal(output.diagnostics.selectionModel, "section-local-planner");
  assert.equal(output.diagnostics.phraseConvergenceReview.selectionModel, "section-local-planner");
  assert.ok(
    !output.diagnostics.phraseConvergenceReview.findings.some(
      (finding) => finding.code === "legacy-default-selection-model",
    ),
  );
});

test("generateScore normalizes legacy planner selection model names", () => {
  const output = generateScore({
    seed: "bach-001",
    lengthTicks: PHASE_5_LENGTH_TICKS,
    selectionModel: "phase10-section-local-planner",
  });

  assert.equal(output.diagnostics.selectionModel, "section-local-planner");
  assert.equal(output.diagnostics.phraseConvergenceReview.selectionModel, "section-local-planner");
});

test("phase-13R focused seeds keep default planner convergence comparable in CI", () => {
  for (const seed of PHASE_13R_FOCUSED_SEEDS) {
    const legacy = generateScore({ seed, lengthTicks: PHASE_5_LENGTH_TICKS, selectionModel: "baseline" });
    const current = generateScore({ seed, lengthTicks: PHASE_5_LENGTH_TICKS });

    assert.equal(legacy.diagnostics.phraseConvergenceReview.selectionModel, "baseline");
    assert.equal(current.diagnostics.phraseConvergenceReview.selectionModel, "section-local-planner");
    assert.ok(
      legacy.diagnostics.phraseConvergenceReview.findings.some(
        (finding) => finding.code === "legacy-default-selection-model",
      ),
    );
    assert.ok(
      !current.diagnostics.phraseConvergenceReview.findings.some(
        (finding) => finding.code === "legacy-default-selection-model",
      ),
    );
    assert.ok(
      current.diagnostics.phraseConvergenceReview.metrics.mostRepeatedFourSectionPatternCount <=
        legacy.diagnostics.phraseConvergenceReview.metrics.mostRepeatedFourSectionPatternCount,
    );
    assert.ok(
      current.diagnostics.phraseConvergenceReview.metrics.uniqueFourSectionPatternCount >=
        legacy.diagnostics.phraseConvergenceReview.metrics.uniqueFourSectionPatternCount,
    );
    assert.ok(current.diagnostics.phraseConvergenceReview.metrics.topSubjectStemFamilyShare > 0);
    assert.ok(current.diagnostics.phraseConvergenceReview.metrics.topSubjectFragmentFamilyShare > 0);
  }
});
