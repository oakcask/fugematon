import assert from "node:assert/strict";
import test from "node:test";
import {
  PHASE_3_DIAGNOSTICS_PROFILE,
  PHASE_3_LENGTH_TICKS,
  PHASE_3_REPRESENTATIVE_SEEDS,
  PHASE_4_DIAGNOSTICS_PROFILE,
  PHASE_4_REPRESENTATIVE_SEEDS,
  PHASE_5_6_DIAGNOSTICS_PROFILE,
  PHASE_5_7_DIAGNOSTICS_PROFILE,
  PHASE_5_DIAGNOSTICS_PROFILE,
  REVIEW_LENGTH_TICKS,
  TICKS_PER_QUARTER,
} from "./constants.js";
import type { MetaEvent, NoteEvent } from "./events.js";
import { generateScore } from "./generate.js";
import { cpuUsageMilliseconds, positiveModulo, scoreMinutes } from "./generate-test-helpers.js";

test("generateScore validates representative phase-3 seeds", () => {
  const startCpuUsage = process.cpuUsage();

  for (const { seed, category } of PHASE_3_REPRESENTATIVE_SEEDS) {
    const output = generateScore({ seed, lengthTicks: PHASE_3_LENGTH_TICKS, selectionModel: "baseline" });
    const subjectReturns = output.diagnostics.subjectEntries.filter(
      (entry) => entry.state === "subject-return" && entry.form === "subject",
    ).length;
    const strettoEntries = output.diagnostics.subjectEntries.filter((entry) => entry.state === "stretto-like").length;
    const totalMinutes = scoreMinutes(output.diagnostics.generatedUntilTick);
    const maxParallelPerfects = Math.ceil(totalMinutes * PHASE_3_DIAGNOSTICS_PROFILE.maxParallelPerfectsPerMinute);

    assert.ok(category === "fixed" || category === "boundary");
    assert.ok(output.diagnostics.generatedUntilTick >= PHASE_3_LENGTH_TICKS);
    assert.equal(output.diagnostics.rangeViolations, PHASE_3_DIAGNOSTICS_PROFILE.rangeViolations);
    assert.equal(output.diagnostics.voiceCrossings, PHASE_3_DIAGNOSTICS_PROFILE.voiceCrossings);
    assert.ok(output.diagnostics.parallelPerfects <= maxParallelPerfects);
    assert.ok(subjectReturns >= PHASE_3_DIAGNOSTICS_PROFILE.minSubjectReturns);
    assert.ok(strettoEntries >= PHASE_3_DIAGNOSTICS_PROFILE.minStrettoEntries);
    assert.ok(output.diagnostics.candidateEvaluations > 0);
  }

  const elapsedCpuMilliseconds = cpuUsageMilliseconds(process.cpuUsage(startCpuUsage));
  const maxGenerationCpuMilliseconds =
    PHASE_3_DIAGNOSTICS_PROFILE.maxGenerationMilliseconds * PHASE_3_REPRESENTATIVE_SEEDS.length * 1.5;
  assert.ok(
    elapsedCpuMilliseconds < maxGenerationCpuMilliseconds,
    `phase-3 representative generation used ${elapsedCpuMilliseconds.toFixed(
      1,
    )}ms CPU, exceeding ${maxGenerationCpuMilliseconds.toFixed(1)}ms`,
  );
});

test("generateScore validates representative phase-4 seeds", () => {
  for (const { seed, category } of PHASE_4_REPRESENTATIVE_SEEDS) {
    const output = generateScore({ seed, lengthTicks: PHASE_3_LENGTH_TICKS, selectionModel: "baseline" });

    assert.ok(category === "fixed" || category === "boundary");
    assert.equal(output.diagnostics.rangeViolations, PHASE_4_DIAGNOSTICS_PROFILE.rangeViolations);
    assert.equal(output.diagnostics.voiceCrossings, PHASE_4_DIAGNOSTICS_PROFILE.voiceCrossings);
    assert.equal(output.diagnostics.subjectIdentityViolations, PHASE_4_DIAGNOSTICS_PROFILE.subjectIdentityViolations);
    assert.equal(output.diagnostics.answerPlanViolations, PHASE_4_DIAGNOSTICS_PROFILE.answerPlanViolations);
    assert.equal(output.diagnostics.keyMetadataMismatches, PHASE_4_DIAGNOSTICS_PROFILE.keyMetadataMismatches);
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

test("generateScore reports phase-5 counterpoint texture metrics", () => {
  const output = generateScore({ seed: "lyrical-line", lengthTicks: PHASE_3_LENGTH_TICKS, selectionModel: "baseline" });
  const totalMinutes = scoreMinutes(output.diagnostics.generatedUntilTick);
  const maxLeapRecoveryMisses = Math.ceil(totalMinutes * PHASE_5_DIAGNOSTICS_PROFILE.maxLeapRecoveryMissesPerMinute);

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

test("generateScore reports phase-5.6 beauty and texture diagnostics", () => {
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
    PHASE_5_6_DIAGNOSTICS_PROFILE.minExpositionEntryStaggerScore,
  );
  assert.ok(
    output.diagnostics.counterSubjectIdentityRetention >=
      PHASE_5_6_DIAGNOSTICS_PROFILE.minCounterSubjectIdentityRetention,
  );
  assert.ok(
    output.diagnostics.counterSubjectInvertibilityScore >=
      PHASE_5_6_DIAGNOSTICS_PROFILE.minCounterSubjectInvertibilityScore,
  );
  assert.ok(
    output.diagnostics.freeCounterpointContourScore >= PHASE_5_6_DIAGNOSTICS_PROFILE.minFreeCounterpointContourScore,
  );
  assert.ok(output.diagnostics.rhythmicIndependenceScore >= PHASE_5_6_DIAGNOSTICS_PROFILE.minRhythmicIndependenceScore);
  assert.ok(
    output.diagnostics.supportTextureRepetitionScore >= PHASE_5_6_DIAGNOSTICS_PROFILE.minSupportTextureRepetitionScore,
  );
  assert.equal(output.diagnostics.allVoiceSilenceGapCount, PHASE_5_6_DIAGNOSTICS_PROFILE.maxAllVoiceSilenceGapCount);
  assert.ok(output.diagnostics.ornamentDensity >= PHASE_5_6_DIAGNOSTICS_PROFILE.minOrnamentDensity);
  assert.ok(output.diagnostics.durationDistribution.quarter > 0);
  assert.ok(output.diagnostics.durationDistribution.eighth > 0);
});

test("generateScore reports phase-5.7 modal context diagnostics", () => {
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
  assert.ok(output.diagnostics.modalContextCount >= PHASE_5_7_DIAGNOSTICS_PROFILE.minModalContextCount);
  assert.ok(
    output.diagnostics.modalCharacteristicToneHits >= PHASE_5_7_DIAGNOSTICS_PROFILE.minModalCharacteristicToneHits,
  );
  assert.ok(output.diagnostics.modalCadenceHits >= PHASE_5_7_DIAGNOSTICS_PROFILE.minModalCadenceHits);
  assert.equal(
    output.diagnostics.tonalCadenceOveruseWarnings,
    PHASE_5_7_DIAGNOSTICS_PROFILE.maxTonalCadenceOveruseWarnings,
  );
});
