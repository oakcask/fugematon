import assert from "node:assert/strict";
import test from "node:test";
import { BASELINE_BEAUTY_DIAGNOSTICS_PROFILE, REPRESENTATIVE_REVIEW_SEEDS, REVIEW_LENGTH_TICKS } from "./constants.js";
import { generateScore } from "./generate.js";
import { evaluateBaselineBeautyGate } from "./review-gate.js";

test("generateScore applies baseline beauty gates across review seeds", () => {
  for (const { seed } of REPRESENTATIVE_REVIEW_SEEDS) {
    const output = generateScore({ seed, lengthTicks: REVIEW_LENGTH_TICKS, selectionModel: "baseline" });
    const gate = evaluateBaselineBeautyGate(seed, output.diagnostics);

    assert.deepEqual(gate.failures, []);
    assert.equal(gate.passed, true);
    assert.ok(
      gate.metrics.counterSubjectIdentityRetention >=
        BASELINE_BEAUTY_DIAGNOSTICS_PROFILE.minCounterSubjectIdentityRetention,
    );
    assert.ok(
      gate.metrics.rhythmicIndependenceScore >= BASELINE_BEAUTY_DIAGNOSTICS_PROFILE.minRhythmicIndependenceScore,
    );
    assert.ok(gate.metrics.unisonOverlapCount <= BASELINE_BEAUTY_DIAGNOSTICS_PROFILE.maxUnisonOverlapCount);
    assert.ok(gate.metrics.sameDirectionMotionCount <= BASELINE_BEAUTY_DIAGNOSTICS_PROFILE.maxSameDirectionMotionCount);
    assert.ok(gate.metrics.sharedRhythmOverlapCount <= BASELINE_BEAUTY_DIAGNOSTICS_PROFILE.maxSharedRhythmOverlapCount);
    assert.ok(gate.metrics.leapRecoveryMisses <= BASELINE_BEAUTY_DIAGNOSTICS_PROFILE.maxLeapRecoveryMisses);
    assert.ok(
      gate.metrics.maxSelectedCandidateTextureCost <=
        BASELINE_BEAUTY_DIAGNOSTICS_PROFILE.maxSelectedCandidateTextureCost,
    );
    assert.ok(
      gate.metrics.averageSelectedCandidateTextureCost <=
        BASELINE_BEAUTY_DIAGNOSTICS_PROFILE.maxAverageSelectedCandidateTextureCost,
    );
    assert.ok(
      gate.metrics.maxSelectedCandidateMelodyCost <= BASELINE_BEAUTY_DIAGNOSTICS_PROFILE.maxSelectedCandidateMelodyCost,
    );
    assert.ok(
      gate.metrics.averageSelectedCandidateMelodyCost <=
        BASELINE_BEAUTY_DIAGNOSTICS_PROFILE.maxAverageSelectedCandidateMelodyCost,
    );
  }
});
