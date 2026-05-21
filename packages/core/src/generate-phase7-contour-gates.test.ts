import assert from "node:assert/strict";
import test from "node:test";
import {
  PHASE_5_11_ROTATION_SEEDS,
  PHASE_5_LENGTH_TICKS,
  PHASE_5_REVIEW_SEEDS,
  PHASE_7_DIAGNOSTICS_PROFILE,
} from "./constants.js";
import { generateScore } from "./generate.js";
import { evaluatePhase7Diagnostics } from "./review-gate.js";

test("generateScore applies phase-7 contour gates across fixed and rotation seeds", () => {
  const seeds = [...PHASE_5_REVIEW_SEEDS, ...PHASE_5_11_ROTATION_SEEDS];

  for (const { seed } of seeds) {
    const output = generateScore({ seed, lengthTicks: PHASE_5_LENGTH_TICKS, selectionModel: "baseline" });
    const gate = evaluatePhase7Diagnostics(seed, output.diagnostics);

    assert.deepEqual(gate.failures, []);
    assert.equal(gate.passed, true);
    assert.ok(
      gate.metrics.fourBeatBassUpperSameDirectionRatio <=
        PHASE_7_DIAGNOSTICS_PROFILE.maxFourBeatBassUpperSameDirectionRatio,
    );
    assert.ok(
      gate.metrics.fourBeatBassUpperContraryRatio >= PHASE_7_DIAGNOSTICS_PROFILE.minFourBeatBassUpperContraryRatio,
    );
    assert.ok(
      gate.metrics.eightBeatBassUpperSameDirectionRatio <=
        PHASE_7_DIAGNOSTICS_PROFILE.maxEightBeatBassUpperSameDirectionRatio,
    );
    assert.ok(
      gate.metrics.eightBeatBassUpperContraryRatio >= PHASE_7_DIAGNOSTICS_PROFILE.minEightBeatBassUpperContraryRatio,
    );
    assert.ok(
      gate.metrics.fourBeatOuterVoiceSameDirectionRatio <=
        PHASE_7_DIAGNOSTICS_PROFILE.maxFourBeatOuterVoiceSameDirectionRatio,
    );
    assert.ok(
      gate.metrics.fourBeatOuterVoiceContraryRatio >= PHASE_7_DIAGNOSTICS_PROFILE.minFourBeatOuterVoiceContraryRatio,
    );
    assert.ok(gate.metrics.fourBeatBassUpperComparisonCount >= PHASE_7_DIAGNOSTICS_PROFILE.minContourComparisonCount);
    assert.ok(gate.metrics.eightBeatBassUpperComparisonCount >= PHASE_7_DIAGNOSTICS_PROFILE.minContourComparisonCount);
  }
});
