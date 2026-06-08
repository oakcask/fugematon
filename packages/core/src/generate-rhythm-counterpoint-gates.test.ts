import assert from "node:assert/strict";
import test from "node:test";
import {
  REPRESENTATIVE_REVIEW_SEEDS,
  REVIEW_LENGTH_TICKS,
  VOICE_INDEPENDENCE_DIAGNOSTICS_PROFILE,
} from "./constants.js";
import { cachedGenerateScore as generateScore } from "./generate-test-helpers.js";
import { evaluateVoiceIndependenceGate } from "./review-gate.js";

test("generateScore exposes rhythm and entry support diagnostics", () => {
  const output = generateScore({ seed: "fugue-smoke", lengthTicks: REVIEW_LENGTH_TICKS, selectionModel: "baseline" });
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

test("generateScore applies rhythm counterpoint gates across review seeds", () => {
  for (const { seed } of REPRESENTATIVE_REVIEW_SEEDS) {
    const output = generateScore({ seed, lengthTicks: REVIEW_LENGTH_TICKS, selectionModel: "baseline" });
    const gate = evaluateVoiceIndependenceGate(seed, output.diagnostics);

    assert.deepEqual(gate.failures, []);
    assert.equal(gate.passed, true);
    assert.ok(
      gate.metrics.rhythmicIndependenceScore >= VOICE_INDEPENDENCE_DIAGNOSTICS_PROFILE.minRhythmicIndependenceScore,
    );
    assert.ok(gate.metrics.unisonOverlapCount <= VOICE_INDEPENDENCE_DIAGNOSTICS_PROFILE.maxUnisonOverlapCount);
    assert.ok(
      gate.metrics.sameDirectionMotionCount <= VOICE_INDEPENDENCE_DIAGNOSTICS_PROFILE.maxSameDirectionMotionCount,
    );
    assert.ok(
      gate.metrics.sharedRhythmOverlapCount <= VOICE_INDEPENDENCE_DIAGNOSTICS_PROFILE.maxSharedRhythmOverlapCount,
    );
    assert.ok(
      gate.metrics.shortStrongBeatEntryNoteCount <=
        VOICE_INDEPENDENCE_DIAGNOSTICS_PROFILE.maxShortStrongBeatEntryNoteCount,
    );
    assert.ok(
      gate.metrics.entrySupportInstabilityCount <=
        VOICE_INDEPENDENCE_DIAGNOSTICS_PROFILE.maxEntrySupportInstabilityCount,
    );
  }
});
