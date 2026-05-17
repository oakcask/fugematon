import assert from "node:assert/strict";
import test from "node:test";
import { PHASE_5_LENGTH_TICKS, PHASE_6_DIAGNOSTICS_PROFILE, PHASE_7_DIAGNOSTICS_PROFILE } from "./constants.js";
import type { GenerationDiagnostics } from "./events.js";
import { generateScore } from "./generate.js";
import { evaluatePhase7BGatePolicy, evaluatePhase7Diagnostics } from "./review-gate.js";

test("phase-7B policy keeps hard constraints as failures", () => {
  const diagnostics = cloneDiagnostics(
    generateScore({ seed: "fugue-smoke", lengthTicks: PHASE_5_LENGTH_TICKS }).diagnostics,
  );
  diagnostics.rangeViolations = 1;
  diagnostics.voiceCrossings = 1;

  const policy = evaluatePhase7BGatePolicy("fugue-smoke", diagnostics);

  assert.equal(policy.hardConstraintPassed, false);
  assert.equal(policy.phase8Ready, false);
  assert.deepEqual(
    policy.hardFailures.map((finding) => finding.metric),
    ["rangeViolations", "voiceCrossings"],
  );
  assert.ok(policy.hardFailures.every((finding) => finding.policy === "hard-failure"));
  assert.ok(policy.hardFailures.every((finding) => finding.source === "diagnostics"));
});

test("phase-7B policy preserves review-signal breaches without blocking hard-constraint readiness", () => {
  const diagnostics = cloneDiagnostics(
    generateScore({ seed: "fugue-smoke", lengthTicks: PHASE_5_LENGTH_TICKS }).diagnostics,
  );
  diagnostics.rhythmicIndependenceScore = 0;
  diagnostics.samePitchOverlapCount = PHASE_6_DIAGNOSTICS_PROFILE.maxSamePitchOverlapCount + 1;
  diagnostics.severeEntryIntervalCount = PHASE_6_DIAGNOSTICS_PROFILE.maxSevereEntryIntervalCount + 1;
  diagnostics.leapRecoveryMisses = PHASE_6_DIAGNOSTICS_PROFILE.maxLeapRecoveryMisses + 1;
  diagnostics.soloTexture = {
    ...diagnostics.soloTexture,
    unsupportedSoloRunCount: PHASE_6_DIAGNOSTICS_PROFILE.maxUnsupportedSoloRunCount + 1,
  };
  diagnostics.pitchContourMotion = {
    ...diagnostics.pitchContourMotion,
    fourBeat: {
      ...diagnostics.pitchContourMotion.fourBeat,
      bassUpperSameDirectionRatio: PHASE_7_DIAGNOSTICS_PROFILE.maxFourBeatBassUpperSameDirectionRatio + 0.1,
    },
  };

  const legacyGate = evaluatePhase7Diagnostics("fugue-smoke", diagnostics);
  const policy = evaluatePhase7BGatePolicy("fugue-smoke", diagnostics);

  assert.equal(legacyGate.passed, false);
  assert.equal(policy.hardConstraintPassed, true);
  assert.equal(policy.phase8Ready, true);
  assert.equal(policy.hardFailures.length, 0);
  assert.ok(policy.reviewSignals.length >= 6);
  assert.ok(policy.reviewSignals.every((finding) => finding.policy === "review-required"));
  assert.ok(policy.reviewSignals.some((finding) => finding.metric === "rhythmicIndependenceScore"));
  assert.ok(policy.reviewSignals.some((finding) => finding.metric === "samePitchOverlapCount"));
  assert.ok(policy.reviewSignals.some((finding) => finding.metric === "severeEntryIntervalCount"));
  assert.ok(policy.reviewSignals.some((finding) => finding.metric === "leapRecoveryMisses"));
  assert.ok(policy.reviewSignals.some((finding) => finding.metric === "unsupportedSoloRunCount"));
  assert.ok(policy.reviewSignals.some((finding) => finding.metric === "fourBeatBassUpperSameDirectionRatio"));
  assert.equal(policy.legacyPhase7Gate.passed, false);
  assert.equal(policy.policy.schemaVersion, 1);
  assert.equal(policy.policy.phase, "phase-7B");
});

function cloneDiagnostics(diagnostics: GenerationDiagnostics): GenerationDiagnostics {
  return structuredClone(diagnostics);
}
