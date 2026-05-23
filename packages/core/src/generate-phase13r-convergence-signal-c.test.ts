import assert from "node:assert/strict";
import test from "node:test";
import { PHASE_5_LENGTH_TICKS } from "./constants.js";
import { generateScore } from "./generate.js";

const PHASE_13R_FOCUSED_SEEDS = ["minor-entry", "sparse-cadence", "random-listen-check"] as const;

test("phase-13R boundary seeds keep default planner convergence comparable in CI", () => {
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
