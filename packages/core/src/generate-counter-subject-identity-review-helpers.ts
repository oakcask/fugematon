import assert from "node:assert/strict";
import { REVIEW_LENGTH_TICKS } from "./constants.js";
import { cachedGenerateScore as generateScore } from "./generate-test-helpers.js";

export function assertCounterSubjectIdentityReviewSeedsExposeWindows(seeds: readonly string[]): void {
  for (const seed of seeds) {
    const output = generateScore({ seed, lengthTicks: REVIEW_LENGTH_TICKS });
    const windows = output.diagnostics.qualityVector.counterSubjectWindows.filter(
      (window) => window.counterSubjectVoice !== undefined,
    );

    assert.ok(windows.length >= 3, `${seed} should expose counter-subject windows near entries`);
    assert.ok(windows.some((window) => window.rhythmPattern.length >= 4));
    assert.ok(windows.some((window) => window.contourClass.length >= 3));
    assert.ok(windows.every((window) => window.supportCollisionCount >= 0));
  }
}
