import assert from "node:assert/strict";
import test from "node:test";
import {
  PHASE_5_9_DIAGNOSTICS_PROFILE,
  PHASE_5_LENGTH_TICKS,
  PHASE_5_REVIEW_SEEDS,
} from "./constants.js";
import { generateScore } from "./generate.js";
import { evaluatePhase59Diagnostics } from "./review-gate.js";

test("generateScore applies phase-5.9 beauty gates across review seeds", () => {
  for (const { seed } of PHASE_5_REVIEW_SEEDS) {
    const output = generateScore({ seed, lengthTicks: PHASE_5_LENGTH_TICKS });
    const gate = evaluatePhase59Diagnostics(seed, output.diagnostics);

    assert.deepEqual(gate.failures, []);
    assert.equal(gate.passed, true);
    assert.ok(
      gate.metrics.counterSubjectIdentityRetention >= PHASE_5_9_DIAGNOSTICS_PROFILE.minCounterSubjectIdentityRetention,
    );
    assert.ok(gate.metrics.rhythmicIndependenceScore >= PHASE_5_9_DIAGNOSTICS_PROFILE.minRhythmicIndependenceScore);
    assert.ok(gate.metrics.unisonOverlapCount <= PHASE_5_9_DIAGNOSTICS_PROFILE.maxUnisonOverlapCount);
    assert.ok(gate.metrics.sameDirectionMotionCount <= PHASE_5_9_DIAGNOSTICS_PROFILE.maxSameDirectionMotionCount);
    assert.ok(gate.metrics.sharedRhythmOverlapCount <= PHASE_5_9_DIAGNOSTICS_PROFILE.maxSharedRhythmOverlapCount);
    assert.ok(gate.metrics.leapRecoveryMisses <= PHASE_5_9_DIAGNOSTICS_PROFILE.maxLeapRecoveryMisses);
    assert.ok(
      gate.metrics.maxSelectedCandidateTextureCost <= PHASE_5_9_DIAGNOSTICS_PROFILE.maxSelectedCandidateTextureCost,
    );
    assert.ok(
      gate.metrics.averageSelectedCandidateTextureCost <=
        PHASE_5_9_DIAGNOSTICS_PROFILE.maxAverageSelectedCandidateTextureCost,
    );
    assert.ok(
      gate.metrics.maxSelectedCandidateMelodyCost <= PHASE_5_9_DIAGNOSTICS_PROFILE.maxSelectedCandidateMelodyCost,
    );
    assert.ok(
      gate.metrics.averageSelectedCandidateMelodyCost <=
        PHASE_5_9_DIAGNOSTICS_PROFILE.maxAverageSelectedCandidateMelodyCost,
    );
  }
});

test("generateScore applies phase-5.9 boundary seed gates", () => {
  const boundaryProfiles = PHASE_5_9_DIAGNOSTICS_PROFILE.boundarySeeds;

  for (const [seed, profile] of Object.entries(boundaryProfiles)) {
    const output = generateScore({ seed, lengthTicks: PHASE_5_LENGTH_TICKS });
    const textureCosts = output.diagnostics.selectedCandidateEvaluations.map(
      (evaluation) => evaluation.dimensions.texture.cost,
    );

    if ("minCounterSubjectIdentityRetention" in profile) {
      assert.ok(output.diagnostics.counterSubjectIdentityRetention >= profile.minCounterSubjectIdentityRetention);
    }
    if ("maxSharedRhythmOverlapCount" in profile) {
      assert.ok(output.diagnostics.sharedRhythmOverlapCount <= profile.maxSharedRhythmOverlapCount);
    }
    if ("maxLeapRecoveryMisses" in profile) {
      assert.ok(output.diagnostics.leapRecoveryMisses <= profile.maxLeapRecoveryMisses);
    }
    if ("minOrnamentDensity" in profile) {
      assert.ok(output.diagnostics.ornamentDensity >= profile.minOrnamentDensity);
    }
    if ("maxSelectedCandidateTextureCost" in profile) {
      assert.ok(Math.max(...textureCosts) <= profile.maxSelectedCandidateTextureCost);
    }
    if ("minModalContextCount" in profile) {
      assert.ok(output.diagnostics.modalContextCount >= profile.minModalContextCount);
      assert.ok(output.diagnostics.modalCharacteristicToneHits >= profile.minModalCharacteristicToneHits);
      assert.ok(output.diagnostics.modalCadenceHits >= profile.minModalCadenceHits);
    }
  }
});
