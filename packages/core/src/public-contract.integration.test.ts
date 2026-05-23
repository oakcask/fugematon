import assert from "node:assert/strict";
import test from "node:test";
import type { CandidateEvaluation, MetaEvent, NoteEvent, ScoreDimension } from "./index.js";
import {
  DEFAULT_SELECTION_MODEL,
  GENERATOR_VERSION,
  generateScore,
  PHASE_5_DIAGNOSTICS_PROFILE,
  PHASE_5_LENGTH_TICKS,
  TICKS_PER_QUARTER,
  VOICES,
} from "./index.js";

test("public API emits the stable score metadata envelope", () => {
  const output = generateScore({
    seed: "public-contract",
    lengthTicks: PHASE_5_LENGTH_TICKS,
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
  assert.ok(output.diagnostics.candidatePoolOracle.phase12PhraseFamilyCandidateCount >= 0);
  assert.equal(output.diagnostics.generatorVersion, GENERATOR_VERSION);
  assert.equal(output.diagnostics.selectionModel, DEFAULT_SELECTION_MODEL);
  assert.equal(output.diagnostics.seed, "public-contract");
  assert.equal(output.diagnostics.lengthTicks, PHASE_5_LENGTH_TICKS);
});

test("public API keeps emitted note events within the score contract", () => {
  const output = generateScore({ seed: "event-shape-contract", lengthTicks: PHASE_5_LENGTH_TICKS });
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
  const output = generateScore({ seed: "diagnostics-contract", lengthTicks: PHASE_5_LENGTH_TICKS });
  const selectedEvaluation = output.diagnostics.selectedCandidateEvaluations[0];

  assert.ok(selectedEvaluation !== undefined);
  assertCandidateEvaluation(selectedEvaluation);
  assert.equal(
    selectedEvaluation.dimensions.texture.features.wideAdjacentVoiceSpacingCount,
    selectedEvaluation.dimensions.texture.features.phase11AdjacentVoiceOverOctaveCount,
  );
  assert.equal(
    selectedEvaluation.dimensions.texture.features.nonCadentialFunctionalThinningRunCount,
    selectedEvaluation.dimensions.texture.features.phase11FunctionalThinningNonCadentialRunCount,
  );
  assert.equal(
    selectedEvaluation.dimensions.form.features.stateGrammarMostRepeatedPatternCount,
    selectedEvaluation.dimensions.form.features.phase11StateGrammarMostRepeatedPatternCount,
  );
  assert.equal(output.diagnostics.rangeViolations, PHASE_5_DIAGNOSTICS_PROFILE.rangeViolations);
  assert.equal(output.diagnostics.voiceCrossings, PHASE_5_DIAGNOSTICS_PROFILE.voiceCrossings);
  assert.equal(output.diagnostics.subjectIdentityViolations, PHASE_5_DIAGNOSTICS_PROFILE.subjectIdentityViolations);
  assert.equal(output.diagnostics.answerPlanViolations, PHASE_5_DIAGNOSTICS_PROFILE.answerPlanViolations);
  assert.equal(output.diagnostics.keyMetadataMismatches, PHASE_5_DIAGNOSTICS_PROFILE.keyMetadataMismatches);
  assert.equal(output.diagnostics.stepwisePattern.degreePatternLength, 4);
  assert.ok(output.diagnostics.stepwisePattern.roles.length > 0);
  assert.ok(output.diagnostics.stepwisePattern.sections.length > 0);
  assert.equal(output.diagnostics.texturePlanningReview, output.diagnostics.phase11Review);
  assert.equal(output.diagnostics.phase11Review.schemaVersion, 1);
  assert.equal(output.diagnostics.phase11Review.adjacentVoiceIntervals.length, 3);
  assert.equal(output.diagnostics.phase11Review.registerSpans.length, VOICES.length);
  assert.ok(output.diagnostics.phase11Review.entryPatternFamilies.length > 0);
  assert.ok(output.diagnostics.phase11Review.functionalThinning.unsupportedRunCount >= 0);
  assert.ok(output.diagnostics.phase11Review.metricalHarmony.strongBeatCheckpointCount > 0);
  assert.equal(output.diagnostics.phraseRepetitionReview, output.diagnostics.phase12Review);
  assert.equal(output.diagnostics.phase12Review.schemaVersion, 1);
  assert.ok(output.diagnostics.phase12Review.subjectStemFamilies.length > 0);
  assert.ok(output.diagnostics.phase12Review.answerTransformFamilies.length > 0);
  assert.ok(output.diagnostics.phase12Review.phraseFunctions.length > 0);
  assert.ok(output.diagnostics.phase12Review.sectionStatePatterns.topPatterns.length > 0);
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
  assert.equal(output.diagnostics.qualityVector.scoreBeautyEvidence, output.diagnostics.qualityVector.phase13VReview);
  assert.equal(output.diagnostics.localSentinelCandidateTrace, output.diagnostics.phase13QReview);
  assert.equal(output.diagnostics.phase13QReview.schemaVersion, 1);
  assert.ok(Array.isArray(output.diagnostics.phase13QReview.sentinelCandidateLinks));
  assert.equal(output.diagnostics.phraseConvergenceReview, output.diagnostics.phase13RReview);
  assert.equal(output.diagnostics.phase13RReview.schemaVersion, 1);
  assert.equal(output.diagnostics.phase13RReview.selectionModel, output.diagnostics.selectionModel);
  assert.ok(Array.isArray(output.diagnostics.phase13RReview.findings));
  assert.equal(typeof output.diagnostics.phase13RReview.reviewRequired, "boolean");
  assert.equal(output.diagnostics.phraseDevelopmentReview, output.diagnostics.phase13ZReview);
  assert.equal(output.diagnostics.phase13ZReview.schemaVersion, 1);
  assert.equal(typeof output.diagnostics.phase13ZReview.reviewRequired, "boolean");
  assert.equal(typeof output.diagnostics.phase13ZReview.mechanicalReuseWindowCount, "number");
  assert.ok(Array.isArray(output.diagnostics.phase13ZReview.windows));
  assert.equal(output.diagnostics.dissonanceTriage, output.diagnostics.phase14DissonanceTriage);
  assert.equal(output.diagnostics.phase14DissonanceTriage.schemaVersion, 1);
  assert.equal(typeof output.diagnostics.phase14DissonanceTriage.weakPassingSemitoneClashTicks, "number");
  assert.equal(typeof output.diagnostics.phase14DissonanceTriage.entryAdjacentSecondFrictionCount, "number");
  assert.ok(Array.isArray(output.diagnostics.phase14DissonanceTriage.windows));
  assert.equal(output.diagnostics.scoreWindowAcceptance, output.diagnostics.phase14ScoreWindowAcceptance);
  assert.equal(output.diagnostics.phase14ScoreWindowAcceptance.schemaVersion, 1);
  assert.equal(typeof output.diagnostics.phase14ScoreWindowAcceptance.importantEntryWindowCount, "number");
  assert.equal(typeof output.diagnostics.phase14ScoreWindowAcceptance.counterSubjectWindowCount, "number");
  assert.equal(typeof output.diagnostics.phase14ScoreWindowAcceptance.generatorResponseWindowCount, "number");
  assert.ok(Array.isArray(output.diagnostics.phase14ScoreWindowAcceptance.windows));
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
  const output = generateScore({ seed: "entry-contract", lengthTicks: PHASE_5_LENGTH_TICKS });
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
