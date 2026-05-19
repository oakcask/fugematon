import assert from "node:assert/strict";
import test from "node:test";
import { PHASE_5_LENGTH_TICKS } from "./constants.js";
import { generateScore } from "./generate.js";
import { assertPhase13ReviewPreconditions, PHASE_13_FOCUSED_SEEDS } from "./generate-phase-review-test-helpers.js";

test("generateScore keeps phase-13 focused seeds ready for review-only diagnostics", () => {
  assertPhase13ReviewPreconditions(PHASE_13_FOCUSED_SEEDS);
});

test("generateScore exposes phase-13 quality vector diagnostics", () => {
  const output = generateScore({
    seed: "fugue-smoke",
    lengthTicks: PHASE_5_LENGTH_TICKS,
    selectionModel: "phase10-section-local-planner",
  });
  const qualityVector = output.diagnostics.qualityVector;

  assert.equal(qualityVector.schemaVersion, 1);
  assert.equal(qualityVector.modelVersion, 1);
  assert.equal(qualityVector.voicePairUnisons.length, 6);
  assert.equal(qualityVector.sopranoRepeatedNotePressure.voice, "soprano");
  assert.ok(qualityVector.entrySevereIntervals.length > 0);
  assert.ok(qualityVector.axes.some((axis) => axis.axis === "exactSamePitchUnisonDuration"));
  assert.ok(qualityVector.axes.some((axis) => axis.axis === "sopranoRepeatedNotePressure"));
  assert.ok(qualityVector.axes.every((axis) => Number.isFinite(axis.normalizedValue)));
  assert.ok(
    qualityVector.localSentinels.every(
      (sentinel) => sentinel.severity === "review-required" && sentinel.symptom.length > 0,
    ),
  );
});

test("generateScore keeps phase-13 local sentinels traceable to selected candidate sections", () => {
  const output = generateScore({
    seed: "fugue-smoke",
    lengthTicks: PHASE_5_LENGTH_TICKS,
    selectionModel: "phase10-section-local-planner",
  });
  const selectedSections = output.diagnostics.selectedCandidateEvaluations.flatMap(
    (evaluation) => evaluation.explanations.sections,
  );

  assert.ok(output.diagnostics.qualityVector.localSentinels.length > 0);
  const firstContinuationTick = Math.min(...selectedSections.map((section) => section.startTick));
  const continuationSentinels = output.diagnostics.qualityVector.localSentinels.filter(
    (sentinel) => sentinel.startTick >= firstContinuationTick,
  );

  assert.ok(continuationSentinels.length > 0);
  for (const sentinel of continuationSentinels) {
    assert.ok(
      selectedSections.some(
        (section) =>
          sentinel.startTick >= section.startTick &&
          sentinel.startTick < section.startTick + section.durationTicks &&
          (sentinel.sectionRole === "mixed" || sentinel.sectionRole === section.state),
      ),
    );
  }
});
