import assert from "node:assert/strict";
import test from "node:test";
import {
  collectPhase13WEntryBoundaryMetrics,
  PHASE_13W_REVIEW_BATCH_B,
} from "./generate-phase13w-entry-boundary-test-helpers.js";

test("Phase 13W review bundle batch B exposes entry-boundary continuity diagnostics", () => {
  const metrics = collectPhase13WEntryBoundaryMetrics(PHASE_13W_REVIEW_BATCH_B);

  assert.equal(metrics.seedCount, PHASE_13W_REVIEW_BATCH_B.length);
  assert.equal(metrics.unpreparedSynchronizedResetSeedCount, 0);
  assert.equal(metrics.continuitySupportedSeedCount, metrics.seedCount);
});
