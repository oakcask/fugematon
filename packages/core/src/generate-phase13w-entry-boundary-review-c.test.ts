import assert from "node:assert/strict";
import test from "node:test";
import {
  collectPhase13WEntryBoundaryMetrics,
  PHASE_13W_REVIEW_BATCH_C,
} from "./generate-phase13w-entry-boundary-test-helpers.js";

test("Phase 13W review bundle batch C exposes entry-boundary continuity diagnostics", () => {
  const metrics = collectPhase13WEntryBoundaryMetrics(PHASE_13W_REVIEW_BATCH_C);

  assert.equal(metrics.seedCount, PHASE_13W_REVIEW_BATCH_C.length);
  assert.equal(metrics.unpreparedSynchronizedResetSeedCount, 0);
  assert.equal(metrics.continuitySupportedSeedCount, metrics.seedCount);
});
