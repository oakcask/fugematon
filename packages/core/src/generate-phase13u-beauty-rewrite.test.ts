import assert from "node:assert/strict";
import test from "node:test";
import { PHASE_5_LENGTH_TICKS } from "./constants.js";
import { generateScore } from "./generate.js";

const ENTRY_FORMULA_REVIEW_SEEDS = [
  "modal-cadence",
  "circle-fifths",
  "tight-stretto",
  "contrary-motion",
  "dense-modal",
] as const;

const VOICE_INDEPENDENCE_REVIEW_SEEDS = ["modal-dorian", "long-arc", "bach-001", "dark-episode"] as const;

const FRAGMENT_TRANSFORMATION_REVIEW_SEEDS = [
  "quiet-cadence",
  "angular-answer",
  "modal-cadence",
  "dense-modal",
  "dark-episode",
  "ornament-test",
] as const;

const COUNTER_SUBJECT_REVIEW_SEEDS = [
  "modal-answer",
  "dense-modal",
  "modal-cadence",
  "angular-answer",
  "modal-dorian",
] as const;

test("Phase 13U entry formula review seeds expose score-window sonority evidence", () => {
  const recurrentFormulaKeys = new Map<string, number>();

  for (const seed of ENTRY_FORMULA_REVIEW_SEEDS) {
    const output = generateScore({ seed, lengthTicks: PHASE_5_LENGTH_TICKS });
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

test("Phase 13U voice independence review seeds keep voice-pair local evidence reviewable", () => {
  for (const seed of VOICE_INDEPENDENCE_REVIEW_SEEDS) {
    const output = generateScore({ seed, lengthTicks: PHASE_5_LENGTH_TICKS });
    const vector = output.diagnostics.qualityVector;
    const pitchClassAxis = vector.axes.find((axis) => axis.axis === "pitchClassUnisonDuration");
    const lockstepAxis = vector.axes.find((axis) => axis.axis === "durationBasedLockstep");

    assert.equal(pitchClassAxis?.status, "review-required", `${seed} should keep pitch-class unison review signal`);
    assert.equal(lockstepAxis?.status, "review-required", `${seed} should keep lockstep review signal`);
    assert.ok(vector.voicePairUnisons.every((summary) => summary.activeDurationTicks >= 0));
    assert.ok(
      vector.voicePairFunctions.some(
        (summary) =>
          summary.mechanicalCouplingTicks +
            summary.functionalReinforcementTicks +
            summary.pitchClassColorDoublingTicks >
          0,
      ),
    );
    assert.ok(
      vector.localSentinels
        .filter((sentinel) => sentinel.kind === "long-pitch-class-unison")
        .every((sentinel) => sentinel.voicePair !== undefined && sentinel.durationTicks > 0),
    );
  }
});

test("Phase 13U fragment review seeds expose transformation evidence instead of only aggregate counts", () => {
  for (const seed of FRAGMENT_TRANSFORMATION_REVIEW_SEEDS) {
    const output = generateScore({ seed, lengthTicks: PHASE_5_LENGTH_TICKS });
    const evidence = output.diagnostics.qualityVector.fragmentFunctionEvidence;

    assert.ok(evidence.fragmentSectionCount > 0, `${seed} should include fragment sections`);
    assert.ok(evidence.uniqueFunctionCount > 0);
    assert.ok(evidence.topFunctionShare > 0 && evidence.topFunctionShare <= 1);
    assert.ok(
      evidence.topFunctions.every((summary) => {
        const [transform, sequencePattern, cadenceKind, mode] = summary.functionKey.split(":");
        return (
          transform !== undefined &&
          sequencePattern !== undefined &&
          cadenceKind !== undefined &&
          mode !== undefined &&
          summary.count > 0 &&
          summary.share > 0
        );
      }),
    );
  }
});

test("Phase 13U modal counter-subject review seeds expose rhythm, contour, and collision windows", () => {
  for (const seed of COUNTER_SUBJECT_REVIEW_SEEDS) {
    const output = generateScore({ seed, lengthTicks: PHASE_5_LENGTH_TICKS });
    const windows = output.diagnostics.qualityVector.counterSubjectWindows.filter(
      (window) => window.counterSubjectVoice !== undefined,
    );

    assert.ok(windows.length >= 3, `${seed} should expose counter-subject windows near entries`);
    assert.ok(windows.some((window) => window.rhythmPattern.length >= 4));
    assert.ok(windows.some((window) => window.contourClass.length >= 3));
    assert.ok(windows.every((window) => window.supportCollisionCount >= 0));
  }
});
