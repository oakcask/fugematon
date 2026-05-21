import assert from "node:assert/strict";
import test from "node:test";
import {
  collectPhase13SMusicBeautyMetrics,
  PHASE_13S_MUSIC_BEAUTY_BATCHES,
} from "./generate-phase13s-music-beauty-test-helpers.js";

test("generateScore improves Phase 13S music-beauty evidence in the first review batch", () => {
  const metrics = collectPhase13SMusicBeautyMetrics(PHASE_13S_MUSIC_BEAUTY_BATCHES.first);

  assert.equal(metrics.seedCount, 4);
  assert.ok(metrics.uniqueInitialSubjectRhythmPatternCount >= 4);
  assert.ok(metrics.uniqueInitialSubjectClimaxIndexCount >= 3);
  assert.ok(metrics.topSubjectFragmentFamilyShare <= 0.5);
  assert.ok(metrics.unresolvedEntrySevereIntervalQuarters <= 17);
  assert.ok(metrics.counterSubjectIdentityRetentionTotal >= 3.52);
});
