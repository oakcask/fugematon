import assert from "node:assert/strict";
import test from "node:test";
import {
  BEAUTY_TEXTURE_DIAGNOSTICS_PROFILE,
  COUNTERPOINT_HARMONY_DIAGNOSTICS_PROFILE,
  FUGUE_FORM_DIAGNOSTICS_PROFILE,
  FUGUE_FORM_REPRESENTATIVE_SEEDS,
  FUGUE_FORM_REVIEW_LENGTH_TICKS,
  MODAL_CONTEXT_DIAGNOSTICS_PROFILE,
  REVIEW_LENGTH_TICKS,
  SUBJECT_ANSWER_PLAN_DIAGNOSTICS_PROFILE,
  SUBJECT_ANSWER_PLAN_REPRESENTATIVE_SEEDS,
  TICKS_PER_QUARTER,
} from "./constants.js";
import type { MetaEvent, NoteEvent } from "./events.js";
import { generateScore } from "./generate.js";
import { cpuUsageMilliseconds, positiveModulo, scoreMinutes } from "./generate-test-helpers.js";

test("generateScore validates representative fugue-form seeds", () => {
  const startCpuUsage = process.cpuUsage();

  for (const { seed, category } of FUGUE_FORM_REPRESENTATIVE_SEEDS) {
    const output = generateScore({ seed, lengthTicks: FUGUE_FORM_REVIEW_LENGTH_TICKS, selectionModel: "baseline" });
    const subjectReturns = output.diagnostics.subjectEntries.filter(
      (entry) => entry.state === "subject-return" && entry.form === "subject",
    ).length;
    const strettoEntries = output.diagnostics.subjectEntries.filter((entry) => entry.state === "stretto-like").length;
    const totalMinutes = scoreMinutes(output.diagnostics.generatedUntilTick);
    const maxParallelPerfects = Math.ceil(totalMinutes * FUGUE_FORM_DIAGNOSTICS_PROFILE.maxParallelPerfectsPerMinute);

    assert.ok(category === "fixed" || category === "boundary");
    assert.ok(output.diagnostics.generatedUntilTick >= FUGUE_FORM_REVIEW_LENGTH_TICKS);
    assert.equal(output.diagnostics.rangeViolations, FUGUE_FORM_DIAGNOSTICS_PROFILE.rangeViolations);
    assert.equal(output.diagnostics.voiceCrossings, FUGUE_FORM_DIAGNOSTICS_PROFILE.voiceCrossings);
    assert.ok(output.diagnostics.parallelPerfects <= maxParallelPerfects);
    assert.ok(subjectReturns >= FUGUE_FORM_DIAGNOSTICS_PROFILE.minSubjectReturns);
    assert.ok(strettoEntries >= FUGUE_FORM_DIAGNOSTICS_PROFILE.minStrettoEntries);
    assert.ok(output.diagnostics.candidateEvaluations > 0);
  }

  const elapsedCpuMilliseconds = cpuUsageMilliseconds(process.cpuUsage(startCpuUsage));
  const maxGenerationCpuMilliseconds =
    FUGUE_FORM_DIAGNOSTICS_PROFILE.maxGenerationMilliseconds * FUGUE_FORM_REPRESENTATIVE_SEEDS.length * 1.5;
  assert.ok(
    elapsedCpuMilliseconds < maxGenerationCpuMilliseconds,
    `fugue-form representative generation used ${elapsedCpuMilliseconds.toFixed(
      1,
    )}ms CPU, exceeding ${maxGenerationCpuMilliseconds.toFixed(1)}ms`,
  );
});

test("generateScore validates representative subject-answer plan seeds", () => {
  for (const { seed, category } of SUBJECT_ANSWER_PLAN_REPRESENTATIVE_SEEDS) {
    const output = generateScore({ seed, lengthTicks: FUGUE_FORM_REVIEW_LENGTH_TICKS, selectionModel: "baseline" });

    assert.ok(category === "fixed" || category === "boundary");
    assert.equal(output.diagnostics.rangeViolations, SUBJECT_ANSWER_PLAN_DIAGNOSTICS_PROFILE.rangeViolations);
    assert.equal(output.diagnostics.voiceCrossings, SUBJECT_ANSWER_PLAN_DIAGNOSTICS_PROFILE.voiceCrossings);
    assert.equal(
      output.diagnostics.subjectIdentityViolations,
      SUBJECT_ANSWER_PLAN_DIAGNOSTICS_PROFILE.subjectIdentityViolations,
    );
    assert.equal(output.diagnostics.answerPlanViolations, SUBJECT_ANSWER_PLAN_DIAGNOSTICS_PROFILE.answerPlanViolations);
    assert.equal(
      output.diagnostics.keyMetadataMismatches,
      SUBJECT_ANSWER_PLAN_DIAGNOSTICS_PROFILE.keyMetadataMismatches,
    );
    assert.ok(
      output.diagnostics.subjectEntries.some(
        (entry) =>
          entry.state === "subject-return" &&
          entry.form === "subject" &&
          entry.expectedDegreePattern.length === entry.actualPitchClassSequence.length,
      ),
    );
    assert.ok(
      output.diagnostics.subjectEntries
        .filter((entry) => entry.form === "answer")
        .every((entry) => entry.answerKind === "true" || entry.answerKind === "tonal"),
    );
  }
});

test("generateScore reports counterpoint texture metrics", () => {
  const output = generateScore({
    seed: "lyrical-line",
    lengthTicks: FUGUE_FORM_REVIEW_LENGTH_TICKS,
    selectionModel: "baseline",
  });
  const totalMinutes = scoreMinutes(output.diagnostics.generatedUntilTick);
  const maxLeapRecoveryMisses = Math.ceil(
    totalMinutes * COUNTERPOINT_HARMONY_DIAGNOSTICS_PROFILE.maxLeapRecoveryMissesPerMinute,
  );

  assert.ok(output.diagnostics.counterSubjectCoverage >= 0.5);
  assert.ok(output.diagnostics.freeCounterpointCoverage >= 0.5);
  assert.equal(output.diagnostics.fallbackPassageCount, 0);
  assert.equal(output.diagnostics.melodicStagnationWarnings, 0);
  assert.ok(output.diagnostics.leapRecoveryMisses <= maxLeapRecoveryMisses);
  assert.ok(output.events.some((event) => event.kind === "note" && event.role === "counter-subject"));
  assert.ok(output.events.some((event) => event.kind === "note" && event.role === "free-counterpoint"));
});

test("generateScore keeps planned entries tied to emitted entry notes", () => {
  const output = generateScore({
    seed: "entry-contract",
    lengthTicks: REVIEW_LENGTH_TICKS,
    selectionModel: "baseline",
  });
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

    assert.equal(entryNotes.length, entry.expectedDegreePattern.length);
    assert.deepEqual(
      entryNotes.map((note) => positiveModulo(note.pitch, 12)),
      entry.actualPitchClassSequence,
    );
  }
});

test("generateScore reports beauty and texture diagnostics", () => {
  const output = generateScore({ seed: "fugue-smoke", lengthTicks: REVIEW_LENGTH_TICKS, selectionModel: "baseline" });
  const selectedEvaluation = output.diagnostics.selectedCandidateEvaluations[0];

  assert.ok(selectedEvaluation !== undefined);
  assert.ok(Number.isFinite(selectedEvaluation.totalCost));
  assert.deepEqual(Object.keys(selectedEvaluation.dimensions), [
    "counterpoint",
    "melody",
    "texture",
    "subjectClarity",
    "harmony",
    "form",
  ]);
  assert.equal(
    output.diagnostics.expositionEntryStaggerScore,
    BEAUTY_TEXTURE_DIAGNOSTICS_PROFILE.minExpositionEntryStaggerScore,
  );
  assert.ok(
    output.diagnostics.counterSubjectIdentityRetention >=
      BEAUTY_TEXTURE_DIAGNOSTICS_PROFILE.minCounterSubjectIdentityRetention,
  );
  assert.ok(
    output.diagnostics.counterSubjectInvertibilityScore >=
      BEAUTY_TEXTURE_DIAGNOSTICS_PROFILE.minCounterSubjectInvertibilityScore,
  );
  assert.ok(
    output.diagnostics.freeCounterpointContourScore >=
      BEAUTY_TEXTURE_DIAGNOSTICS_PROFILE.minFreeCounterpointContourScore,
  );
  assert.ok(
    output.diagnostics.rhythmicIndependenceScore >= BEAUTY_TEXTURE_DIAGNOSTICS_PROFILE.minRhythmicIndependenceScore,
  );
  assert.ok(
    output.diagnostics.supportTextureRepetitionScore >=
      BEAUTY_TEXTURE_DIAGNOSTICS_PROFILE.minSupportTextureRepetitionScore,
  );
  assert.equal(
    output.diagnostics.allVoiceSilenceGapCount,
    BEAUTY_TEXTURE_DIAGNOSTICS_PROFILE.maxAllVoiceSilenceGapCount,
  );
  assert.ok(output.diagnostics.ornamentDensity >= BEAUTY_TEXTURE_DIAGNOSTICS_PROFILE.minOrnamentDensity);
  assert.ok(output.diagnostics.durationDistribution.quarter > 0);
  assert.ok(output.diagnostics.durationDistribution.eighth > 0);
});

test("generateScore reports modal context diagnostics", () => {
  const output = generateScore({ seed: "modal-dorian", lengthTicks: REVIEW_LENGTH_TICKS, selectionModel: "baseline" });
  const keySignature = output.events.find(
    (event): event is Extract<MetaEvent, { type: "key-signature" }> =>
      event.kind === "meta" && event.type === "key-signature",
  );

  assert.equal(keySignature?.payload.mode, "dorian");
  assert.ok(output.diagnostics.sectionPlans.every((plan) => plan.localKey.mode === "dorian"));
  assert.ok(
    output.diagnostics.sectionPlans.some((plan) => plan.cadenceKind === "modal" && plan.targetKey.mode === "dorian"),
  );
  assert.ok(output.diagnostics.modalContextCount >= MODAL_CONTEXT_DIAGNOSTICS_PROFILE.minModalContextCount);
  assert.ok(
    output.diagnostics.modalCharacteristicToneHits >= MODAL_CONTEXT_DIAGNOSTICS_PROFILE.minModalCharacteristicToneHits,
  );
  assert.ok(output.diagnostics.modalCadenceHits >= MODAL_CONTEXT_DIAGNOSTICS_PROFILE.minModalCadenceHits);
  assert.equal(
    output.diagnostics.tonalCadenceOveruseWarnings,
    MODAL_CONTEXT_DIAGNOSTICS_PROFILE.maxTonalCadenceOveruseWarnings,
  );
});
