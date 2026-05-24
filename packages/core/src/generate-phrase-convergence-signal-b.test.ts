import assert from "node:assert/strict";
import test from "node:test";
import { REVIEW_LENGTH_TICKS } from "./constants.js";
import { generateScore } from "./generate.js";

const PHRASE_CONVERGENCE_FOCUSED_SEEDS = ["dense-modal", "angular-answer", "modal-answer"] as const;

test("phrase convergence rotation seeds keep default planner convergence comparable in CI", () => {
  for (const seed of PHRASE_CONVERGENCE_FOCUSED_SEEDS) {
    const legacy = generateScore({ seed, lengthTicks: REVIEW_LENGTH_TICKS, selectionModel: "baseline" });
    const current = generateScore({ seed, lengthTicks: REVIEW_LENGTH_TICKS });

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
