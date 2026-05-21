import assert from "node:assert/strict";
import test from "node:test";
import {
  collectPhase13WEntryBoundaryMetrics,
  PHASE_13W_REVIEW_BATCH_A,
} from "./generate-phase13w-entry-boundary-test-helpers.js";

test("Phase 13W review bundle batch A exposes entry-boundary continuity diagnostics", () => {
  const metrics = collectPhase13WEntryBoundaryMetrics(PHASE_13W_REVIEW_BATCH_A);

  assert.equal(metrics.seedCount, PHASE_13W_REVIEW_BATCH_A.length);
  assert.equal(metrics.unpreparedSynchronizedResetSeedCount, 0);
  assert.equal(metrics.continuitySupportedSeedCount, metrics.seedCount);
});
