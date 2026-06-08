import assert from "node:assert/strict";
import { REVIEW_LENGTH_TICKS, ROTATION_ROBUSTNESS_DIAGNOSTICS_PROFILE } from "./constants.js";
import { cachedGenerateScore as generateScore } from "./generate-test-helpers.js";
import { evaluateRotationRobustnessGate } from "./review-gate.js";

export function assertRotationRobustnessMarginGate(seed: string): void {
  const output = generateScore({ seed, lengthTicks: REVIEW_LENGTH_TICKS, selectionModel: "baseline" });
  const gate = evaluateRotationRobustnessGate(seed, output.diagnostics);

  assert.deepEqual(gate.failures, []);
  assert.equal(gate.passed, true);
  assert.ok(
    gate.metrics.counterSubjectIdentityRetention >=
      ROTATION_ROBUSTNESS_DIAGNOSTICS_PROFILE.minCounterSubjectIdentityRetention,
  );
  assert.ok(
    gate.metrics.rhythmicIndependenceScore >= ROTATION_ROBUSTNESS_DIAGNOSTICS_PROFILE.minRhythmicIndependenceScore,
  );
  assert.ok(gate.metrics.unisonOverlapCount <= ROTATION_ROBUSTNESS_DIAGNOSTICS_PROFILE.maxUnisonOverlapCount);
  assert.ok(
    gate.metrics.sameDirectionMotionCount <= ROTATION_ROBUSTNESS_DIAGNOSTICS_PROFILE.maxSameDirectionMotionCount,
  );
  assert.ok(
    gate.metrics.sharedRhythmOverlapCount <= ROTATION_ROBUSTNESS_DIAGNOSTICS_PROFILE.maxSharedRhythmOverlapCount,
  );
  assert.ok(gate.metrics.leapRecoveryMisses <= ROTATION_ROBUSTNESS_DIAGNOSTICS_PROFILE.maxLeapRecoveryMisses);
  assert.ok(
    gate.metrics.shortStrongBeatEntryNoteCount <=
      ROTATION_ROBUSTNESS_DIAGNOSTICS_PROFILE.maxShortStrongBeatEntryNoteCount,
  );
  assert.ok(
    gate.metrics.entrySupportInstabilityCount <=
      ROTATION_ROBUSTNESS_DIAGNOSTICS_PROFILE.maxEntrySupportInstabilityCount,
  );
  assert.ok(
    gate.metrics.maxEntrySupportInstabilityPerEntry <=
      ROTATION_ROBUSTNESS_DIAGNOSTICS_PROFILE.maxEntrySupportInstabilityPerEntry,
  );
  assert.ok(
    gate.metrics.maxConsecutiveEntrySupportInstabilities <=
      ROTATION_ROBUSTNESS_DIAGNOSTICS_PROFILE.maxConsecutiveEntrySupportInstabilities,
  );
  assert.ok(
    gate.metrics.unresolvedEntrySupportInstabilityCount <=
      ROTATION_ROBUSTNESS_DIAGNOSTICS_PROFILE.maxUnresolvedEntrySupportInstabilityCount,
  );
}
