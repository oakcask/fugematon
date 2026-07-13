import assert from "node:assert/strict";
import { REVIEW_LENGTH_TICKS } from "./constants.js";
import {
  assertQualityVectorReviewPreconditions,
  QUALITY_VECTOR_REVIEW_SEEDS,
} from "./generate-quality-review-test-helpers.js";
import { cachedGenerateScore as generateScore } from "./generate-test-helpers.js";
import { reviewTest } from "./test-profile.js";

reviewTest("generateScore keeps quality-vector review seed batch B ready for review-only diagnostics", () => {
  assertQualityVectorReviewPreconditions(QUALITY_VECTOR_REVIEW_SEEDS.slice(4));
});

reviewTest("generateScore exposes quality vector diagnostics", () => {
  const output = generateScore({
    seed: "fugue-smoke",
    lengthTicks: REVIEW_LENGTH_TICKS,
    selectionModel: "section-local-planner",
  });
  const qualityVector = output.diagnostics.qualityVector;

  assert.equal(qualityVector.schemaVersion, 5);
  assert.equal(qualityVector.modelVersion, 5);
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
  assert.equal(qualityVector.harmonicSonorities.schemaVersion, 1);
  assert.ok(qualityVector.harmonicSonorities.focusedWindowCount > 0);
  assert.ok(Array.isArray(qualityVector.harmonicSonorities.windows));
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

reviewTest("generateScore keeps thin bass-answer tail support review-visible", () => {
  const output = generateScore({
    seed: "fugue-smoke",
    lengthTicks: 7680,
    selectionModel: "section-local-planner",
  });
  const sonority = output.diagnostics.qualityVector.harmonicSonorities;
  const bassTail = output.diagnostics.bassAnswerTailTexture;

  assert.equal(bassTail.reviewRequired, true);
  assert.ok(bassTail.zeroOutsideVoiceWindowCount > 0);
  assert.ok(bassTail.windows.some((window) => window.classification === "review-required"));
  assert.ok(sonority.generatorResponseWindowCount > 0);
  assert.ok(
    sonority.windows.some(
      (window) =>
        window.classification === "non-chord-structural-support" &&
        window.response === "generator-response-required" &&
        window.structuralIntentMismatchCount > 0,
    ),
  );
  assert.ok(
    output.diagnostics.scoreWindowAcceptance.windows.some(
      (window) => window.kind === "harmonic-sonority" && window.response === "generator-response-required",
    ),
  );
});
