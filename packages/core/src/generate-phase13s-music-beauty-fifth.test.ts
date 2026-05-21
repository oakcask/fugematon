import assert from "node:assert/strict";
import test from "node:test";
import {
  collectPhase13SMusicBeautyMetrics,
  PHASE_13S_MUSIC_BEAUTY_BATCHES,
} from "./generate-phase13s-music-beauty-test-helpers.js";

test("generateScore improves Phase 13S music-beauty evidence in the fifth review batch", () => {
  const metrics = collectPhase13SMusicBeautyMetrics(PHASE_13S_MUSIC_BEAUTY_BATCHES.fifth);

  assert.equal(metrics.seedCount, 3);
  assert.ok(metrics.uniqueInitialSubjectRhythmPatternCount >= 2);
  assert.ok(metrics.uniqueInitialSubjectClimaxIndexCount >= 1);
  assert.ok(metrics.topSubjectFragmentFamilyShare <= 2 / 3);
  assert.ok(metrics.unresolvedEntrySevereIntervalQuarters <= 13);
  assert.ok(metrics.counterSubjectIdentityRetentionTotal >= 2);
});
