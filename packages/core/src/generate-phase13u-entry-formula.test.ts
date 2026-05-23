import assert from "node:assert/strict";
import test from "node:test";
import { REVIEW_LENGTH_TICKS } from "./constants.js";
import { generateScore } from "./generate.js";
import { ENTRY_FORMULA_REVIEW_SEEDS } from "./generate-phase13u-beauty-rewrite-test-helpers.js";

test("Phase 13U entry formula review seeds expose score-window sonority evidence", () => {
  const recurrentFormulaKeys = new Map<string, number>();

  for (const seed of ENTRY_FORMULA_REVIEW_SEEDS) {
    const output = generateScore({ seed, lengthTicks: REVIEW_LENGTH_TICKS });
    const reviewedWindows = output.diagnostics.qualityVector.entrySonorities.filter(
      (sonority) => !sonority.kinds.includes("open-consonance"),
    );

    assert.ok(reviewedWindows.length >= 3, `${seed} should expose multiple entry sonority windows`);
    assert.ok(reviewedWindows.some((sonority) => sonority.supportVoices.length >= 2));
    assert.ok(
      reviewedWindows.some(
        (sonority) =>
          sonority.pitchClassUnisonStackCount +
            sonority.adjacentSecondFrictionCount +
            sonority.exposedSeventhCount +
            sonority.tritoneExposureCount >
          0,
      ),
    );

    for (const sonority of reviewedWindows) {
      const formulaKey = [
        sonority.voice,
        sonority.state,
        sonority.beatStrength,
        sonority.supportVoices.join("+"),
        sonority.kinds.join("+"),
        sonority.resolutionDirection,
      ].join(":");
      recurrentFormulaKeys.set(formulaKey, (recurrentFormulaKeys.get(formulaKey) ?? 0) + 1);
    }
  }

  assert.ok([...recurrentFormulaKeys.values()].some((count) => count >= 2));
});
