import assert from "node:assert/strict";
import test from "node:test";
import {
  collectPhase13SMusicBeautyMetrics,
  PHASE_13S_MUSIC_BEAUTY_BATCHES,
} from "./generate-phase13s-music-beauty-test-helpers.js";

test("generateScore improves Phase 13S music-beauty evidence in the fourth review batch", () => {
  const metrics = collectPhase13SMusicBeautyMetrics(PHASE_13S_MUSIC_BEAUTY_BATCHES.fourth);

  assert.equal(metrics.seedCount, 4);
  assert.ok(metrics.uniqueInitialSubjectRhythmPatternCount >= 3);
  assert.ok(metrics.uniqueInitialSubjectClimaxIndexCount >= 2);
  assert.ok(metrics.topSubjectFragmentFamilyShare <= 0.75);
  assert.ok(metrics.unresolvedEntrySevereIntervalQuarters <= 48);
  assert.ok(metrics.counterSubjectIdentityRetentionTotal >= 3.59);
});
