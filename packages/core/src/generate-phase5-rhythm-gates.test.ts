import assert from "node:assert/strict";
import test from "node:test";
import { PHASE_5_10_DIAGNOSTICS_PROFILE, PHASE_5_LENGTH_TICKS, PHASE_5_REVIEW_SEEDS } from "./constants.js";
import { generateScore } from "./generate.js";
import { evaluatePhase510Diagnostics } from "./review-gate.js";

test("generateScore exposes phase-5.10 rhythm and entry support diagnostics", () => {
  const output = generateScore({ seed: "fugue-smoke", lengthTicks: PHASE_5_LENGTH_TICKS, selectionModel: "baseline" });
  const selectedEvaluation = output.diagnostics.selectedCandidateEvaluations[0];

  assert.ok(output.diagnostics.shortStrongBeatEntryNoteCount > 0);
  assert.ok(output.diagnostics.entrySupportInstabilityCount > 0);
  assert.ok(selectedEvaluation !== undefined);
  assert.ok("unisonOverlapCount" in selectedEvaluation.dimensions.texture.features);
  assert.ok("sameDirectionMotionCount" in selectedEvaluation.dimensions.texture.features);
  assert.ok("shortStrongBeatEntryNoteCount" in selectedEvaluation.dimensions.texture.features);
  assert.ok("entrySupportInstabilityCount" in selectedEvaluation.dimensions.harmony.features);
  assert.ok("harmonicFunctionMismatches" in selectedEvaluation.dimensions.harmony.features);
});

test("generateScore applies phase-5.10 rhythm counterpoint gates across review seeds", () => {
  for (const { seed } of PHASE_5_REVIEW_SEEDS) {
    const output = generateScore({ seed, lengthTicks: PHASE_5_LENGTH_TICKS, selectionModel: "baseline" });
    const gate = evaluatePhase510Diagnostics(seed, output.diagnostics);

    assert.deepEqual(gate.failures, []);
    assert.equal(gate.passed, true);
    assert.ok(gate.metrics.rhythmicIndependenceScore >= PHASE_5_10_DIAGNOSTICS_PROFILE.minRhythmicIndependenceScore);
    assert.ok(gate.metrics.unisonOverlapCount <= PHASE_5_10_DIAGNOSTICS_PROFILE.maxUnisonOverlapCount);
    assert.ok(gate.metrics.sameDirectionMotionCount <= PHASE_5_10_DIAGNOSTICS_PROFILE.maxSameDirectionMotionCount);
    assert.ok(gate.metrics.sharedRhythmOverlapCount <= PHASE_5_10_DIAGNOSTICS_PROFILE.maxSharedRhythmOverlapCount);
    assert.ok(
      gate.metrics.shortStrongBeatEntryNoteCount <= PHASE_5_10_DIAGNOSTICS_PROFILE.maxShortStrongBeatEntryNoteCount,
    );
    assert.ok(
      gate.metrics.entrySupportInstabilityCount <= PHASE_5_10_DIAGNOSTICS_PROFILE.maxEntrySupportInstabilityCount,
    );
  }
});
