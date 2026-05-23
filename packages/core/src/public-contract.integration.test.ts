import assert from "node:assert/strict";
import test from "node:test";
import type { CandidateEvaluation, MetaEvent, NoteEvent, ScoreDimension } from "./index.js";
import {
  COUNTERPOINT_HARMONY_DIAGNOSTICS_PROFILE,
  DEFAULT_SELECTION_MODEL,
  GENERATOR_VERSION,
  generateScore,
  REVIEW_LENGTH_TICKS,
  TICKS_PER_QUARTER,
  VOICES,
} from "./index.js";

test("public API emits the stable score metadata envelope", () => {
  const output = generateScore({
    seed: "public-contract",
    lengthTicks: REVIEW_LENGTH_TICKS,
    parameters: { density: 0.25, subjectPresence: 1 },
  });
  const metadata = output.events.filter((event): event is MetaEvent => event.kind === "meta");
  const notes = output.events.filter((event): event is NoteEvent => event.kind === "note");
  const firstMetadataTypes = metadata.slice(0, 7).map((event) => event.type);
  const scoreEnd = output.events.at(-1);
  const generatorVersion = metadata.find(
    (event): event is Extract<MetaEvent, { type: "generator-version" }> => event.type === "generator-version",
  );
  const timebase = metadata.find(
    (event): event is Extract<MetaEvent, { type: "timebase" }> => event.type === "timebase",
  );
  const parameterChange = metadata.find(
    (event): event is Extract<MetaEvent, { type: "parameter-change" }> => event.type === "parameter-change",
  );

  assert.deepEqual(firstMetadataTypes, [
    "generator-version",
    "timebase",
    "tempo-change",
    "time-signature",
    "key-signature",
    "parameter-change",
    "state-change",
  ]);
  assert.equal(generatorVersion?.tick, 0);
  assert.equal(generatorVersion?.payload.version, GENERATOR_VERSION);
  assert.equal(timebase?.tick, 0);
  assert.equal(timebase?.payload.ticksPerQuarter, TICKS_PER_QUARTER);
  assert.equal(parameterChange?.payload.parameters.strictness, 0.8);
  assert.equal(parameterChange?.payload.parameters.density, 0.25);
  assert.equal(parameterChange?.payload.parameters.subjectPresence, 1);
  assert.equal(scoreEnd?.kind, "meta");
  assert.equal(scoreEnd?.type, "score-end");
  assert.equal(scoreEnd?.tick, output.diagnostics.generatedUntilTick);
  assert.equal(output.diagnostics.eventCount, output.events.length);
  assert.equal(output.diagnostics.noteCount, notes.length);
  assert.equal(output.diagnostics.candidatePoolOracle.schemaVersion, 5);
  assert.ok(output.diagnostics.candidatePoolOracle.sectionCount >= 0);
  assert.ok(output.diagnostics.candidatePoolOracle.phraseFamilyCandidateCount >= 0);
  assert.equal(output.diagnostics.generatorVersion, GENERATOR_VERSION);
  assert.equal(output.diagnostics.selectionModel, DEFAULT_SELECTION_MODEL);
  assert.equal(output.diagnostics.seed, "public-contract");
  assert.equal(output.diagnostics.lengthTicks, REVIEW_LENGTH_TICKS);
});

test("public API keeps emitted note events within the score contract", () => {
  const output = generateScore({ seed: "event-shape-contract", lengthTicks: REVIEW_LENGTH_TICKS });
  const notes = output.events.filter((event): event is NoteEvent => event.kind === "note");

  assert.ok(notes.length > 0);
  assert.deepEqual(new Set(notes.map((note) => note.voice)), new Set(VOICES));

  for (const note of notes) {
    assert.ok(Number.isSafeInteger(note.startTick));
    assert.ok(Number.isSafeInteger(note.durationTicks));
    assert.ok(note.startTick >= 0);
    assert.ok(note.durationTicks > 0);
    assert.ok(note.startTick + note.durationTicks <= output.diagnostics.generatedUntilTick);
    assert.ok(note.pitch >= 0 && note.pitch <= 127);
    assert.ok(note.velocity >= 0 && note.velocity <= 127);
  }
});

test("public diagnostics expose finite candidate score dimensions", () => {
  const output = generateScore({ seed: "diagnostics-contract", lengthTicks: REVIEW_LENGTH_TICKS });
  const selectedEvaluation = output.diagnostics.selectedCandidateEvaluations[0];

  assert.ok(selectedEvaluation !== undefined);
  assertCandidateEvaluation(selectedEvaluation);
  assert.equal(
    Object.hasOwn(selectedEvaluation.dimensions.texture.features, "phase11AdjacentVoiceOverOctaveCount"),
    false,
  );
  assert.equal(
    Object.hasOwn(selectedEvaluation.dimensions.texture.features, "phase11FunctionalThinningNonCadentialRunCount"),
    false,
  );
  assert.equal(
    Object.hasOwn(selectedEvaluation.dimensions.form.features, "phase11StateGrammarMostRepeatedPatternCount"),
    false,
  );
  assert.equal(output.diagnostics.rangeViolations, COUNTERPOINT_HARMONY_DIAGNOSTICS_PROFILE.rangeViolations);
  assert.equal(output.diagnostics.voiceCrossings, COUNTERPOINT_HARMONY_DIAGNOSTICS_PROFILE.voiceCrossings);
  assert.equal(
    output.diagnostics.subjectIdentityViolations,
    COUNTERPOINT_HARMONY_DIAGNOSTICS_PROFILE.subjectIdentityViolations,
  );
  assert.equal(output.diagnostics.answerPlanViolations, COUNTERPOINT_HARMONY_DIAGNOSTICS_PROFILE.answerPlanViolations);
  assert.equal(
    output.diagnostics.keyMetadataMismatches,
    COUNTERPOINT_HARMONY_DIAGNOSTICS_PROFILE.keyMetadataMismatches,
  );
  assert.equal(output.diagnostics.stepwisePattern.degreePatternLength, 4);
  assert.ok(output.diagnostics.stepwisePattern.roles.length > 0);
  assert.ok(output.diagnostics.stepwisePattern.sections.length > 0);
  assert.equal(output.diagnostics.texturePlanningReview.schemaVersion, 1);
  assert.equal(output.diagnostics.texturePlanningReview.adjacentVoiceIntervals.length, 3);
  assert.equal(output.diagnostics.texturePlanningReview.registerSpans.length, VOICES.length);
  assert.ok(output.diagnostics.texturePlanningReview.entryPatternFamilies.length > 0);
  assert.ok(output.diagnostics.texturePlanningReview.functionalThinning.unsupportedRunCount >= 0);
  assert.ok(output.diagnostics.texturePlanningReview.metricalHarmony.strongBeatCheckpointCount > 0);
  assert.equal(output.diagnostics.phraseRepetitionReview.schemaVersion, 1);
  assert.ok(output.diagnostics.phraseRepetitionReview.subjectStemFamilies.length > 0);
  assert.ok(output.diagnostics.phraseRepetitionReview.answerTransformFamilies.length > 0);
  assert.ok(output.diagnostics.phraseRepetitionReview.phraseFunctions.length > 0);
  assert.ok(output.diagnostics.phraseRepetitionReview.sectionStatePatterns.topPatterns.length > 0);
  assert.equal(output.diagnostics.entryBoundaryContinuity.schemaVersion, 4);
  assert.equal(typeof output.diagnostics.entryBoundaryContinuity.firstBassEntrySynchronizedReset, "boolean");
  assert.equal(output.diagnostics.entryBoundaryContinuity.firstBassEntryWindow?.entryVoice, "bass");
  assert.equal(typeof output.diagnostics.entryBoundaryContinuity.importantEntryWindowCount, "number");
  assert.equal(typeof output.diagnostics.entryBoundaryContinuity.nonBassEntryWindowCount, "number");
  assert.ok(Array.isArray(output.diagnostics.entryBoundaryContinuity.firstBassEntryWindow?.outsideEndedAtEntryVoices));
  assert.equal(typeof output.diagnostics.entryBoundaryContinuity.synchronizedResetCount, "number");
  assert.equal(typeof output.diagnostics.entryBoundaryContinuity.oneVoiceCarryWithOutsideResetCount, "number");
  assert.ok(Array.isArray(output.diagnostics.entryBoundaryContinuity.windows));
  assert.ok(
    output.diagnostics.entryBoundaryContinuity.windows.every(
      (window) => Number.isSafeInteger(window.entryOrderIndex) && Array.isArray(window.alreadyEnteredVoices),
    ),
  );
  assert.equal(output.diagnostics.bassAnswerTailTexture.schemaVersion, 1);
  assert.equal(typeof output.diagnostics.bassAnswerTailTexture.reviewRequired, "boolean");
  assert.equal(typeof output.diagnostics.bassAnswerTailTexture.bassOnlyFreeCounterpointWindowCount, "number");
  assert.ok(Array.isArray(output.diagnostics.bassAnswerTailTexture.windows));
  assert.equal(output.diagnostics.localSentinelCandidateTrace.schemaVersion, 1);
  assert.ok(Array.isArray(output.diagnostics.localSentinelCandidateTrace.sentinelCandidateLinks));
  assert.equal(output.diagnostics.phraseConvergenceReview.schemaVersion, 1);
  assert.equal(output.diagnostics.phraseConvergenceReview.selectionModel, output.diagnostics.selectionModel);
  assert.ok(Array.isArray(output.diagnostics.phraseConvergenceReview.findings));
  assert.equal(typeof output.diagnostics.phraseConvergenceReview.reviewRequired, "boolean");
  assert.equal(output.diagnostics.phraseDevelopmentReview.schemaVersion, 1);
  assert.equal(typeof output.diagnostics.phraseDevelopmentReview.reviewRequired, "boolean");
  assert.equal(typeof output.diagnostics.phraseDevelopmentReview.mechanicalReuseWindowCount, "number");
  assert.ok(Array.isArray(output.diagnostics.phraseDevelopmentReview.windows));
  assert.equal(output.diagnostics.dissonanceTriage.schemaVersion, 1);
  assert.equal(typeof output.diagnostics.dissonanceTriage.weakPassingSemitoneClashTicks, "number");
  assert.equal(typeof output.diagnostics.dissonanceTriage.entryAdjacentSecondFrictionCount, "number");
  assert.ok(Array.isArray(output.diagnostics.dissonanceTriage.windows));
  assert.equal(output.diagnostics.scoreWindowAcceptance.schemaVersion, 1);
  assert.equal(typeof output.diagnostics.scoreWindowAcceptance.importantEntryWindowCount, "number");
  assert.equal(typeof output.diagnostics.scoreWindowAcceptance.counterSubjectWindowCount, "number");
  assert.equal(typeof output.diagnostics.scoreWindowAcceptance.generatorResponseWindowCount, "number");
  assert.ok(Array.isArray(output.diagnostics.scoreWindowAcceptance.windows));
  assert.equal(Object.hasOwn(output.diagnostics, "phase11Review"), false);
  assert.equal(Object.hasOwn(output.diagnostics, "phase12Review"), false);
  assert.equal(Object.hasOwn(output.diagnostics, "phase13QReview"), false);
  assert.equal(Object.hasOwn(output.diagnostics, "phase13RReview"), false);
  assert.equal(Object.hasOwn(output.diagnostics, "phase13ZReview"), false);
  assert.equal(Object.hasOwn(output.diagnostics, "phase14DissonanceTriage"), false);
  assert.equal(Object.hasOwn(output.diagnostics, "phase14ScoreWindowAcceptance"), false);
  assert.equal(Object.hasOwn(output.diagnostics.qualityVector, "phase13VReview"), false);
  assert.equal(output.diagnostics.lowerVoiceVocality.schemaVersion, 1);
  assert.ok(output.diagnostics.lowerVoiceVocality.score >= 0);
  assert.ok(output.diagnostics.lowerVoiceVocality.score <= 1);
  assert.equal(output.diagnostics.lowerVoiceVocality.voices.length, 2);

  for (const issue of output.diagnostics.issues) {
    assert.equal(issue.severity, "warning");
    assert.ok(Number.isSafeInteger(issue.tick));
    assert.ok(issue.voices.length > 0);
    assert.ok(issue.message.length > 0);
  }
});

test("public subject entry diagnostics correspond to emitted entry notes", () => {
  const output = generateScore({ seed: "entry-contract", lengthTicks: REVIEW_LENGTH_TICKS });
  const notes = output.events.filter((event): event is NoteEvent => event.kind === "note");

  assert.ok(output.diagnostics.subjectEntries.length > 4);

  for (const entry of output.diagnostics.subjectEntries) {
    const entryNotes = notes
      .filter(
        (note) =>
          note.voice === entry.voice &&
          note.role === entry.form &&
          note.startTick >= entry.startTick &&
          note.startTick < entry.startTick + TICKS_PER_QUARTER * 8,
      )
      .slice(0, entry.expectedDegreePattern.length);

    assert.equal(entry.expectedDegreePattern.length, entry.actualPitchClassSequence.length);
    assert.equal(entryNotes.length, entry.expectedDegreePattern.length);
    assert.deepEqual(
      entryNotes.map((note) => positiveModulo(note.pitch, 12)),
      entry.actualPitchClassSequence,
    );
  }
});

function assertCandidateEvaluation(evaluation: CandidateEvaluation): void {
  assert.equal(evaluation.featureVersion, 6);
  assert.equal(evaluation.evaluationModelVersion, 12);
  assert.ok(Number.isFinite(evaluation.totalCost));
  assert.ok(evaluation.explanations.entries.length > 0);
  assert.ok(evaluation.explanations.voicePairs.length > 0);
  assert.ok(evaluation.explanations.voices.length > 0);
  assert.ok(evaluation.explanations.sections.length > 0);
  assert.deepEqual(Object.keys(evaluation.dimensions), [
    "counterpoint",
    "melody",
    "texture",
    "subjectClarity",
    "harmony",
    "form",
  ]);

  for (const dimension of Object.values(evaluation.dimensions)) {
    assertScoreDimension(dimension);
  }
}

function assertScoreDimension(dimension: ScoreDimension): void {
  assert.ok(Number.isFinite(dimension.cost));
  assert.ok(Number.isFinite(dimension.reward));
  for (const value of Object.values(dimension.features)) {
    assert.ok(Number.isFinite(value));
  }
}

function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}
