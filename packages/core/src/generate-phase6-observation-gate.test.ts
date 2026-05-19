import assert from "node:assert/strict";
import test from "node:test";
import {
  PHASE_5_11_ROTATION_SEEDS,
  PHASE_5_LENGTH_TICKS,
  PHASE_5_REVIEW_SEEDS,
  PHASE_6_DIAGNOSTICS_PROFILE,
} from "./constants.js";
import { generateScore } from "./generate.js";
import { evaluatePhase6Diagnostics } from "./review-gate.js";

test("generateScore applies phase-6 observation gate across fixed and rotation seeds", () => {
  const seeds = [...PHASE_5_REVIEW_SEEDS, ...PHASE_5_11_ROTATION_SEEDS];

  for (const { seed } of seeds) {
    const output = generateScore({ seed, lengthTicks: PHASE_5_LENGTH_TICKS });
    const gate = evaluatePhase6Diagnostics(seed, output.diagnostics);

    assert.deepEqual(gate.failures, []);
    assert.equal(gate.passed, true);
    assert.ok(gate.metrics.leapRecoveryMisses <= PHASE_6_DIAGNOSTICS_PROFILE.maxLeapRecoveryMisses);
    assert.ok(gate.metrics.samePitchOverlapCount <= PHASE_6_DIAGNOSTICS_PROFILE.maxSamePitchOverlapCount);
    assert.ok(gate.metrics.severeEntryIntervalCount <= PHASE_6_DIAGNOSTICS_PROFILE.maxSevereEntryIntervalCount);
    assert.ok(
      gate.metrics.unresolvedSevereEntryIntervalCount <=
        PHASE_6_DIAGNOSTICS_PROFILE.maxUnresolvedSevereEntryIntervalCount,
    );
    assert.ok(gate.metrics.unsupportedSoloRunCount <= PHASE_6_DIAGNOSTICS_PROFILE.maxUnsupportedSoloRunCount);
    assert.ok(gate.metrics.abruptTextureDropCount <= PHASE_6_DIAGNOSTICS_PROFILE.maxAbruptTextureDropCount);
    assert.ok(gate.metrics.soloVoiceImbalance <= PHASE_6_DIAGNOSTICS_PROFILE.maxSoloVoiceImbalance);
    assert.ok(gate.metrics.ornamentPlacementReasonCount >= PHASE_6_DIAGNOSTICS_PROFILE.minOrnamentPlacementReasonCount);
    assert.ok(gate.metrics.expositionDurationTicks <= PHASE_6_DIAGNOSTICS_PROFILE.maxExpositionDurationTicks);
    assert.ok(gate.metrics.firstContinuationStartTick <= PHASE_6_DIAGNOSTICS_PROFILE.maxFirstContinuationStartTick);
  }
});
