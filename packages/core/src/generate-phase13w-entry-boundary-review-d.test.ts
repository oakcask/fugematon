import assert from "node:assert/strict";
import test from "node:test";
import {
  collectPhase13WEntryBoundaryMetrics,
  PHASE_13W_REVIEW_BATCH_D,
} from "./generate-phase13w-entry-boundary-test-helpers.js";

test("Phase 13W review bundle batch D exposes entry-boundary continuity diagnostics", () => {
  const metrics = collectPhase13WEntryBoundaryMetrics(PHASE_13W_REVIEW_BATCH_D);

  assert.equal(metrics.seedCount, PHASE_13W_REVIEW_BATCH_D.length);
  assert.equal(metrics.unpreparedSynchronizedResetSeedCount, 0);
  assert.equal(metrics.continuitySupportedSeedCount, metrics.seedCount);
});
