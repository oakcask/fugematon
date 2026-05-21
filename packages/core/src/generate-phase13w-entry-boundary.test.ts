import assert from "node:assert/strict";
import test from "node:test";
import {
  collectPhase13WEntryBoundaryMetrics,
  PHASE_13W_FOCUSED_ENTRY_BOUNDARY_SEEDS,
} from "./generate-phase13w-entry-boundary-test-helpers.js";

test("Phase 13W focused review seeds avoid synchronized outside-voice bass-entry resets", () => {
  const metrics = collectPhase13WEntryBoundaryMetrics(PHASE_13W_FOCUSED_ENTRY_BOUNDARY_SEEDS);

  assert.equal(metrics.seedCount, PHASE_13W_FOCUSED_ENTRY_BOUNDARY_SEEDS.length);
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
});
