import assert from "node:assert/strict";
import {
  collectPostExpositionEntryBoundaryMetrics,
  POST_EXPOSITION_ENTRY_BOUNDARY_REVIEW_BATCH_D,
} from "./generate-post-exposition-entry-boundary-test-helpers.js";
import { reviewTest } from "./test-profile.js";

reviewTest(
  "post-exposition entry-boundary review bundle batch D2 exposes entry-boundary continuity diagnostics",
  () => {
    const seeds = POST_EXPOSITION_ENTRY_BOUNDARY_REVIEW_BATCH_D.slice(3);
    const metrics = collectPostExpositionEntryBoundaryMetrics(seeds);

    assert.equal(metrics.seedCount, seeds.length);
    assert.equal(metrics.unpreparedSynchronizedResetSeedCount, 0);
    assert.equal(metrics.continuitySupportedSeedCount, metrics.seedCount);
  },
);
