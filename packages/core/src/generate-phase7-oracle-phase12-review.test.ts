import assert from "node:assert/strict";
import test from "node:test";
import { PHASE_5_LENGTH_TICKS } from "./constants.js";
import { generateScore } from "./generate.js";

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

test("generateScore keeps phase-12 phrase family candidates traceable when selectable", () => {
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
      assert.ok(blocker.representative.selectedCandidateIndex < blocker.representative.candidateCount);
    }
  }
});
