import assert from "node:assert/strict";
import test from "node:test";
import { PHASE_5_LENGTH_TICKS } from "./constants.js";
import { generateScore } from "./generate.js";
import { assertPhase13ReviewPreconditions, PHASE_13_FOCUSED_SEEDS } from "./generate-phase-review-test-helpers.js";

test("generateScore keeps phase-13 focused seed batch B1 ready for review-only diagnostics", () => {
  assertPhase13ReviewPreconditions(PHASE_13_FOCUSED_SEEDS.slice(4, 6));
});

test("generateScore exposes phase-13 quality vector diagnostics", () => {
  const output = generateScore({
    seed: "fugue-smoke",
    lengthTicks: PHASE_5_LENGTH_TICKS,
    selectionModel: "section-local-planner",
  });
  const qualityVector = output.diagnostics.qualityVector;

  assert.equal(qualityVector.schemaVersion, 4);
  assert.equal(qualityVector.modelVersion, 4);
  assert.equal(qualityVector.voicePairUnisons.length, 6);
  assert.equal(qualityVector.voicePairFunctions.length, 6);
  assert.ok(qualityVector.voicePairSpans.length > 0);
  assert.equal(qualityVector.sopranoRepeatedNotePressure.voice, "soprano");
  assert.ok(qualityVector.entrySevereIntervals.length > 0);
  assert.equal(qualityVector.entrySonorities.length, qualityVector.entrySevereIntervals.length);
  assert.ok(qualityVector.entryFormulaRecurrences.every((summary) => summary.recurrenceCount >= 2));
  assert.ok(qualityVector.fragmentFunctionEvidence.uniqueFunctionCount >= 0);
  assert.ok(qualityVector.fragmentFunctionEvidence.transformationClaims.length >= 0);
  assert.ok(qualityVector.counterSubjectWindows.length > 0);
  assert.ok(qualityVector.metricExplanations.length >= 3);
  assert.equal(qualityVector.scoreBeautyEvidence.schemaVersion, 1);
  assert.ok(qualityVector.scoreBeautyEvidence.entryFormulaNovelty.totalFormulaCount >= 0);
  assert.ok(qualityVector.scoreBeautyEvidence.lineAgency.agencyRatio >= 0);
  assert.ok(qualityVector.axes.some((axis) => axis.axis === "exactSamePitchUnisonDuration"));
  assert.ok(qualityVector.axes.some((axis) => axis.axis === "sopranoRepeatedNotePressure"));
  assert.ok(qualityVector.axes.every((axis) => Number.isFinite(axis.normalizedValue)));
  assert.ok(
    qualityVector.localSentinels.every(
      (sentinel) => sentinel.severity === "review-required" && sentinel.symptom.length > 0,
    ),
  );
});
