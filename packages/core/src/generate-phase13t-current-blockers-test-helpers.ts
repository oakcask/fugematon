import assert from "node:assert/strict";
import { collectPhase13TCurrentBlockerMetrics } from "./generate-phase13s-music-beauty-test-helpers.js";

export function assertPhase13TCurrentBlockerBatch(seeds: readonly string[]): void {
  const metrics = collectPhase13TCurrentBlockerMetrics(seeds);

  assert.equal(metrics.seedCount, seeds.length);
  assert.equal(metrics.durationBasedLockstepReviewSeedCount, metrics.seedCount);
  assert.equal(metrics.pitchClassUnisonReviewSeedCount, metrics.seedCount);
  assert.ok(metrics.unresolvedEntrySevereIntervalSentinelCount > 0);
}
