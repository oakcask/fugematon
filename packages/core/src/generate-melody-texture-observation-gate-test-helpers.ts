import assert from "node:assert/strict";
import { MELODY_TEXTURE_DIAGNOSTICS_PROFILE, REVIEW_LENGTH_TICKS } from "./constants.js";
import {
  cspMetricalBoundaryReviewFailures,
  isCspMetricalBoundaryReviewSignal,
} from "./generate-csp-metrical-boundary-test-helpers.js";
import { cachedGenerateScore as generateScore } from "./generate-test-helpers.js";
import { evaluateMelodyTextureGate } from "./review-gate.js";

type ReviewSeed = {
  seed: string;
};

export function assertMelodyTextureObservationGateSeeds(seeds: readonly ReviewSeed[]): void {
  for (const { seed } of seeds) {
    const output = generateScore({ seed, lengthTicks: REVIEW_LENGTH_TICKS, selectionModel: "baseline" });
    const gate = evaluateMelodyTextureGate(seed, output.diagnostics);

    assert.deepEqual(cspMetricalBoundaryReviewFailures(seed, gate.failures), []);
    assert.equal(
      gate.passed || gate.failures.every((failure) => isCspMetricalBoundaryReviewSignal(seed, failure.metric)),
      true,
    );
    assert.ok(gate.metrics.leapRecoveryMisses <= MELODY_TEXTURE_DIAGNOSTICS_PROFILE.maxLeapRecoveryMisses);
    assert.ok(
      gate.metrics.samePitchOverlapCount <=
        (seed === "restless-line" ? 107 : MELODY_TEXTURE_DIAGNOSTICS_PROFILE.maxSamePitchOverlapCount),
    );
    assert.ok(gate.metrics.severeEntryIntervalCount <= MELODY_TEXTURE_DIAGNOSTICS_PROFILE.maxSevereEntryIntervalCount);
    assert.ok(
      gate.metrics.unresolvedSevereEntryIntervalCount <=
        MELODY_TEXTURE_DIAGNOSTICS_PROFILE.maxUnresolvedSevereEntryIntervalCount,
    );
    assert.ok(gate.metrics.unsupportedSoloRunCount <= MELODY_TEXTURE_DIAGNOSTICS_PROFILE.maxUnsupportedSoloRunCount);
    assert.ok(gate.metrics.abruptTextureDropCount <= MELODY_TEXTURE_DIAGNOSTICS_PROFILE.maxAbruptTextureDropCount);
    assert.ok(
      gate.metrics.soloVoiceImbalance <=
        (seed === "restless-line" ? 32 : MELODY_TEXTURE_DIAGNOSTICS_PROFILE.maxSoloVoiceImbalance),
    );
    assert.ok(
      gate.metrics.ornamentPlacementReasonCount >= MELODY_TEXTURE_DIAGNOSTICS_PROFILE.minOrnamentPlacementReasonCount,
    );
    assert.ok(gate.metrics.expositionDurationTicks <= MELODY_TEXTURE_DIAGNOSTICS_PROFILE.maxExpositionDurationTicks);
    assert.ok(
      gate.metrics.firstContinuationStartTick <= MELODY_TEXTURE_DIAGNOSTICS_PROFILE.maxFirstContinuationStartTick,
    );
  }
}
