import assert from "node:assert/strict";
import test from "node:test";
import {
  collectPostExpositionEntryBoundaryMetrics,
  POST_EXPOSITION_ENTRY_BOUNDARY_REVIEW_BATCH_B,
} from "./generate-post-exposition-entry-boundary-test-helpers.js";

test("post-exposition entry-boundary review bundle batch B exposes entry-boundary continuity diagnostics", () => {
  const metrics = collectPostExpositionEntryBoundaryMetrics(POST_EXPOSITION_ENTRY_BOUNDARY_REVIEW_BATCH_B);

  assert.equal(metrics.seedCount, POST_EXPOSITION_ENTRY_BOUNDARY_REVIEW_BATCH_B.length);
  assert.equal(metrics.unpreparedSynchronizedResetSeedCount, 0);
  assert.equal(metrics.continuitySupportedSeedCount, metrics.seedCount);
});
