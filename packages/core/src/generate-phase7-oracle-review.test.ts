import assert from "node:assert/strict";
import test from "node:test";
import { PHASE_5_LENGTH_TICKS, VOICES } from "./constants.js";
import { generateScore } from "./generate.js";

test("generateScore exposes phase-7 candidate pool oracle classifications", () => {
  const output = generateScore({ seed: "fugue-smoke", lengthTicks: PHASE_5_LENGTH_TICKS });
  const oracle = output.diagnostics.candidatePoolOracle;
  const classifications = new Set(oracle.blockerClassifications.map((blocker) => blocker.classification));

  assert.equal(oracle.schemaVersion, 5);
  assert.ok(oracle.sectionCount > 0);
  assert.ok(oracle.candidateCount >= oracle.sectionCount);
  assert.equal(oracle.phase12PhraseFamilyCandidateCount, 0);
  assert.ok(oracle.viableCandidateCount > 0);
  assert.ok(oracle.hardFailureRejectedCandidateCount >= 0);
  assert.equal(oracle.candidateDiversity.length, 7);
  assert.ok(oracle.candidateDiversity.every((diversity) => diversity.candidateCount > 0));
  assert.ok(oracle.candidateDiversity.some((diversity) => diversity.selectionHasViableAlternative));
  assert.ok(oracle.blockerClassifications.length > 0);
  assert.ok(classifications.has("selection-model") || classifications.has("generator-or-section-planner"));
  assert.deepEqual(
    new Set(oracle.blockerClassifications.map((blocker) => blocker.blocker)),
    new Set([
      "entry-harmony",
      "voice-pair-lockstep",
      "melody-leap-recovery",
      "stepwise-pattern-fixation",
      "section-solo-texture",
      "metrical-harmony",
      "bass-root-support",
      "register-blending",
      "functional-thinning",
      "section-grammar-repetition",
    ]),
  );

  for (const blocker of oracle.blockerClassifications) {
    assert.ok(blocker.referenceAxes.length > 0);
    assert.ok(blocker.observedSectionCount > 0);
    assert.equal(
      blocker.observedSectionCount,
      blocker.selectionModelSectionCount + blocker.generatorOrSectionPlannerSectionCount,
    );
    assert.ok(blocker.viableImprovementCount >= 0);
    assert.ok(blocker.selectedRiskTotal >= 0);
    assert.ok(blocker.bestViableRiskTotal >= 0);
    assert.ok(blocker.selectionOnlyUpperBoundRiskReduction >= 0);
    assert.ok(blocker.selectionOnlyUpperBoundRiskReductionRate >= 0);
    assert.ok(blocker.selectionOnlyUpperBoundRiskReductionRate <= 1);
    assert.ok(blocker.generatorNeededRate >= 0);
    assert.ok(blocker.generatorNeededRate <= 1);
    assert.ok(blocker.selectedRiskMax >= blocker.bestViableRiskMin);
    assert.ok(blocker.representative.candidateCount > 0);
    assert.ok(blocker.representative.viableCandidateCount > 0);
    assert.ok(
      blocker.representative.selectedReferenceStatus === "within-reference" ||
        blocker.representative.selectedReferenceStatus === "below-reference" ||
        blocker.representative.selectedReferenceStatus === "above-reference",
    );
  }
});

test("generateScore exposes phase-11 review summary signals", () => {
  const reviewSeeds = ["bach-001", "minor-entry", "modal-cadence", "dense-modal"] as const;

  for (const seed of reviewSeeds) {
    const output = generateScore({
      seed,
      lengthTicks: PHASE_5_LENGTH_TICKS,
      selectionModel: "phase10-section-local-planner",
    });
    const summary = output.diagnostics.phase11Review;

    assert.equal(summary.schemaVersion, 1);
    assert.equal(summary.adjacentVoiceIntervals.length, 3);
    assert.equal(summary.registerSpans.length, VOICES.length);
    assert.equal(summary.stateGrammarRepetition.patternLength, 4);
    assert.ok(summary.stateGrammarRepetition.uniquePatternCount >= 0);
    assert.ok(summary.stateGrammarRepetition.mostRepeatedPatternCount >= 0);
    assert.ok(summary.entryPatternFamilies.length > 0);
    assert.ok(summary.functionalThinning.nonCadentialRunCount >= 0);
    assert.ok(summary.functionalThinning.oneVoiceRunCount >= 0);
    assert.ok(summary.functionalThinning.twoVoiceRunCount >= 0);
    assert.equal(
      summary.functionalThinning.annotatedRunCount + summary.functionalThinning.unsupportedRunCount,
      summary.functionalThinning.nonCadentialRunCount,
    );
    assert.ok(summary.functionalThinning.entryPreparationRunCount >= 0);
    assert.ok(summary.functionalThinning.cadentialPreparationRunCount >= 0);
    assert.ok(summary.functionalThinning.pedalRunCount >= 0);
    assert.ok(summary.metricalHarmony.strongBeatCheckpointCount > 0);
    assert.ok(summary.metricalHarmony.weakBeatCheckpointCount > 0);
    assert.equal(output.diagnostics.strongBeatDissonanceCount, output.diagnostics.harmonicFunctionMismatches);
    assert.ok(output.diagnostics.harmonicFunctionMatches > 0);
    assert.ok(
      summary.metricalHarmony.strongBeatChordToneSupportCount <= summary.metricalHarmony.strongBeatCheckpointCount,
    );
    assert.ok(
      summary.metricalHarmony.strongBeatBassRootSupportCount <= summary.metricalHarmony.strongBeatCheckpointCount,
    );

    for (const interval of summary.adjacentVoiceIntervals) {
      assert.ok(interval.checkpointCount > 0);
      assert.ok(interval.medianSemitones >= 0);
      assert.ok(interval.seventyFifthPercentileSemitones >= interval.medianSemitones);
      assert.ok(interval.overOctaveCount >= 0);
    }

    for (const span of summary.registerSpans) {
      assert.ok(span.noteCount > 0);
      assert.ok(span.maxPitch >= span.minPitch);
      assert.equal(span.spanSemitones, span.maxPitch - span.minPitch);
    }
  }
});

test("generateScore exposes phase-12 repetition family diagnostics", () => {
  const reviewSeeds = ["angular-answer", "modal-dorian", "modal-answer", "modal-cadence", "dense-modal"] as const;

  for (const seed of reviewSeeds) {
    const output = generateScore({
      seed,
      lengthTicks: PHASE_5_LENGTH_TICKS,
      selectionModel: "phase10-section-local-planner",
    });
    const summary = output.diagnostics.phase12Review;

    assert.equal(summary.schemaVersion, 1);
    assert.equal(summary.entryPatternFamilyConcentration.entryCount, output.diagnostics.subjectEntries.length);
    assert.ok(summary.entryPatternFamilyConcentration.uniqueFamilyCount > 0);
    assert.ok(summary.entryPatternFamilyConcentration.topFamilyCount > 0);
    assert.ok(summary.entryPatternFamilyConcentration.topFamilyShare > 0);
    assert.ok(summary.entryPatternFamilyConcentration.topFamilyShare <= 1);
    assert.ok(summary.subjectStemFamilies.length > 0);
    assert.ok(summary.answerTransformFamilies.length > 0);
    assert.ok(summary.fragmentDerivations.length > 0);
    assert.ok(summary.phraseFunctions.length > 0);
    assert.equal(summary.sectionStatePatterns.patternLength, 4);
    assert.ok(summary.sectionStatePatterns.uniquePatternCount >= 0);
    assert.ok(summary.sectionStatePatterns.mostRepeatedPatternCount >= 0);
    assert.ok(summary.sectionStatePatterns.topPatterns.length > 0);

    for (const family of summary.subjectStemFamilies) {
      assert.ok(family.form === "subject" || family.form === "subject-fragment");
      assert.ok(family.pattern.length > 0);
      assert.ok(family.count > 0);
      assert.ok(family.share > 0);
      assert.ok(family.share <= 1);
    }

    for (const answer of summary.answerTransformFamilies) {
      assert.ok(answer.answerKind === "true" || answer.answerKind === "tonal" || answer.answerKind === "none");
      assert.ok(answer.pattern.length > 0);
      assert.ok(answer.count > 0);
      assert.ok(answer.share > 0);
      assert.ok(answer.share <= 1);
    }

    assert.ok(summary.phraseFunctions.some((phraseFunction) => phraseFunction.phraseFunction !== "exposition"));
    assert.ok(summary.fragmentDerivations.some((derivation) => derivation.phraseFunction === "episode-sequence"));
  }
});

test("generateScore adds phase-12 phrase family candidates to oracle evidence only", () => {
  const reviewSeeds = ["angular-answer", "modal-dorian", "modal-answer", "modal-cadence", "dense-modal"] as const;

  for (const seed of reviewSeeds) {
    const output = generateScore({
      seed,
      lengthTicks: PHASE_5_LENGTH_TICKS,
      selectionModel: "phase10-section-local-planner",
    });
    const oracle = output.diagnostics.candidatePoolOracle;

    assert.equal(oracle.schemaVersion, 5);
    assert.ok(oracle.phase12PhraseFamilyCandidateCount > 0);
    assert.ok(oracle.candidateCount > oracle.phase12PhraseFamilyCandidateCount);

    for (const blocker of oracle.blockerClassifications) {
      assert.ok(blocker.representative.phase12PhraseFamilyCandidateCount > 0);
      assert.ok(
        blocker.representative.selectedCandidateIndex <
          blocker.representative.candidateCount - blocker.representative.phase12PhraseFamilyCandidateCount,
      );
    }
  }
});
