import assert from "node:assert/strict";
import test from "node:test";
import {
  CONTOUR_MOTION_DIAGNOSTICS_PROFILE,
  REPRESENTATIVE_REVIEW_SEEDS,
  REVIEW_LENGTH_TICKS,
  ROTATION_REVIEW_SEEDS,
} from "./constants.js";
import { generateScore } from "./generate.js";
import { evaluateContourMotionGate } from "./review-gate.js";

test("generateScore applies phase-7 contour gates across fixed and rotation seeds", () => {
  const seeds = [...REPRESENTATIVE_REVIEW_SEEDS, ...ROTATION_REVIEW_SEEDS];

  for (const { seed } of seeds) {
    const output = generateScore({ seed, lengthTicks: REVIEW_LENGTH_TICKS, selectionModel: "baseline" });
    const gate = evaluateContourMotionGate(seed, output.diagnostics);

    assert.deepEqual(gate.failures, []);
    assert.equal(gate.passed, true);
    assert.ok(
      gate.metrics.fourBeatBassUpperSameDirectionRatio <=
        CONTOUR_MOTION_DIAGNOSTICS_PROFILE.maxFourBeatBassUpperSameDirectionRatio,
    );
    assert.ok(
      gate.metrics.fourBeatBassUpperContraryRatio >=
        CONTOUR_MOTION_DIAGNOSTICS_PROFILE.minFourBeatBassUpperContraryRatio,
    );
    assert.ok(
      gate.metrics.eightBeatBassUpperSameDirectionRatio <=
        CONTOUR_MOTION_DIAGNOSTICS_PROFILE.maxEightBeatBassUpperSameDirectionRatio,
    );
    assert.ok(
      gate.metrics.eightBeatBassUpperContraryRatio >=
        CONTOUR_MOTION_DIAGNOSTICS_PROFILE.minEightBeatBassUpperContraryRatio,
    );
    assert.ok(
      gate.metrics.fourBeatOuterVoiceSameDirectionRatio <=
        CONTOUR_MOTION_DIAGNOSTICS_PROFILE.maxFourBeatOuterVoiceSameDirectionRatio,
    );
    assert.ok(
      gate.metrics.fourBeatOuterVoiceContraryRatio >=
        CONTOUR_MOTION_DIAGNOSTICS_PROFILE.minFourBeatOuterVoiceContraryRatio,
    );
    assert.ok(
      gate.metrics.fourBeatBassUpperComparisonCount >= CONTOUR_MOTION_DIAGNOSTICS_PROFILE.minContourComparisonCount,
    );
    assert.ok(
      gate.metrics.eightBeatBassUpperComparisonCount >= CONTOUR_MOTION_DIAGNOSTICS_PROFILE.minContourComparisonCount,
    );
  }
});
