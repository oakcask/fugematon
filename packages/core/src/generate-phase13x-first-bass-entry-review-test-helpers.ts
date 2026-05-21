import assert from "node:assert/strict";
import { PHASE_5_11_ROTATION_SEEDS, PHASE_5_LENGTH_TICKS, PHASE_5_REVIEW_SEEDS } from "./constants.js";
import { generateScore } from "./generate.js";

export const PHASE_13X_FIRST_BASS_ENTRY_REVIEW_SEEDS = [...PHASE_5_REVIEW_SEEDS, ...PHASE_5_11_ROTATION_SEEDS].map(
  ({ seed }) => seed,
);

export const PHASE_13X_FIRST_BASS_ENTRY_REVIEW_BATCH_A = PHASE_13X_FIRST_BASS_ENTRY_REVIEW_SEEDS.slice(0, 6);
export const PHASE_13X_FIRST_BASS_ENTRY_REVIEW_BATCH_B = PHASE_13X_FIRST_BASS_ENTRY_REVIEW_SEEDS.slice(6, 12);
export const PHASE_13X_FIRST_BASS_ENTRY_REVIEW_BATCH_C = PHASE_13X_FIRST_BASS_ENTRY_REVIEW_SEEDS.slice(12, 17);
export const PHASE_13X_FIRST_BASS_ENTRY_REVIEW_BATCH_D = PHASE_13X_FIRST_BASS_ENTRY_REVIEW_SEEDS.slice(17);

export function assertPhase13XFirstBassEntryResetEvidence(seeds: readonly string[]): void {
  const resetSeeds = seeds.filter((seed) => {
    const output = generateScore({ seed, lengthTicks: PHASE_5_LENGTH_TICKS });
    const firstBassEntryWindow = output.diagnostics.entryBoundaryContinuity.firstBassEntryWindow;

    assert.equal(firstBassEntryWindow?.entryVoice, "bass", `${seed} should expose the first bass entry`);
    assert.equal(firstBassEntryWindow.state, "exposition", `${seed} should expose the exposition bass answer`);
    assert.equal(firstBassEntryWindow.form, "answer", `${seed} should expose the exposition bass answer`);

    return (
      output.diagnostics.entryBoundaryContinuity.firstBassEntrySynchronizedReset &&
      firstBassEntryWindow.outsideOnsetVoices.length === 3 &&
      firstBassEntryWindow.outsideEndedAtEntryVoices.length === 3 &&
      firstBassEntryWindow.carriedOutsideVoices.length === 0 &&
      firstBassEntryWindow.entryVoice === "bass"
    );
  });

  assert.deepEqual(resetSeeds, seeds);
}
