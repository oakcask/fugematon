import assert from "node:assert/strict";
import test from "node:test";
import { TICKS_PER_QUARTER } from "./constants.js";
import { generateScore } from "./generate.js";

const ENTRY_RESET_REVIEW_SEEDS = ["contrary-motion", "tight-stretto", "modal-cadence", "seed-0zereox-1v729ih"] as const;

test("entry-reset review seeds avoid one-voice carry windows with outside resets", () => {
  const summaries = ENTRY_RESET_REVIEW_SEEDS.map((seed) => {
    const diagnostics = generateScore({ seed, lengthTicks: TICKS_PER_QUARTER * 288 }).diagnostics;
    const oneVoiceCarryWindows = diagnostics.entryBoundaryContinuity.windows.filter(
      (window) => window.classification === "one-voice-carry-with-outside-reset",
    );

    assert.equal(diagnostics.entryBoundaryContinuity.oneVoiceCarryWithOutsideResetCount, oneVoiceCarryWindows.length);
    assert.ok(
      oneVoiceCarryWindows.every(
        (window) => window.carriedOutsideVoices.length === 1 && window.outsideEndedAtEntryVoices.length > 0,
      ),
      `${seed} one-voice carry windows should expose the outside reset evidence`,
    );

    return {
      seed,
      oneVoiceCarryWithOutsideResetCount: oneVoiceCarryWindows.length,
      generatorResponseWindowCount: diagnostics.scoreWindowAcceptance.generatorResponseWindowCount,
    };
  });

  assert.ok(
    summaries.every((summary) => summary.oneVoiceCarryWithOutsideResetCount === 0),
    JSON.stringify(summaries, null, 2),
  );
  assert.ok(
    summaries.every((summary) => summary.generatorResponseWindowCount >= summary.oneVoiceCarryWithOutsideResetCount),
    JSON.stringify(summaries, null, 2),
  );
});
