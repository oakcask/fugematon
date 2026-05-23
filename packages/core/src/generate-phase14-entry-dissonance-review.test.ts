import assert from "node:assert/strict";
import test from "node:test";
import { TICKS_PER_QUARTER } from "./constants.js";
import { generateScore } from "./generate.js";

const PHASE_14_ENTRY_DISSONANCE_REVIEW_SEEDS = [
  "contrary-motion",
  "tight-stretto",
  "circle-fifths",
  "modal-cadence",
] as const;

test("Phase 14 entry-dissonance review seeds keep unresolved accented entry clashes at the repaired ceiling", () => {
  const summaries = PHASE_14_ENTRY_DISSONANCE_REVIEW_SEEDS.map((seed) => {
    const diagnostics = generateScore({ seed, lengthTicks: TICKS_PER_QUARTER * 288 }).diagnostics;
    const entryAdjacentSecondFriction = diagnostics.qualityVector.entrySonorities.reduce(
      (sum, sonority) => sum + sonority.adjacentSecondFrictionCount,
      0,
    );
    const unresolvedAccentedEntryClashes = diagnostics.qualityVector.entrySonorities.reduce(
      (sum, sonority) => sum + sonority.unresolvedAccentedClashCount,
      0,
    );
    const unresolvedAccentedEntryWindows = diagnostics.dissonanceTriage.windows.filter(
      (window) => window.classification === "unresolved-accented-entry-clash",
    );

    return {
      seed,
      entryAdjacentSecondFriction,
      unresolvedAccentedEntryClashes,
      phase14EntryAdjacentSecondFrictionCount: diagnostics.dissonanceTriage.entryAdjacentSecondFrictionCount,
      phase14UnresolvedAccentedEntryClashCount: diagnostics.dissonanceTriage.unresolvedAccentedEntryClashCount,
      unresolvedAccentedEntryWindowCount: unresolvedAccentedEntryWindows.length,
    };
  });

  assert.ok(
    summaries.every((summary) => summary.entryAdjacentSecondFriction > 0),
    JSON.stringify(summaries, null, 2),
  );
  assert.ok(
    summaries.every((summary) => summary.unresolvedAccentedEntryClashes <= 9),
    JSON.stringify(summaries, null, 2),
  );
  assert.ok(
    summaries.reduce((sum, summary) => sum + summary.unresolvedAccentedEntryClashes, 0) <= 18,
    JSON.stringify(summaries, null, 2),
  );
  assert.ok(
    summaries.every(
      (summary) =>
        summary.phase14EntryAdjacentSecondFrictionCount === summary.entryAdjacentSecondFriction &&
        summary.phase14UnresolvedAccentedEntryClashCount === summary.unresolvedAccentedEntryClashes,
    ),
    JSON.stringify(summaries, null, 2),
  );
});
