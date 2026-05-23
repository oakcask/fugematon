import assert from "node:assert/strict";
import test from "node:test";
import { REVIEW_LENGTH_TICKS } from "./constants.js";
import { generateScore } from "./generate.js";
import { COUNTER_SUBJECT_REVIEW_SEEDS } from "./generate-phase13u-beauty-rewrite-test-helpers.js";

test("Phase 13U modal counter-subject review seeds expose rhythm, contour, and collision windows", () => {
  for (const seed of COUNTER_SUBJECT_REVIEW_SEEDS) {
    const output = generateScore({ seed, lengthTicks: REVIEW_LENGTH_TICKS });
    const windows = output.diagnostics.qualityVector.counterSubjectWindows.filter(
      (window) => window.counterSubjectVoice !== undefined,
    );

    assert.ok(windows.length >= 3, `${seed} should expose counter-subject windows near entries`);
    assert.ok(windows.some((window) => window.rhythmPattern.length >= 4));
    assert.ok(windows.some((window) => window.contourClass.length >= 3));
    assert.ok(windows.every((window) => window.supportCollisionCount >= 0));
  }
});
