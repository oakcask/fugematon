import assert from "node:assert/strict";
import test from "node:test";
import { TICKS_PER_QUARTER } from "./constants.js";
import { generateScore } from "./generate.js";

const PHASE_14_DISSONANCE_TRIAGE_SEEDS = [
  "contrary-motion",
  "tight-stretto",
  "circle-fifths",
  "modal-cadence",
  "dense-modal",
] as const;

test("Phase 14 dissonance triage seeds keep entry and weak-dissonance evidence observable", () => {
  const summaries = PHASE_14_DISSONANCE_TRIAGE_SEEDS.map((seed) => {
    const diagnostics = generateScore({ seed, lengthTicks: TICKS_PER_QUARTER * 288 }).diagnostics;
    const entryAdjacentSecondFriction = diagnostics.qualityVector.entrySonorities.reduce(
      (sum, sonority) => sum + sonority.adjacentSecondFrictionCount,
      0,
    );
    const unresolvedAccentedEntryClashes = diagnostics.qualityVector.entrySonorities.reduce(
      (sum, sonority) => sum + sonority.unresolvedAccentedClashCount,
      0,
    );

    return {
      seed,
      phase14WeakPassingSemitoneClashTicks: diagnostics.dissonanceTriage.weakPassingSemitoneClashTicks,
      phase14PassingNeighborOffbeatSemitoneClashTicks:
        diagnostics.dissonanceTriage.passingNeighborOffbeatSemitoneClashTicks,
      phase14EntryAdjacentSecondFrictionCount: diagnostics.dissonanceTriage.entryAdjacentSecondFrictionCount,
      phase14UnresolvedAccentedEntryClashCount: diagnostics.dissonanceTriage.unresolvedAccentedEntryClashCount,
      phase14WindowCount: diagnostics.dissonanceTriage.windows.length,
      entryAdjacentSecondFriction,
      unresolvedAccentedEntryClashes,
      weakBeatNonChordToneIntentCount:
        diagnostics.texturePlanningReview.metricalHarmony.weakBeatNonChordToneIntentCount,
      weakBeatUnresolvedNonChordToneCount:
        diagnostics.texturePlanningReview.metricalHarmony.weakBeatUnresolvedNonChordToneCount,
    };
  });

  assert.ok(
    summaries.every((summary) => summary.weakBeatNonChordToneIntentCount > 0),
    JSON.stringify(summaries, null, 2),
  );
  assert.ok(
    summaries.some((summary) => summary.entryAdjacentSecondFriction > 0 && summary.unresolvedAccentedEntryClashes > 0),
    JSON.stringify(summaries, null, 2),
  );
  assert.ok(
    summaries.some((summary) => summary.weakBeatUnresolvedNonChordToneCount > 0),
    JSON.stringify(summaries, null, 2),
  );
  assert.ok(
    summaries.every(
      (summary) =>
        summary.phase14EntryAdjacentSecondFrictionCount === summary.entryAdjacentSecondFriction &&
        summary.phase14UnresolvedAccentedEntryClashCount === summary.unresolvedAccentedEntryClashes &&
        summary.phase14PassingNeighborOffbeatSemitoneClashTicks >= summary.phase14WeakPassingSemitoneClashTicks,
    ),
    JSON.stringify(summaries, null, 2),
  );
  assert.ok(
    summaries.some((summary) => summary.phase14WindowCount > 0),
    JSON.stringify(summaries, null, 2),
  );
});
