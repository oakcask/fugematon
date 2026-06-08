import assert from "node:assert/strict";
import test from "node:test";
import { TICKS_PER_QUARTER } from "./constants.js";
import { cachedGenerateScore as generateScore } from "./generate-test-helpers.js";

const ENTRY_DISSONANCE_REVIEW_SEEDS = ["dense-modal", "random-listen-check", "seed-0zereox-1v729ih"] as const;

test("entry-dissonance review seeds keep unresolved accented entry clashes at the repaired ceiling", () => {
  const summaries = ENTRY_DISSONANCE_REVIEW_SEEDS.map((seed) => {
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
      entryAdjacentSecondFrictionCount: diagnostics.dissonanceTriage.entryAdjacentSecondFrictionCount,
      unresolvedAccentedEntryClashCount: diagnostics.dissonanceTriage.unresolvedAccentedEntryClashCount,
      unresolvedAccentedEntryWindowCount: unresolvedAccentedEntryWindows.length,
    };
  });

  assert.ok(
    summaries.every((summary) => summary.entryAdjacentSecondFriction > 0),
    JSON.stringify(summaries, null, 2),
  );
  assert.ok(
    summaries.every((summary) => summary.unresolvedAccentedEntryClashes <= 7),
    JSON.stringify(summaries, null, 2),
  );
  assert.ok(
    summaries.reduce((sum, summary) => sum + summary.unresolvedAccentedEntryClashes, 0) <= 15,
    JSON.stringify(summaries, null, 2),
  );
  assert.ok(
    summaries.every(
      (summary) =>
        summary.entryAdjacentSecondFrictionCount === summary.entryAdjacentSecondFriction &&
        summary.unresolvedAccentedEntryClashCount === summary.unresolvedAccentedEntryClashes,
    ),
    JSON.stringify(summaries, null, 2),
  );
});
