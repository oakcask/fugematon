import assert from "node:assert/strict";
import { TICKS_PER_QUARTER } from "./constants.js";
import { generateScore } from "./generate.js";

export const WEAK_DISSONANCE_REVIEW_SEEDS = [
  "contrary-motion",
  "tight-stretto",
  "circle-fifths",
  "modal-cadence",
  "dense-modal",
  "random-listen-check",
  "seed-0zereox-1v729ih",
] as const;

export function assertWeakDissonanceReviewSeedsExposePressure(
  seeds: readonly string[],
  expectation: {
    minWeakPassingSemitoneClashTicks?: number;
    minPassingNeighborOffbeatSemitoneClashTicks?: number;
    maxWeakPassingSemitoneClashTicks?: number;
    maxPassingNeighborOffbeatSemitoneClashTicks?: number;
  },
): void {
  const summaries = seeds.map((seed) => {
    const diagnostics = generateScore({ seed, lengthTicks: TICKS_PER_QUARTER * 288 }).diagnostics;
    const weakSemitoneWindows = diagnostics.dissonanceTriage.windows.filter(
      (window) => window.classification === "weak-passing-semitone-clash",
    );
    const passingNeighborOffbeatWindows = diagnostics.dissonanceTriage.windows.filter(
      (window) =>
        window.classification === "weak-passing-semitone-clash" ||
        window.classification === "passing-neighbor-offbeat-semitone-clash",
    );

    return {
      seed,
      weakPassingSemitoneClashTicks: diagnostics.dissonanceTriage.weakPassingSemitoneClashTicks,
      passingNeighborOffbeatSemitoneClashTicks: diagnostics.dissonanceTriage.passingNeighborOffbeatSemitoneClashTicks,
      weakSemitoneWindowCount: weakSemitoneWindows.length,
      passingNeighborOffbeatWindowCount: passingNeighborOffbeatWindows.length,
      weakBeatNonChordToneIntentCount:
        diagnostics.texturePlanningReview.metricalHarmony.weakBeatNonChordToneIntentCount,
      weakBeatUnresolvedNonChordToneCount:
        diagnostics.texturePlanningReview.metricalHarmony.weakBeatUnresolvedNonChordToneCount,
    };
  });

  assert.ok(
    summaries.every(
      (summary) =>
        summary.passingNeighborOffbeatSemitoneClashTicks > 0 &&
        summary.passingNeighborOffbeatSemitoneClashTicks >= summary.weakPassingSemitoneClashTicks,
    ),
    JSON.stringify(summaries, null, 2),
  );
  assert.ok(
    summaries.every(
      (summary) => summary.weakBeatNonChordToneIntentCount > 0 && summary.weakBeatUnresolvedNonChordToneCount > 0,
    ),
    JSON.stringify(summaries, null, 2),
  );
  const weakPassingSemitoneClashTicks = summaries.reduce(
    (sum, summary) => sum + summary.weakPassingSemitoneClashTicks,
    0,
  );
  const passingNeighborOffbeatSemitoneClashTicks = summaries.reduce(
    (sum, summary) => sum + summary.passingNeighborOffbeatSemitoneClashTicks,
    0,
  );
  if (expectation.minWeakPassingSemitoneClashTicks !== undefined) {
    assert.ok(
      weakPassingSemitoneClashTicks >= expectation.minWeakPassingSemitoneClashTicks,
      JSON.stringify(summaries, null, 2),
    );
  }
  if (expectation.minPassingNeighborOffbeatSemitoneClashTicks !== undefined) {
    assert.ok(
      passingNeighborOffbeatSemitoneClashTicks >= expectation.minPassingNeighborOffbeatSemitoneClashTicks,
      JSON.stringify(summaries, null, 2),
    );
  }
  if (expectation.maxWeakPassingSemitoneClashTicks !== undefined) {
    assert.ok(
      weakPassingSemitoneClashTicks <= expectation.maxWeakPassingSemitoneClashTicks,
      JSON.stringify(summaries, null, 2),
    );
  }
  if (expectation.maxPassingNeighborOffbeatSemitoneClashTicks !== undefined) {
    assert.ok(
      passingNeighborOffbeatSemitoneClashTicks <= expectation.maxPassingNeighborOffbeatSemitoneClashTicks,
      JSON.stringify(summaries, null, 2),
    );
  }
}
