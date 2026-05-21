import assert from "node:assert/strict";
import { collectPhase13TCurrentBlockerMetrics } from "./generate-phase13s-music-beauty-test-helpers.js";

export function assertPhase13TCompletionEvidenceBatch(seeds: readonly string[]): void {
  const metrics = collectPhase13TCurrentBlockerMetrics(seeds);

  assert.equal(metrics.seedCount, seeds.length);
  assert.equal(metrics.durationBasedLockstepReviewSeedCount, metrics.seedCount);
  assert.equal(metrics.pitchClassUnisonReviewSeedCount, metrics.seedCount);
  assert.ok(metrics.unresolvedEntrySevereIntervalSentinelCount <= metrics.seedCount * 12);
  assert.ok(metrics.classifiedEntrySonorityCount >= metrics.seedCount * 35);
  assert.ok(metrics.fragmentFunctionEvidenceTotal >= metrics.seedCount * 6);
  assert.ok(metrics.recognizableOrAlteredCounterSubjectWindowCount >= metrics.seedCount * 35);
  assert.equal(metrics.functionAwareLockstepSeedCount, metrics.seedCount);
  assert.ok(metrics.topSubjectFragmentFamilyShare <= 1);
}
