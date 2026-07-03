import assert from "node:assert/strict";
import {
  collectPostExpositionEntryBoundaryMetrics,
  POST_EXPOSITION_ENTRY_BOUNDARY_FOCUSED_SEEDS,
} from "./generate-post-exposition-entry-boundary-test-helpers.js";
import { reviewTest } from "./test-profile.js";

reviewTest(
  "post-exposition entry-boundary focused review seeds avoid synchronized outside-voice bass-entry resets",
  () => {
    const metrics = collectPostExpositionEntryBoundaryMetrics(POST_EXPOSITION_ENTRY_BOUNDARY_FOCUSED_SEEDS);

    assert.equal(metrics.seedCount, POST_EXPOSITION_ENTRY_BOUNDARY_FOCUSED_SEEDS.length);
    assert.equal(metrics.unpreparedSynchronizedResetSeedCount, 0);
    assert.equal(metrics.continuitySupportedSeedCount, metrics.seedCount);
    assert.ok(
      metrics.windows.every(
        (window) =>
          window.entryVoice === "bass" &&
          window.form !== "subject-fragment" &&
          (window.outsideOnsetVoices.length < 3 ||
            window.carriedOutsideVoices.length + window.delayedOutsideVoices.length > 0) &&
          window.carriedOutsideVoices.length + window.delayedOutsideVoices.length > 0,
      ),
    );
  },
);
