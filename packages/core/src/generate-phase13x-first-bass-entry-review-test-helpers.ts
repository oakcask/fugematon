import assert from "node:assert/strict";
import { REPRESENTATIVE_REVIEW_SEEDS, REVIEW_LENGTH_TICKS, ROTATION_REVIEW_SEEDS } from "./constants.js";
import type { PlannedEntry, Voice } from "./events.js";
import { generateScore } from "./generate.js";

export const PHASE_13X_FIRST_BASS_ENTRY_REVIEW_SEEDS = [...REPRESENTATIVE_REVIEW_SEEDS, ...ROTATION_REVIEW_SEEDS].map(
  ({ seed }) => seed,
);

export const PHASE_13X_FIRST_BASS_ENTRY_REVIEW_BATCH_A = PHASE_13X_FIRST_BASS_ENTRY_REVIEW_SEEDS.slice(0, 6);
export const PHASE_13X_FIRST_BASS_ENTRY_REVIEW_BATCH_B = PHASE_13X_FIRST_BASS_ENTRY_REVIEW_SEEDS.slice(6, 12);
export const PHASE_13X_FIRST_BASS_ENTRY_REVIEW_BATCH_C = PHASE_13X_FIRST_BASS_ENTRY_REVIEW_SEEDS.slice(12, 17);
export const PHASE_13X_FIRST_BASS_ENTRY_REVIEW_BATCH_D = PHASE_13X_FIRST_BASS_ENTRY_REVIEW_SEEDS.slice(17);

type Phase13XFirstBassEntryWindow = {
  seed: string;
  state: PlannedEntry["state"];
  form: PlannedEntry["form"];
  entryVoice: Voice;
  startTick: number;
  outsideOnsetVoices: readonly Voice[];
  outsideEndedAtEntryVoices: readonly Voice[];
  carriedOutsideVoices: readonly Voice[];
  delayedOutsideVoices: readonly Voice[];
};

export type Phase13XFirstBassEntryMetrics = {
  seedCount: number;
  firstBassEntryResetSeedCount: number;
  postExpositionWindowCount: number;
  postExpositionSynchronizedResetCount: number;
  windows: Phase13XFirstBassEntryWindow[];
};

export function collectPhase13XFirstBassEntryMetrics(seeds: readonly string[]): Phase13XFirstBassEntryMetrics {
  const outputs = seeds.map((seed) => ({ seed, output: generateScore({ seed, lengthTicks: REVIEW_LENGTH_TICKS }) }));
  const windows = outputs.map(({ seed, output }) => {
    const firstBassEntryWindow = output.diagnostics.entryBoundaryContinuity.firstBassEntryWindow;
    assert.ok(firstBassEntryWindow !== undefined, `${seed} should expose the first bass entry window`);

    return { seed, ...firstBassEntryWindow };
  });

  return {
    seedCount: seeds.length,
    firstBassEntryResetSeedCount: outputs.filter(
      ({ output }) => output.diagnostics.entryBoundaryContinuity.firstBassEntrySynchronizedReset,
    ).length,
    postExpositionWindowCount: outputs.reduce(
      (sum, { output }) => sum + output.diagnostics.entryBoundaryContinuity.bassEntryWindowCount,
      0,
    ),
    postExpositionSynchronizedResetCount: outputs.reduce(
      (sum, { output }) =>
        sum +
        output.diagnostics.entryBoundaryContinuity.windows.filter(
          (window) =>
            window.entryVoice === "bass" &&
            window.state !== "exposition" &&
            window.classification === "synchronized-reset",
        ).length,
      0,
    ),
    windows,
  };
}

export function assertPhase13XFirstBassEntryContinuityEvidence(seeds: readonly string[]): void {
  const metrics = collectPhase13XFirstBassEntryMetrics(seeds);
  const continuitySeeds = metrics.windows
    .filter((firstBassEntryWindow) => {
      assert.equal(
        firstBassEntryWindow.entryVoice,
        "bass",
        `${firstBassEntryWindow.seed} should expose the first bass entry`,
      );
      assert.equal(
        firstBassEntryWindow.state,
        "exposition",
        `${firstBassEntryWindow.seed} should expose the exposition bass answer`,
      );
      assert.equal(
        firstBassEntryWindow.form,
        "answer",
        `${firstBassEntryWindow.seed} should expose the exposition bass answer`,
      );

      return (
        firstBassEntryWindow.entryVoice === "bass" &&
        firstBassEntryWindow.outsideOnsetVoices.length < 3 &&
        firstBassEntryWindow.outsideEndedAtEntryVoices.length < 3 &&
        firstBassEntryWindow.carriedOutsideVoices.length + firstBassEntryWindow.delayedOutsideVoices.length > 0
      );
    })
    .map((window) => window.seed);

  assert.deepEqual(continuitySeeds, seeds);
  assert.equal(metrics.firstBassEntryResetSeedCount, 0);
}
