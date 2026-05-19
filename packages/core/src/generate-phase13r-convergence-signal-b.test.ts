import assert from "node:assert/strict";
import test from "node:test";
import { PHASE_5_LENGTH_TICKS } from "./constants.js";
import { generateScore } from "./generate.js";

const PHASE_13R_FOCUSED_SEEDS = ["dense-modal", "angular-answer", "modal-answer"] as const;

test("phase-13R rotation seeds keep legacy-default and current-planner convergence comparable in CI", () => {
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
      !current.diagnostics.phase13RReview.findings.some((finding) => finding.code === "legacy-default-selection-model"),
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
