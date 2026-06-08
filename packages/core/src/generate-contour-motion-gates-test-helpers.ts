import assert from "node:assert/strict";
import { CONTOUR_MOTION_DIAGNOSTICS_PROFILE, REVIEW_LENGTH_TICKS } from "./constants.js";
import { cachedGenerateScore as generateScore } from "./generate-test-helpers.js";
import { evaluateContourMotionGate } from "./review-gate.js";

type ReviewSeed = {
  seed: string;
};

export function assertContourMotionGateSeeds(seeds: readonly ReviewSeed[]): void {
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
}
