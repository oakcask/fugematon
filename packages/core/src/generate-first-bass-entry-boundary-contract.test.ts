import assert from "node:assert/strict";
import test from "node:test";
import {
  collectFirstBassEntryBoundaryMetrics,
  FIRST_BASS_ENTRY_BOUNDARY_REVIEW_BATCH_A,
} from "./generate-first-bass-entry-boundary-test-helpers.js";

test("first bass-entry boundary first-bass evidence is separate from post-exposition bass-entry evidence", () => {
  const metrics = collectFirstBassEntryBoundaryMetrics(FIRST_BASS_ENTRY_BOUNDARY_REVIEW_BATCH_A);

  assert.equal(metrics.seedCount, FIRST_BASS_ENTRY_BOUNDARY_REVIEW_BATCH_A.length);
  assert.equal(metrics.firstBassEntryResetSeedCount, 0);
  assert.equal(metrics.postExpositionSynchronizedResetCount, 0);
  assert.ok(metrics.postExpositionWindowCount >= metrics.seedCount);
  assert.ok(
    metrics.windows.every(
      (window) =>
        window.state === "exposition" &&
        window.form === "answer" &&
        window.entryVoice === "bass" &&
        window.startTick === 5760 &&
        window.outsideOnsetVoices.length < 3 &&
        window.outsideEndedAtEntryVoices.length < 3 &&
        window.carriedOutsideVoices.length + window.delayedOutsideVoices.length > 0,
    ),
  );
});
