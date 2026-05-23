import assert from "node:assert/strict";
import { TICKS_PER_QUARTER } from "./constants.js";
import { generateScore } from "./generate.js";

export const PHASE_14_WEAK_DISSONANCE_REVIEW_SEEDS = [
  "contrary-motion",
  "tight-stretto",
  "circle-fifths",
  "modal-cadence",
  "dense-modal",
  "random-listen-check",
  "seed-0zereox-1v729ih",
] as const;

export function assertPhase14WeakDissonanceReviewSeedsExposePressure(
  seeds: readonly string[],
  expectation: {
    minWeakPassingSemitoneClashTicks: number;
    minPassingNeighborOffbeatSemitoneClashTicks: number;
  },
): void {
  const summaries = seeds.map((seed) => {
    const diagnostics = generateScore({ seed, lengthTicks: TICKS_PER_QUARTER * 288 }).diagnostics;
    const weakSemitoneWindows = diagnostics.phase14DissonanceTriage.windows.filter(
      (window) => window.classification === "weak-passing-semitone-clash",
    );
    const passingNeighborOffbeatWindows = diagnostics.phase14DissonanceTriage.windows.filter(
      (window) =>
        window.classification === "weak-passing-semitone-clash" ||
        window.classification === "passing-neighbor-offbeat-semitone-clash",
    );

    return {
      seed,
      weakPassingSemitoneClashTicks: diagnostics.phase14DissonanceTriage.weakPassingSemitoneClashTicks,
      passingNeighborOffbeatSemitoneClashTicks:
        diagnostics.phase14DissonanceTriage.passingNeighborOffbeatSemitoneClashTicks,
      weakSemitoneWindowCount: weakSemitoneWindows.length,
      passingNeighborOffbeatWindowCount: passingNeighborOffbeatWindows.length,
      weakBeatNonChordToneIntentCount: diagnostics.phase11Review.metricalHarmony.weakBeatNonChordToneIntentCount,
      weakBeatUnresolvedNonChordToneCount:
        diagnostics.phase11Review.metricalHarmony.weakBeatUnresolvedNonChordToneCount,
    };
  });

  assert.ok(
    summaries.every(
      (summary) =>
        summary.weakPassingSemitoneClashTicks > 0 &&
        summary.passingNeighborOffbeatSemitoneClashTicks > 0 &&
        summary.passingNeighborOffbeatSemitoneClashTicks >= summary.weakPassingSemitoneClashTicks,
    ),
    JSON.stringify(summaries, null, 2),
  );
  assert.ok(
    summaries.every((summary) => summary.weakSemitoneWindowCount > 0 && summary.passingNeighborOffbeatWindowCount > 0),
    JSON.stringify(summaries, null, 2),
  );
  assert.ok(
    summaries.every(
      (summary) => summary.weakBeatNonChordToneIntentCount > 0 && summary.weakBeatUnresolvedNonChordToneCount > 0,
    ),
    JSON.stringify(summaries, null, 2),
  );
  assert.ok(
    summaries.reduce((sum, summary) => sum + summary.weakPassingSemitoneClashTicks, 0) >=
      expectation.minWeakPassingSemitoneClashTicks,
    JSON.stringify(summaries, null, 2),
  );
  assert.ok(
    summaries.reduce((sum, summary) => sum + summary.passingNeighborOffbeatSemitoneClashTicks, 0) >=
      expectation.minPassingNeighborOffbeatSemitoneClashTicks,
    JSON.stringify(summaries, null, 2),
  );
}
