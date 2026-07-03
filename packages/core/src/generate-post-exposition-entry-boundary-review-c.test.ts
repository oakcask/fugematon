import assert from "node:assert/strict";
import {
  collectPostExpositionEntryBoundaryMetrics,
  POST_EXPOSITION_ENTRY_BOUNDARY_REVIEW_BATCH_C,
} from "./generate-post-exposition-entry-boundary-test-helpers.js";
import { reviewTest } from "./test-profile.js";

reviewTest("post-exposition entry-boundary review bundle batch C exposes entry-boundary continuity diagnostics", () => {
  const metrics = collectPostExpositionEntryBoundaryMetrics(POST_EXPOSITION_ENTRY_BOUNDARY_REVIEW_BATCH_C);

  assert.equal(metrics.seedCount, POST_EXPOSITION_ENTRY_BOUNDARY_REVIEW_BATCH_C.length);
  assert.equal(metrics.unpreparedSynchronizedResetSeedCount, 0);
  assert.equal(metrics.continuitySupportedSeedCount, metrics.seedCount);
});
