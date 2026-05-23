import assert from "node:assert/strict";
import test from "node:test";
import {
  MELODY_TEXTURE_DIAGNOSTICS_PROFILE,
  REPRESENTATIVE_REVIEW_SEEDS,
  REVIEW_LENGTH_TICKS,
  ROTATION_REVIEW_SEEDS,
} from "./constants.js";
import { generateScore } from "./generate.js";
import { evaluateMelodyTextureGate } from "./review-gate.js";

test("generateScore applies phase-6 observation gate across fixed and rotation seeds", () => {
  const seeds = [...REPRESENTATIVE_REVIEW_SEEDS, ...ROTATION_REVIEW_SEEDS];

  for (const { seed } of seeds) {
    const output = generateScore({ seed, lengthTicks: REVIEW_LENGTH_TICKS, selectionModel: "baseline" });
    const gate = evaluateMelodyTextureGate(seed, output.diagnostics);

    assert.deepEqual(gate.failures, []);
    assert.equal(gate.passed, true);
    assert.ok(gate.metrics.leapRecoveryMisses <= MELODY_TEXTURE_DIAGNOSTICS_PROFILE.maxLeapRecoveryMisses);
    assert.ok(gate.metrics.samePitchOverlapCount <= MELODY_TEXTURE_DIAGNOSTICS_PROFILE.maxSamePitchOverlapCount);
    assert.ok(gate.metrics.severeEntryIntervalCount <= MELODY_TEXTURE_DIAGNOSTICS_PROFILE.maxSevereEntryIntervalCount);
    assert.ok(
      gate.metrics.unresolvedSevereEntryIntervalCount <=
        MELODY_TEXTURE_DIAGNOSTICS_PROFILE.maxUnresolvedSevereEntryIntervalCount,
    );
    assert.ok(gate.metrics.unsupportedSoloRunCount <= MELODY_TEXTURE_DIAGNOSTICS_PROFILE.maxUnsupportedSoloRunCount);
    assert.ok(gate.metrics.abruptTextureDropCount <= MELODY_TEXTURE_DIAGNOSTICS_PROFILE.maxAbruptTextureDropCount);
    assert.ok(gate.metrics.soloVoiceImbalance <= MELODY_TEXTURE_DIAGNOSTICS_PROFILE.maxSoloVoiceImbalance);
    assert.ok(
      gate.metrics.ornamentPlacementReasonCount >= MELODY_TEXTURE_DIAGNOSTICS_PROFILE.minOrnamentPlacementReasonCount,
    );
    assert.ok(gate.metrics.expositionDurationTicks <= MELODY_TEXTURE_DIAGNOSTICS_PROFILE.maxExpositionDurationTicks);
    assert.ok(
      gate.metrics.firstContinuationStartTick <= MELODY_TEXTURE_DIAGNOSTICS_PROFILE.maxFirstContinuationStartTick,
    );
  }
});
