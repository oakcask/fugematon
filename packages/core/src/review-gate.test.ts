import assert from "node:assert/strict";
import test from "node:test";
import {
  CONTOUR_MOTION_DIAGNOSTICS_PROFILE,
  MELODY_TEXTURE_DIAGNOSTICS_PROFILE,
  REVIEW_LENGTH_TICKS,
} from "./constants.js";
import type { GenerationDiagnostics } from "./events.js";
import { generateScore } from "./generate.js";
import { evaluateContourMotionGate, evaluateReviewGatePolicy } from "./review-gate.js";

test("review gate policy keeps hard constraints as failures", () => {
  const diagnostics = cloneDiagnostics(
    generateScore({ seed: "fugue-smoke", lengthTicks: REVIEW_LENGTH_TICKS, selectionModel: "baseline" }).diagnostics,
  );
  diagnostics.rangeViolations = 1;
  diagnostics.voiceCrossings = 1;

  const policy = evaluateReviewGatePolicy("fugue-smoke", diagnostics);

  assert.equal(policy.hardConstraintPassed, false);
  assert.equal(policy.adoptionReady, false);
  assert.deepEqual(
    policy.hardFailures.map((finding) => finding.metric),
    ["rangeViolations", "voiceCrossings"],
  );
  assert.ok(policy.hardFailures.every((finding) => finding.policy === "hard-failure"));
  assert.ok(policy.hardFailures.every((finding) => finding.source === "diagnostics"));
});

test("review gate policy preserves review-signal breaches without blocking hard-constraint readiness", () => {
  const diagnostics = cloneDiagnostics(
    generateScore({ seed: "fugue-smoke", lengthTicks: REVIEW_LENGTH_TICKS, selectionModel: "baseline" }).diagnostics,
  );
  diagnostics.rhythmicIndependenceScore = 0;
  diagnostics.samePitchOverlapCount = MELODY_TEXTURE_DIAGNOSTICS_PROFILE.maxSamePitchOverlapCount + 1;
  diagnostics.severeEntryIntervalCount = MELODY_TEXTURE_DIAGNOSTICS_PROFILE.maxSevereEntryIntervalCount + 1;
  diagnostics.leapRecoveryMisses = MELODY_TEXTURE_DIAGNOSTICS_PROFILE.maxLeapRecoveryMisses + 1;
  diagnostics.soloTexture = {
    ...diagnostics.soloTexture,
    unsupportedSoloRunCount: MELODY_TEXTURE_DIAGNOSTICS_PROFILE.maxUnsupportedSoloRunCount + 1,
  };
  diagnostics.pitchContourMotion = {
    ...diagnostics.pitchContourMotion,
    fourBeat: {
      ...diagnostics.pitchContourMotion.fourBeat,
      bassUpperSameDirectionRatio: CONTOUR_MOTION_DIAGNOSTICS_PROFILE.maxFourBeatBassUpperSameDirectionRatio + 0.1,
    },
  };

  const contourMotionGate = evaluateContourMotionGate("fugue-smoke", diagnostics);
  const policy = evaluateReviewGatePolicy("fugue-smoke", diagnostics);

  assert.equal(contourMotionGate.passed, false);
  assert.equal(policy.hardConstraintPassed, true);
  assert.equal(policy.adoptionReady, true);
  assert.equal(policy.hardFailures.length, 0);
  assert.ok(policy.reviewSignals.length >= 5);
  assert.ok(policy.reviewSignals.every((finding) => finding.policy === "review-required"));
  assert.ok(policy.reviewSignals.some((finding) => finding.metric === "samePitchOverlapCount"));
  assert.ok(policy.reviewSignals.some((finding) => finding.metric === "severeEntryIntervalCount"));
  assert.ok(policy.reviewSignals.some((finding) => finding.metric === "leapRecoveryMisses"));
  assert.ok(policy.reviewSignals.some((finding) => finding.metric === "unsupportedSoloRunCount"));
  assert.ok(policy.reviewSignals.some((finding) => finding.metric === "fourBeatBassUpperSameDirectionRatio"));
  assert.equal(policy.contourMotionGate.passed, false);
  assert.equal(policy.policy.schemaVersion, 3);
  assert.equal(policy.policy.name, "review-gate-policy");
});

function cloneDiagnostics(diagnostics: GenerationDiagnostics): GenerationDiagnostics {
  return structuredClone(diagnostics);
}
