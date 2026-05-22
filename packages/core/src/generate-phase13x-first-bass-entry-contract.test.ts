import assert from "node:assert/strict";
import test from "node:test";
import {
  collectPhase13XFirstBassEntryMetrics,
  PHASE_13X_FIRST_BASS_ENTRY_REVIEW_BATCH_A,
} from "./generate-phase13x-first-bass-entry-review-test-helpers.js";

test("Phase 13X first-bass evidence is separate from post-exposition bass-entry evidence", () => {
  const metrics = collectPhase13XFirstBassEntryMetrics(PHASE_13X_FIRST_BASS_ENTRY_REVIEW_BATCH_A);

  assert.equal(metrics.seedCount, PHASE_13X_FIRST_BASS_ENTRY_REVIEW_BATCH_A.length);
  assert.equal(metrics.firstBassEntryResetSeedCount, metrics.seedCount);
  assert.ok(metrics.postExpositionSynchronizedResetCount > 0);
  assert.ok(metrics.postExpositionWindowCount >= metrics.seedCount);
  assert.ok(
    metrics.windows.every(
      (window) =>
        window.state === "exposition" &&
        window.form === "answer" &&
        window.entryVoice === "bass" &&
        window.startTick === 5760 &&
        window.outsideOnsetVoices.length === 3 &&
        window.outsideEndedAtEntryVoices.length === 3 &&
        window.carriedOutsideVoices.length === 0,
    ),
  );
});
