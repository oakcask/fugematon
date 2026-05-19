import assert from "node:assert/strict";
import test from "node:test";
import {
  PHASE_5_11_DIAGNOSTICS_PROFILE,
  PHASE_5_11_ROTATION_SEEDS,
  PHASE_5_LENGTH_TICKS,
  PHASE_5_REVIEW_SEEDS,
} from "./constants.js";
import { generateScore } from "./generate.js";
import { evaluatePhase511Diagnostics } from "./review-gate.js";

test("generateScore applies phase-5.11 margin gates across fixed and rotation seeds", () => {
  const seeds = [...PHASE_5_REVIEW_SEEDS, ...PHASE_5_11_ROTATION_SEEDS];

  for (const { seed } of seeds) {
    const output = generateScore({ seed, lengthTicks: PHASE_5_LENGTH_TICKS, selectionModel: "baseline" });
    const gate = evaluatePhase511Diagnostics(seed, output.diagnostics);

    assert.deepEqual(gate.failures, []);
    assert.equal(gate.passed, true);
    assert.ok(
      gate.metrics.counterSubjectIdentityRetention >= PHASE_5_11_DIAGNOSTICS_PROFILE.minCounterSubjectIdentityRetention,
    );
    assert.ok(gate.metrics.rhythmicIndependenceScore >= PHASE_5_11_DIAGNOSTICS_PROFILE.minRhythmicIndependenceScore);
    assert.ok(gate.metrics.unisonOverlapCount <= PHASE_5_11_DIAGNOSTICS_PROFILE.maxUnisonOverlapCount);
    assert.ok(gate.metrics.sameDirectionMotionCount <= PHASE_5_11_DIAGNOSTICS_PROFILE.maxSameDirectionMotionCount);
    assert.ok(gate.metrics.sharedRhythmOverlapCount <= PHASE_5_11_DIAGNOSTICS_PROFILE.maxSharedRhythmOverlapCount);
    assert.ok(gate.metrics.leapRecoveryMisses <= PHASE_5_11_DIAGNOSTICS_PROFILE.maxLeapRecoveryMisses);
    assert.ok(
      gate.metrics.shortStrongBeatEntryNoteCount <= PHASE_5_11_DIAGNOSTICS_PROFILE.maxShortStrongBeatEntryNoteCount,
    );
    assert.ok(
      gate.metrics.entrySupportInstabilityCount <= PHASE_5_11_DIAGNOSTICS_PROFILE.maxEntrySupportInstabilityCount,
    );
    assert.ok(
      gate.metrics.maxEntrySupportInstabilityPerEntry <=
        PHASE_5_11_DIAGNOSTICS_PROFILE.maxEntrySupportInstabilityPerEntry,
    );
    assert.ok(
      gate.metrics.maxConsecutiveEntrySupportInstabilities <=
        PHASE_5_11_DIAGNOSTICS_PROFILE.maxConsecutiveEntrySupportInstabilities,
    );
    assert.ok(
      gate.metrics.unresolvedEntrySupportInstabilityCount <=
        PHASE_5_11_DIAGNOSTICS_PROFILE.maxUnresolvedEntrySupportInstabilityCount,
    );
  }
});

test("generateScore applies phase-5.11 modal rotation seed gates", () => {
  for (const [seed, profile] of Object.entries(PHASE_5_11_DIAGNOSTICS_PROFILE.modalRotationSeeds)) {
    const output = generateScore({ seed, lengthTicks: PHASE_5_LENGTH_TICKS, selectionModel: "baseline" });

    assert.ok(output.diagnostics.counterSubjectIdentityRetention >= profile.minCounterSubjectIdentityRetention);
    assert.ok(output.diagnostics.sameDirectionMotionCount <= profile.maxSameDirectionMotionCount);
    assert.ok(output.diagnostics.leapRecoveryMisses <= profile.maxLeapRecoveryMisses);
    assert.ok(output.diagnostics.modalContextCount >= profile.minModalContextCount);
  }
});
