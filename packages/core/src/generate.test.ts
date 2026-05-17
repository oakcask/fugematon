import assert from "node:assert/strict";
import test from "node:test";
import {
  PHASE_1_DIAGNOSTICS_PROFILE,
  PHASE_1_REPRESENTATIVE_SEEDS,
  PHASE_3_DIAGNOSTICS_PROFILE,
  PHASE_3_LENGTH_TICKS,
  PHASE_3_REPRESENTATIVE_SEEDS,
  PHASE_4_DIAGNOSTICS_PROFILE,
  PHASE_4_REPRESENTATIVE_SEEDS,
  PHASE_5_6_DIAGNOSTICS_PROFILE,
  PHASE_5_7_DIAGNOSTICS_PROFILE,
  PHASE_5_9_DIAGNOSTICS_PROFILE,
  PHASE_5_10_DIAGNOSTICS_PROFILE,
  PHASE_5_11_DIAGNOSTICS_PROFILE,
  PHASE_5_11_ROTATION_SEEDS,
  PHASE_5_DIAGNOSTICS_PROFILE,
  PHASE_5_LENGTH_TICKS,
  PHASE_5_REVIEW_SEEDS,
  PHASE_6_DIAGNOSTICS_PROFILE,
  PHASE_7_DIAGNOSTICS_PROFILE,
  TICKS_PER_QUARTER,
  VOICES,
} from "./constants.js";
import type { MetaEvent, NoteEvent, ScoreEvent } from "./events.js";
import { generateScore } from "./generate.js";
import {
  evaluatePhase6Diagnostics,
  evaluatePhase7Diagnostics,
  evaluatePhase59Diagnostics,
  evaluatePhase510Diagnostics,
  evaluatePhase511Diagnostics,
} from "./review-gate.js";

test("generateScore is deterministic for identical input", () => {
  const input = {
    seed: "bach-001",
    lengthTicks: 7680,
    parameters: { strictness: 0.75 },
  };

  assert.deepEqual(generateScore(input), generateScore(input));
});

test("generateScore changes seed-derived metadata for different seeds", () => {
  const first = generateScore({ seed: "bach-001", lengthTicks: 7680 });
  const second = generateScore({ seed: "bach-002", lengthTicks: 7680 });

  assert.notDeepEqual(first.events, second.events);
});

test("generateScore emits a tick-based phase-1 exposition", () => {
  const output = generateScore({ seed: "phase-zero", lengthTicks: 960 });
  const first = asMetaEvent(output.events[0]);
  const last = asMetaEvent(output.events.at(-1));
  const notes = output.events.filter((event): event is NoteEvent => event.kind === "note");

  assert.equal(first.type, "generator-version");
  assert.equal(last.type, "score-end");
  assert.equal(last.tick, output.diagnostics.generatedUntilTick);
  assert.deepEqual(output.diagnostics.stateTransitions, ["exposition"]);
  assert.equal(output.diagnostics.subjectEntries.length, 4);
  assert.deepEqual(new Set(notes.map((note) => note.voice)), new Set(VOICES));
  assert.equal(output.diagnostics.noteCount, notes.length);
  assert.equal(output.diagnostics.rangeViolations, 0);
  assert.equal(output.diagnostics.subjectIdentityViolations, 0);
  assert.equal(output.diagnostics.answerPlanViolations, 0);
  assert.equal(output.diagnostics.keyMetadataMismatches, 0);
  assert.equal(countIssues(output.diagnostics.issues, "range-violation"), output.diagnostics.rangeViolations);
  assert.equal(countIssues(output.diagnostics.issues, "voice-crossing"), output.diagnostics.voiceCrossings);
  assert.equal(countIssues(output.diagnostics.issues, "parallel-perfect"), output.diagnostics.parallelPerfects);
});

test("generateScore validates reproducibility inputs", () => {
  assert.throws(() => generateScore({ seed: "", lengthTicks: 960 }), /seed/);
  assert.throws(() => generateScore({ seed: "x", lengthTicks: 0 }), /lengthTicks/);
  assert.throws(() => generateScore({ seed: "x", lengthTicks: 960, parameters: { strictness: 2 } }), /strictness/);
});

test("generateScore keeps public event and diagnostics counts aligned", () => {
  const output = generateScore({
    seed: "event-contract",
    lengthTicks: PHASE_5_LENGTH_TICKS,
    parameters: { density: 0.25, subjectPresence: 1 },
  });
  const notes = output.events.filter((event): event is NoteEvent => event.kind === "note");
  const stateChanges = output.events.filter(
    (event): event is Extract<MetaEvent, { type: "state-change" }> =>
      event.kind === "meta" && event.type === "state-change",
  );
  const parameterChange = output.events.find(
    (event): event is Extract<MetaEvent, { type: "parameter-change" }> =>
      event.kind === "meta" && event.type === "parameter-change",
  );

  assert.equal(output.diagnostics.eventCount, output.events.length);
  assert.equal(output.diagnostics.noteCount, notes.length);
  assert.deepEqual(
    stateChanges.map((event) => event.payload.state),
    output.diagnostics.stateTransitions,
  );
  assert.equal(parameterChange?.payload.parameters.strictness, 0.8);
  assert.equal(parameterChange?.payload.parameters.density, 0.25);
  assert.equal(parameterChange?.payload.parameters.subjectPresence, 1);

  for (const note of notes) {
    assert.ok(Number.isSafeInteger(note.startTick));
    assert.ok(Number.isSafeInteger(note.durationTicks));
    assert.ok(note.startTick >= 0);
    assert.ok(note.durationTicks > 0);
    assert.ok(note.startTick + note.durationTicks <= output.diagnostics.generatedUntilTick);
    assert.ok(VOICES.includes(note.voice));
    assert.ok(note.pitch >= 0 && note.pitch <= 127);
    assert.ok(note.velocity >= 0 && note.velocity <= 127);
  }
});

test("generateScore exposes ordered subject and answer entries", () => {
  const output = generateScore({ seed: "bach-001", lengthTicks: 7680 });

  assert.deepEqual(
    output.diagnostics.subjectEntries
      .slice(0, 4)
      .map((entry) => [entry.voice, entry.form, entry.state, entry.startTick, entry.localKey.tonic, entry.answerKind]),
    [
      ["alto", "subject", "exposition", 0, output.diagnostics.subjectEntries[0]!.globalKey.tonic, undefined],
      ["soprano", "answer", "exposition", 1920, output.diagnostics.subjectEntries[1]!.localKey.tonic, "tonal"],
      ["tenor", "subject", "exposition", 3840, output.diagnostics.subjectEntries[2]!.globalKey.tonic, undefined],
      ["bass", "answer", "exposition", 5760, output.diagnostics.subjectEntries[3]!.localKey.tonic, "tonal"],
    ],
  );
  assert.deepEqual(
    output.diagnostics.subjectEntries.slice(0, 4).map((entry) => entry.globalKey),
    Array.from({ length: 4 }, () => output.diagnostics.subjectEntries[0]!.globalKey),
  );
  for (const entry of output.diagnostics.subjectEntries) {
    assert.equal(entry.expectedDegreePattern.length, entry.actualPitchClassSequence.length);
    assert.ok(entry.registerTarget > 0);
  }
  assert.ok(output.diagnostics.generatedUntilTick >= 7680);
});

test("generateScore extends long scores with phase-3 fugue states", () => {
  const output = generateScore({ seed: "fugue-smoke", lengthTicks: PHASE_3_LENGTH_TICKS });
  const stateChanges = output.events.filter(
    (event): event is Extract<MetaEvent, { type: "state-change" }> =>
      event.kind === "meta" && event.type === "state-change",
  );

  assert.ok(output.diagnostics.generatedUntilTick >= PHASE_3_LENGTH_TICKS);
  assert.ok(output.diagnostics.stateTransitions.includes("episode"));
  assert.ok(output.diagnostics.stateTransitions.includes("subject-return"));
  assert.ok(output.diagnostics.stateTransitions.includes("stretto-like"));
  assert.ok(
    output.diagnostics.subjectEntries.some((entry) => entry.state === "subject-return" && entry.form === "subject"),
  );
  assert.ok(
    output.diagnostics.subjectEntries.some((entry) => entry.state === "stretto-like" && entry.form === "answer"),
  );
  assert.deepEqual(
    stateChanges.map((event) => event.payload.state),
    output.diagnostics.stateTransitions,
  );
  assert.ok(output.diagnostics.candidateEvaluations > 0);
});

test("generateScore emits section plans with bounded harmonic anchors", () => {
  const output = generateScore({ seed: "section-plan-contract", lengthTicks: PHASE_5_LENGTH_TICKS });
  const continuationPlans = output.diagnostics.sectionPlans.filter((plan) => plan.state !== "exposition");

  assert.deepEqual(
    output.diagnostics.sectionPlans.map((plan) => plan.state),
    output.diagnostics.stateTransitions,
  );
  assert.equal(output.diagnostics.sectionPlans[0]?.startTick, 0);
  assert.ok(continuationPlans.length > 0);

  for (const plan of output.diagnostics.sectionPlans) {
    assert.ok(plan.durationTicks > 0);
    assert.ok(plan.startTick >= 0);
    assert.equal(plan.anchors[0]?.tick, plan.startTick);
    assert.equal(plan.anchors[0]?.function, "tonic");
    assert.ok(plan.anchors.some((anchor) => anchor.cadenceTarget));

    const anchorTicks = plan.anchors.map((anchor) => anchor.tick);
    assert.deepEqual(
      anchorTicks,
      [...anchorTicks].sort((left, right) => left - right),
    );

    for (const anchor of plan.anchors) {
      assert.ok(anchor.tick >= plan.startTick);
      assert.ok(anchor.tick <= plan.startTick + plan.durationTicks);
      assert.equal(anchor.localKey.mode, plan.localKey.mode);
    }
  }
});

test("generateScore validates representative phase-1 seeds", () => {
  for (const { seed, category } of PHASE_1_REPRESENTATIVE_SEEDS) {
    const output = generateScore({ seed, lengthTicks: 7680 });
    const notes = output.events.filter((event): event is NoteEvent => event.kind === "note");

    assert.ok(category === "fixed" || category === "boundary");
    assert.ok(output.diagnostics.generatedUntilTick >= 7680);
    assert.equal(output.diagnostics.subjectEntries.length, 4);
    assert.deepEqual(new Set(notes.map((note) => note.voice)), new Set(VOICES));
    assert.equal(output.diagnostics.rangeViolations, PHASE_1_DIAGNOSTICS_PROFILE.rangeViolations);
    assert.equal(output.diagnostics.voiceCrossings, PHASE_1_DIAGNOSTICS_PROFILE.voiceCrossings);
    assert.equal(countIssues(output.diagnostics.issues, "range-violation"), 0);
    assert.equal(countIssues(output.diagnostics.issues, "voice-crossing"), 0);
    for (const issue of output.diagnostics.issues) {
      assert.equal(issue.severity, "warning");
      assert.ok(Number.isSafeInteger(issue.tick));
      assert.ok(issue.voices.length > 0);
      assert.ok(issue.message.length > 0);
    }
  }
});

test("generateScore validates representative phase-3 seeds", () => {
  for (const { seed, category } of PHASE_3_REPRESENTATIVE_SEEDS) {
    const startMilliseconds = performance.now();
    const output = generateScore({ seed, lengthTicks: PHASE_3_LENGTH_TICKS });
    const elapsedMilliseconds = performance.now() - startMilliseconds;
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
    assert.ok(elapsedMilliseconds < PHASE_3_DIAGNOSTICS_PROFILE.maxGenerationMilliseconds);
  }
});

test("generateScore validates representative phase-4 seeds", () => {
  for (const { seed, category } of PHASE_4_REPRESENTATIVE_SEEDS) {
    const output = generateScore({ seed, lengthTicks: PHASE_3_LENGTH_TICKS });

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
  const output = generateScore({ seed: "lyrical-line", lengthTicks: PHASE_3_LENGTH_TICKS });
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

test("generateScore validates phase-5 quality gate seeds", () => {
  const signatures = new Set<string>();

  for (const { seed } of PHASE_5_REVIEW_SEEDS) {
    const output = generateScore({ seed, lengthTicks: PHASE_5_LENGTH_TICKS });
    const totalMinutes = scoreMinutes(output.diagnostics.generatedUntilTick);
    const maxLeapRecoveryMisses = Math.ceil(totalMinutes * PHASE_5_DIAGNOSTICS_PROFILE.maxLeapRecoveryMissesPerMinute);

    assert.equal(output.diagnostics.rangeViolations, PHASE_5_DIAGNOSTICS_PROFILE.rangeViolations);
    assert.equal(output.diagnostics.voiceCrossings, PHASE_5_DIAGNOSTICS_PROFILE.voiceCrossings);
    assert.equal(output.diagnostics.subjectIdentityViolations, PHASE_5_DIAGNOSTICS_PROFILE.subjectIdentityViolations);
    assert.equal(output.diagnostics.answerPlanViolations, PHASE_5_DIAGNOSTICS_PROFILE.answerPlanViolations);
    assert.equal(output.diagnostics.keyMetadataMismatches, PHASE_5_DIAGNOSTICS_PROFILE.keyMetadataMismatches);
    assert.ok(output.diagnostics.counterSubjectCoverage >= PHASE_5_DIAGNOSTICS_PROFILE.minCounterSubjectCoverage);
    assert.ok(output.diagnostics.freeCounterpointCoverage >= PHASE_5_DIAGNOSTICS_PROFILE.minFreeCounterpointCoverage);
    assert.equal(output.diagnostics.fallbackPassageCount, PHASE_5_DIAGNOSTICS_PROFILE.fallbackPassageCount);
    assert.ok(output.diagnostics.melodicStagnationWarnings <= PHASE_5_DIAGNOSTICS_PROFILE.maxMelodicStagnationWarnings);
    assert.ok(output.diagnostics.leapRecoveryMisses <= maxLeapRecoveryMisses);
    assert.equal(
      output.diagnostics.unresolvedDissonanceCount,
      PHASE_5_DIAGNOSTICS_PROFILE.maxUnresolvedDissonanceCount,
    );
    assert.equal(
      output.diagnostics.strongBeatDissonanceCount,
      PHASE_5_DIAGNOSTICS_PROFILE.maxStrongBeatDissonanceCount,
    );
    assert.equal(output.diagnostics.cadenceTargetMisses, PHASE_5_DIAGNOSTICS_PROFILE.cadenceTargetMisses);
    assert.equal(
      output.diagnostics.leadingToneResolutionMisses,
      PHASE_5_DIAGNOSTICS_PROFILE.leadingToneResolutionMisses,
    );
    assert.equal(output.diagnostics.dominantResolutionMisses, PHASE_5_DIAGNOSTICS_PROFILE.dominantResolutionMisses);
    assert.equal(output.diagnostics.predominantDirectionMisses, PHASE_5_DIAGNOSTICS_PROFILE.predominantDirectionMisses);
    assert.equal(output.diagnostics.harmonicFunctionMismatches, PHASE_5_DIAGNOSTICS_PROFILE.harmonicFunctionMismatches);
    assert.ok(output.diagnostics.controlledAmbiguityScore >= PHASE_5_DIAGNOSTICS_PROFILE.minControlledAmbiguityScore);
    assert.equal(
      output.diagnostics.unresolvedAmbiguityWarnings,
      PHASE_5_DIAGNOSTICS_PROFILE.maxUnresolvedAmbiguityWarnings,
    );
    assert.ok(output.diagnostics.styleModulationFit >= PHASE_5_DIAGNOSTICS_PROFILE.minStyleModulationFit);
    assert.equal(output.diagnostics.formRepetitionWarnings, PHASE_5_DIAGNOSTICS_PROFILE.maxFormRepetitionWarnings);
    assert.ok(output.diagnostics.episodeDirectionScore >= PHASE_5_DIAGNOSTICS_PROFILE.minEpisodeDirectionScore);
    assert.ok(output.diagnostics.strettoClarityScore >= PHASE_5_DIAGNOSTICS_PROFILE.minStrettoClarityScore);
    assert.ok(output.diagnostics.cadenceTargetHits > 0);
    assert.ok(output.diagnostics.harmonicFunctionMatches > 0);
    assert.ok(output.diagnostics.sectionPlans.some((plan) => plan.state === "episode" && plan.targetKey));
    assert.ok(output.diagnostics.sectionPlans.some((plan) => plan.state === "subject-return" && plan.cadenceKind));

    signatures.add(
      output.diagnostics.sectionPlans
        .filter((plan) => plan.state !== "exposition")
        .slice(0, 6)
        .map((plan) => `${plan.state}:${plan.durationTicks}:${plan.targetKey.tonic}`)
        .join("|"),
    );
  }

  assert.ok(signatures.size > 1);
});

test("generateScore keeps planned entries tied to emitted entry notes", () => {
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

    assert.equal(entryNotes.length, entry.expectedDegreePattern.length);
    assert.deepEqual(
      entryNotes.map((note) => positiveModulo(note.pitch, 12)),
      entry.actualPitchClassSequence,
    );
  }
});

test("generateScore reports phase-5.6 beauty and texture diagnostics", () => {
  const output = generateScore({ seed: "fugue-smoke", lengthTicks: PHASE_5_LENGTH_TICKS });
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
  const output = generateScore({ seed: "modal-dorian", lengthTicks: PHASE_5_LENGTH_TICKS });
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

test("generateScore applies phase-5.9 beauty gates across review seeds", () => {
  for (const { seed } of PHASE_5_REVIEW_SEEDS) {
    const output = generateScore({ seed, lengthTicks: PHASE_5_LENGTH_TICKS });
    const gate = evaluatePhase59Diagnostics(seed, output.diagnostics);

    assert.deepEqual(gate.failures, []);
    assert.equal(gate.passed, true);
    assert.ok(
      gate.metrics.counterSubjectIdentityRetention >= PHASE_5_9_DIAGNOSTICS_PROFILE.minCounterSubjectIdentityRetention,
    );
    assert.ok(gate.metrics.rhythmicIndependenceScore >= PHASE_5_9_DIAGNOSTICS_PROFILE.minRhythmicIndependenceScore);
    assert.ok(gate.metrics.unisonOverlapCount <= PHASE_5_9_DIAGNOSTICS_PROFILE.maxUnisonOverlapCount);
    assert.ok(gate.metrics.sameDirectionMotionCount <= PHASE_5_9_DIAGNOSTICS_PROFILE.maxSameDirectionMotionCount);
    assert.ok(gate.metrics.sharedRhythmOverlapCount <= PHASE_5_9_DIAGNOSTICS_PROFILE.maxSharedRhythmOverlapCount);
    assert.ok(gate.metrics.leapRecoveryMisses <= PHASE_5_9_DIAGNOSTICS_PROFILE.maxLeapRecoveryMisses);
    assert.ok(
      gate.metrics.maxSelectedCandidateTextureCost <= PHASE_5_9_DIAGNOSTICS_PROFILE.maxSelectedCandidateTextureCost,
    );
    assert.ok(
      gate.metrics.averageSelectedCandidateTextureCost <=
        PHASE_5_9_DIAGNOSTICS_PROFILE.maxAverageSelectedCandidateTextureCost,
    );
    assert.ok(
      gate.metrics.maxSelectedCandidateMelodyCost <= PHASE_5_9_DIAGNOSTICS_PROFILE.maxSelectedCandidateMelodyCost,
    );
    assert.ok(
      gate.metrics.averageSelectedCandidateMelodyCost <=
        PHASE_5_9_DIAGNOSTICS_PROFILE.maxAverageSelectedCandidateMelodyCost,
    );
  }
});

test("generateScore applies phase-5.9 boundary seed gates", () => {
  const boundaryProfiles = PHASE_5_9_DIAGNOSTICS_PROFILE.boundarySeeds;

  for (const [seed, profile] of Object.entries(boundaryProfiles)) {
    const output = generateScore({ seed, lengthTicks: PHASE_5_LENGTH_TICKS });
    const textureCosts = output.diagnostics.selectedCandidateEvaluations.map(
      (evaluation) => evaluation.dimensions.texture.cost,
    );

    if ("minCounterSubjectIdentityRetention" in profile) {
      assert.ok(output.diagnostics.counterSubjectIdentityRetention >= profile.minCounterSubjectIdentityRetention);
    }
    if ("maxSharedRhythmOverlapCount" in profile) {
      assert.ok(output.diagnostics.sharedRhythmOverlapCount <= profile.maxSharedRhythmOverlapCount);
    }
    if ("maxLeapRecoveryMisses" in profile) {
      assert.ok(output.diagnostics.leapRecoveryMisses <= profile.maxLeapRecoveryMisses);
    }
    if ("minOrnamentDensity" in profile) {
      assert.ok(output.diagnostics.ornamentDensity >= profile.minOrnamentDensity);
    }
    if ("maxSelectedCandidateTextureCost" in profile) {
      assert.ok(Math.max(...textureCosts) <= profile.maxSelectedCandidateTextureCost);
    }
    if ("minModalContextCount" in profile) {
      assert.ok(output.diagnostics.modalContextCount >= profile.minModalContextCount);
      assert.ok(output.diagnostics.modalCharacteristicToneHits >= profile.minModalCharacteristicToneHits);
      assert.ok(output.diagnostics.modalCadenceHits >= profile.minModalCadenceHits);
    }
  }
});

test("generateScore exposes phase-5.10 rhythm and entry support diagnostics", () => {
  const output = generateScore({ seed: "fugue-smoke", lengthTicks: PHASE_5_LENGTH_TICKS });
  const selectedEvaluation = output.diagnostics.selectedCandidateEvaluations[0];

  assert.ok(output.diagnostics.shortStrongBeatEntryNoteCount > 0);
  assert.ok(output.diagnostics.entrySupportInstabilityCount > 0);
  assert.ok(selectedEvaluation !== undefined);
  assert.ok("unisonOverlapCount" in selectedEvaluation.dimensions.texture.features);
  assert.ok("sameDirectionMotionCount" in selectedEvaluation.dimensions.texture.features);
  assert.ok("shortStrongBeatEntryNoteCount" in selectedEvaluation.dimensions.texture.features);
  assert.ok("entrySupportInstabilityCount" in selectedEvaluation.dimensions.harmony.features);
});

test("generateScore applies phase-5.10 rhythm counterpoint gates across review seeds", () => {
  for (const { seed } of PHASE_5_REVIEW_SEEDS) {
    const output = generateScore({ seed, lengthTicks: PHASE_5_LENGTH_TICKS });
    const gate = evaluatePhase510Diagnostics(seed, output.diagnostics);

    assert.deepEqual(gate.failures, []);
    assert.equal(gate.passed, true);
    assert.ok(gate.metrics.rhythmicIndependenceScore >= PHASE_5_10_DIAGNOSTICS_PROFILE.minRhythmicIndependenceScore);
    assert.ok(gate.metrics.unisonOverlapCount <= PHASE_5_10_DIAGNOSTICS_PROFILE.maxUnisonOverlapCount);
    assert.ok(gate.metrics.sameDirectionMotionCount <= PHASE_5_10_DIAGNOSTICS_PROFILE.maxSameDirectionMotionCount);
    assert.ok(gate.metrics.sharedRhythmOverlapCount <= PHASE_5_10_DIAGNOSTICS_PROFILE.maxSharedRhythmOverlapCount);
    assert.ok(
      gate.metrics.shortStrongBeatEntryNoteCount <= PHASE_5_10_DIAGNOSTICS_PROFILE.maxShortStrongBeatEntryNoteCount,
    );
    assert.ok(
      gate.metrics.entrySupportInstabilityCount <= PHASE_5_10_DIAGNOSTICS_PROFILE.maxEntrySupportInstabilityCount,
    );
  }
});

test("generateScore applies phase-5.11 margin gates across fixed and rotation seeds", () => {
  const seeds = [...PHASE_5_REVIEW_SEEDS, ...PHASE_5_11_ROTATION_SEEDS];

  for (const { seed } of seeds) {
    const output = generateScore({ seed, lengthTicks: PHASE_5_LENGTH_TICKS });
    const gate = evaluatePhase511Diagnostics(seed, output.diagnostics);

    assert.deepEqual(gate.failures, []);
    assert.equal(gate.passed, true);
    assert.ok(
      gate.metrics.counterSubjectIdentityRetention >= PHASE_5_11_DIAGNOSTICS_PROFILE.minCounterSubjectIdentityRetention,
    );
    assert.ok(gate.metrics.rhythmicIndependenceScore >= PHASE_5_11_DIAGNOSTICS_PROFILE.minRhythmicIndependenceScore);
    assert.ok(gate.metrics.unisonOverlapCount <= PHASE_5_11_DIAGNOSTICS_PROFILE.maxUnisonOverlapCount);
    assert.ok(gate.metrics.sameDirectionMotionCount <= PHASE_5_11_DIAGNOSTICS_PROFILE.maxSameDirectionMotionCount);
    assert.ok(gate.metrics.sharedRhythmOverlapCount <= PHASE_5_11_DIAGNOSTICS_PROFILE.maxSharedRhythmOverlapCount);
    assert.ok(gate.metrics.leapRecoveryMisses <= PHASE_5_11_DIAGNOSTICS_PROFILE.maxLeapRecoveryMisses);
    assert.ok(
      gate.metrics.shortStrongBeatEntryNoteCount <= PHASE_5_11_DIAGNOSTICS_PROFILE.maxShortStrongBeatEntryNoteCount,
    );
    assert.ok(
      gate.metrics.entrySupportInstabilityCount <= PHASE_5_11_DIAGNOSTICS_PROFILE.maxEntrySupportInstabilityCount,
    );
    assert.ok(
      gate.metrics.maxEntrySupportInstabilityPerEntry <=
        PHASE_5_11_DIAGNOSTICS_PROFILE.maxEntrySupportInstabilityPerEntry,
    );
    assert.ok(
      gate.metrics.maxConsecutiveEntrySupportInstabilities <=
        PHASE_5_11_DIAGNOSTICS_PROFILE.maxConsecutiveEntrySupportInstabilities,
    );
    assert.ok(
      gate.metrics.unresolvedEntrySupportInstabilityCount <=
        PHASE_5_11_DIAGNOSTICS_PROFILE.maxUnresolvedEntrySupportInstabilityCount,
    );
  }
});

test("generateScore applies phase-5.11 modal rotation seed gates", () => {
  for (const [seed, profile] of Object.entries(PHASE_5_11_DIAGNOSTICS_PROFILE.modalRotationSeeds)) {
    const output = generateScore({ seed, lengthTicks: PHASE_5_LENGTH_TICKS });

    assert.ok(output.diagnostics.counterSubjectIdentityRetention >= profile.minCounterSubjectIdentityRetention);
    assert.ok(output.diagnostics.sameDirectionMotionCount <= profile.maxSameDirectionMotionCount);
    assert.ok(output.diagnostics.leapRecoveryMisses <= profile.maxLeapRecoveryMisses);
    assert.ok(output.diagnostics.modalContextCount >= profile.minModalContextCount);
  }
});

test("generateScore reports phase-6 melody, entry, ornament, and solo diagnostics", () => {
  const output = generateScore({ seed: "fugue-smoke", lengthTicks: PHASE_5_LENGTH_TICKS });
  const firstContinuationStartTick = output.diagnostics.sectionPlans.find(
    (plan) => plan.state !== "exposition",
  )?.startTick;

  assert.ok(output.diagnostics.severeEntryIntervalCount > 0);
  assert.ok(output.diagnostics.unresolvedSevereEntryIntervalCount > 0);
  assert.equal(
    output.diagnostics.severeEntryIntervalCount,
    output.diagnostics.entrySupportSevereIntervalDetails.reduce((sum, detail) => sum + detail.severeIntervalCount, 0),
  );
  assert.ok(output.diagnostics.soloTexture.soloRunCount > 0);
  assert.ok(output.diagnostics.soloTexture.unsupportedSoloRunCount >= 0);
  assert.ok(output.diagnostics.soloTexture.abruptTextureDropCount >= 0);
  assert.ok(output.diagnostics.soloTexture.soloVoiceImbalance >= 0);
  assert.ok(output.diagnostics.ornamentPlacementReasons.total > 0);
  assert.ok(output.diagnostics.ornamentPlacementReasons.cadenceApproach > 0);
  assert.ok(
    (output.diagnostics.sectionPlans[0]?.durationTicks ?? 0) <= PHASE_6_DIAGNOSTICS_PROFILE.maxExpositionDurationTicks,
  );
  assert.ok((firstContinuationStartTick ?? 0) <= PHASE_6_DIAGNOSTICS_PROFILE.maxFirstContinuationStartTick);
});

test("generateScore applies phase-6 observation gate across fixed and rotation seeds", () => {
  const seeds = [...PHASE_5_REVIEW_SEEDS, ...PHASE_5_11_ROTATION_SEEDS];

  for (const { seed } of seeds) {
    const output = generateScore({ seed, lengthTicks: PHASE_5_LENGTH_TICKS });
    const gate = evaluatePhase6Diagnostics(seed, output.diagnostics);

    assert.deepEqual(gate.failures, []);
    assert.equal(gate.passed, true);
    assert.ok(gate.metrics.leapRecoveryMisses <= PHASE_6_DIAGNOSTICS_PROFILE.maxLeapRecoveryMisses);
    assert.ok(gate.metrics.samePitchOverlapCount <= PHASE_6_DIAGNOSTICS_PROFILE.maxSamePitchOverlapCount);
    assert.ok(gate.metrics.severeEntryIntervalCount <= PHASE_6_DIAGNOSTICS_PROFILE.maxSevereEntryIntervalCount);
    assert.ok(
      gate.metrics.unresolvedSevereEntryIntervalCount <=
        PHASE_6_DIAGNOSTICS_PROFILE.maxUnresolvedSevereEntryIntervalCount,
    );
    assert.ok(gate.metrics.unsupportedSoloRunCount <= PHASE_6_DIAGNOSTICS_PROFILE.maxUnsupportedSoloRunCount);
    assert.ok(gate.metrics.abruptTextureDropCount <= PHASE_6_DIAGNOSTICS_PROFILE.maxAbruptTextureDropCount);
    assert.ok(gate.metrics.soloVoiceImbalance <= PHASE_6_DIAGNOSTICS_PROFILE.maxSoloVoiceImbalance);
    assert.ok(gate.metrics.ornamentPlacementReasonCount >= PHASE_6_DIAGNOSTICS_PROFILE.minOrnamentPlacementReasonCount);
    assert.ok(gate.metrics.expositionDurationTicks <= PHASE_6_DIAGNOSTICS_PROFILE.maxExpositionDurationTicks);
    assert.ok(gate.metrics.firstContinuationStartTick <= PHASE_6_DIAGNOSTICS_PROFILE.maxFirstContinuationStartTick);
  }
});

test("generateScore reports phase-7 contour motion diagnostics", () => {
  const output = generateScore({ seed: "wide-key", lengthTicks: PHASE_5_LENGTH_TICKS });
  const { fourBeat, eightBeat } = output.diagnostics.pitchContourMotion;

  assert.equal(fourBeat.windowTicks, TICKS_PER_QUARTER * 4);
  assert.equal(eightBeat.windowTicks, TICKS_PER_QUARTER * 8);
  assert.ok(fourBeat.bassUpperComparisonCount > 0);
  assert.ok(eightBeat.bassUpperComparisonCount > 0);
  assert.equal(fourBeat.bassUpperSameDirectionRatio + fourBeat.bassUpperContraryRatio, 1);
  assert.equal(eightBeat.bassUpperSameDirectionRatio + eightBeat.bassUpperContraryRatio, 1);
  assert.ok(fourBeat.outerVoiceSameDirectionRatio >= 0);
  assert.ok(fourBeat.outerVoiceContraryRatio >= 0);
  assert.ok(output.diagnostics.selectedCandidateEvaluations.length > 0);
  assert.equal(output.diagnostics.selectedCandidateEvaluations[0]!.featureVersion, 1);
  assert.ok(output.diagnostics.selectedCandidateEvaluations[0]!.explanations.entries.length > 0);
  assert.ok(output.diagnostics.selectedCandidateEvaluations[0]!.explanations.voicePairs.length > 0);
  assert.ok(output.diagnostics.selectedCandidateEvaluations[0]!.explanations.sections.length > 0);
  assert.ok(
    "fourBeatBassUpperSameDirectionRatio" in
      output.diagnostics.selectedCandidateEvaluations[0]!.dimensions.texture.features,
  );
  assert.ok(
    "fourBeatBassUpperContraryRatio" in output.diagnostics.selectedCandidateEvaluations[0]!.dimensions.texture.features,
  );
});

test("generateScore applies phase-7 contour gates across fixed and rotation seeds", () => {
  const seeds = [...PHASE_5_REVIEW_SEEDS, ...PHASE_5_11_ROTATION_SEEDS];

  for (const { seed } of seeds) {
    const output = generateScore({ seed, lengthTicks: PHASE_5_LENGTH_TICKS });
    const gate = evaluatePhase7Diagnostics(seed, output.diagnostics);

    assert.deepEqual(gate.failures, []);
    assert.equal(gate.passed, true);
    assert.ok(
      gate.metrics.fourBeatBassUpperSameDirectionRatio <=
        PHASE_7_DIAGNOSTICS_PROFILE.maxFourBeatBassUpperSameDirectionRatio,
    );
    assert.ok(
      gate.metrics.fourBeatBassUpperContraryRatio >= PHASE_7_DIAGNOSTICS_PROFILE.minFourBeatBassUpperContraryRatio,
    );
    assert.ok(
      gate.metrics.eightBeatBassUpperSameDirectionRatio <=
        PHASE_7_DIAGNOSTICS_PROFILE.maxEightBeatBassUpperSameDirectionRatio,
    );
    assert.ok(
      gate.metrics.eightBeatBassUpperContraryRatio >= PHASE_7_DIAGNOSTICS_PROFILE.minEightBeatBassUpperContraryRatio,
    );
    assert.ok(
      gate.metrics.fourBeatOuterVoiceSameDirectionRatio <=
        PHASE_7_DIAGNOSTICS_PROFILE.maxFourBeatOuterVoiceSameDirectionRatio,
    );
    assert.ok(
      gate.metrics.fourBeatOuterVoiceContraryRatio >= PHASE_7_DIAGNOSTICS_PROFILE.minFourBeatOuterVoiceContraryRatio,
    );
    assert.ok(gate.metrics.fourBeatBassUpperComparisonCount >= PHASE_7_DIAGNOSTICS_PROFILE.minContourComparisonCount);
    assert.ok(gate.metrics.eightBeatBassUpperComparisonCount >= PHASE_7_DIAGNOSTICS_PROFILE.minContourComparisonCount);
  }
});

test("generateScore reduces phase-7 stepwise fifth-climb subject pressure", () => {
  const seeds = [...PHASE_5_REVIEW_SEEDS, ...PHASE_5_11_ROTATION_SEEDS];
  const regressionSeeds = [
    ["fugue-smoke", 143, 108, 100],
    ["lyrical-line", 145, 108, 100],
    ["modal-cadence", 149, 108, 91],
    ["wide-key", 143, 105, 97],
    ["tight-stretto", 160, 105, 97],
    ["contrary-answer", 145, 105, 97],
  ] as const;
  const protectedSeeds = [
    ["modal-answer", 33, 0.608],
    ["bright-answer", 30, 0.9],
    ["contrary-motion", 29, 0.9],
    ["modal-dorian", 27, 0.58],
    ["dense-modal", 33, 0.573],
    ["angular-answer", 33, 0.573],
  ] as const;
  const exactStepwiseFifthClimbPattern = "0-1-2-3-4-3-2-1";
  const turnbackFifthClimbPattern = "0-1-2-3-4-3-1-2";
  let exactStepwiseFifthClimbCount = 0;
  let turnbackFifthClimbCount = 0;

  for (const { seed } of seeds) {
    const output = generateScore({ seed, lengthTicks: PHASE_5_LENGTH_TICKS });
    const gate6 = evaluatePhase6Diagnostics(seed, output.diagnostics);
    const gate7 = evaluatePhase7Diagnostics(seed, output.diagnostics);
    const subjectPattern = output.diagnostics.subjectEntries[0]?.expectedDegreePattern.join("-");

    if (subjectPattern === exactStepwiseFifthClimbPattern) {
      exactStepwiseFifthClimbCount += 1;
    }
    if (subjectPattern === turnbackFifthClimbPattern) {
      turnbackFifthClimbCount += 1;
    }

    assert.deepEqual(gate6.failures, []);
    assert.deepEqual(gate7.failures, []);
    assert.equal(gate6.passed, true);
    assert.equal(gate7.passed, true);
  }

  assert.equal(exactStepwiseFifthClimbCount, 4);
  assert.equal(turnbackFifthClimbCount, 8);

  for (const [seed, maxInstabilityCount, maxSevereIntervalCount, maxUnresolvedSevereIntervalCount] of regressionSeeds) {
    const output = generateScore({ seed, lengthTicks: PHASE_5_LENGTH_TICKS });

    assert.ok(output.diagnostics.entrySupportInstabilityCount <= maxInstabilityCount);
    assert.ok(output.diagnostics.severeEntryIntervalCount <= maxSevereIntervalCount);
    assert.ok(output.diagnostics.unresolvedSevereEntryIntervalCount <= maxUnresolvedSevereIntervalCount);
  }

  for (const [seed, maxLeapRecoveryMisses, minCounterSubjectIdentityRetention] of protectedSeeds) {
    const output = generateScore({ seed, lengthTicks: PHASE_5_LENGTH_TICKS });

    assert.ok(output.diagnostics.leapRecoveryMisses <= maxLeapRecoveryMisses);
    assert.ok(output.diagnostics.counterSubjectIdentityRetention >= minCounterSubjectIdentityRetention);
  }
});

test("generateScore balances phase-7 entry harmony scoring with preservation guardrails", () => {
  const blockerSeeds = [
    ["fugue-smoke", 143, 108, 100, 3, 3, 3],
    ["modal-cadence", 149, 108, 91, 4, 3, 3],
    ["lyrical-line", 145, 108, 100, 3, 3, 3],
    ["tight-stretto", 160, 105, 97, 4, 3, 3],
    ["wide-key", 143, 105, 97, 3, 3, 3],
    ["contrary-answer", 145, 105, 97, 3, 3, 3],
  ] as const;

  for (const [
    seed,
    instabilityCount,
    severeIntervalCount,
    unresolvedSevereIntervalCount,
    selectedInstabilityCount,
    selectedSevereIntervalCount,
    selectedUnresolvedSevereIntervalCount,
  ] of blockerSeeds) {
    const output = generateScore({ seed, lengthTicks: PHASE_5_LENGTH_TICKS });
    const gate = evaluatePhase7Diagnostics(seed, output.diagnostics);
    const selectedEvaluation = requireSelectedCandidateEvaluation(output.diagnostics.selectedCandidateEvaluations);

    assert.deepEqual(gate.failures, []);
    assert.equal(gate.passed, true);
    assert.ok(output.diagnostics.entrySupportInstabilityCount <= instabilityCount);
    assert.ok(output.diagnostics.severeEntryIntervalCount <= severeIntervalCount);
    assert.ok(output.diagnostics.unresolvedSevereEntryIntervalCount <= unresolvedSevereIntervalCount);
    assert.equal(
      output.diagnostics.entrySupportInstabilityCount,
      output.diagnostics.entrySupportInstabilityDetails.reduce((sum, detail) => sum + detail.instabilityCount, 0),
    );
    assert.equal(
      output.diagnostics.severeEntryIntervalCount,
      output.diagnostics.entrySupportSevereIntervalDetails.reduce((sum, detail) => sum + detail.severeIntervalCount, 0),
    );
    assert.ok(selectedEvaluation.dimensions.harmony.cost > 0);
    assert.ok(selectedEvaluation.dimensions.harmony.features.selectedEntryHarmonyRiskCost > 0);
    assert.equal(selectedEvaluation.dimensions.harmony.features.entrySupportInstabilityCount, selectedInstabilityCount);
    assert.equal(selectedEvaluation.dimensions.harmony.features.severeEntryIntervalCount, selectedSevereIntervalCount);
    assert.equal(
      selectedEvaluation.dimensions.harmony.features.unresolvedSevereEntryIntervalCount,
      selectedUnresolvedSevereIntervalCount,
    );
    assert.ok(
      selectedEvaluation.explanations.entries.some(
        (entry) =>
          entry.instabilityCount === selectedInstabilityCount &&
          entry.severeIntervalCount === selectedSevereIntervalCount &&
          entry.unresolvedSevereIntervalCount === selectedUnresolvedSevereIntervalCount,
      ),
    );
  }
});

test("generateScore pins phase-7 voice-pair independence blocker evidence before scoring changes", () => {
  const blockerSeeds = [
    ["contrary-motion", 26, 521, 778, 4, 2, 26, 7, 54, 14],
    ["fugue-smoke", 36, 581, 834, 0, 0, 27, 7, 54, 12],
    ["minor-entry", 26, 736, 906, 0, 0, 50, 15, 70, 20],
    ["modal-answer", 13, 751, 906, 0, 0, 46, 14, 70, 20],
  ] as const;

  for (const [
    seed,
    samePitchOverlapCount,
    unisonOverlapCount,
    sharedRhythmOverlapCount,
    selectedSamePitchFeatureCount,
    selectedSamePitchExplanationCount,
    selectedUnisonFeatureCount,
    selectedUnisonExplanationCount,
    selectedSharedRhythmFeatureCount,
    selectedSharedRhythmExplanationCount,
  ] of blockerSeeds) {
    const output = generateScore({ seed, lengthTicks: PHASE_5_LENGTH_TICKS });
    const selectedEvaluation = requireSelectedCandidateEvaluation(output.diagnostics.selectedCandidateEvaluations);

    assert.equal(output.diagnostics.samePitchOverlapCount, samePitchOverlapCount);
    assert.equal(output.diagnostics.unisonOverlapCount, unisonOverlapCount);
    assert.equal(output.diagnostics.sharedRhythmOverlapCount, sharedRhythmOverlapCount);
    assert.equal(selectedEvaluation.dimensions.texture.features.samePitchOverlapCount, selectedSamePitchFeatureCount);
    assert.equal(selectedEvaluation.dimensions.texture.features.unisonOverlapCount, selectedUnisonFeatureCount);
    assert.equal(
      selectedEvaluation.dimensions.texture.features.sharedRhythmOverlapCount,
      selectedSharedRhythmFeatureCount,
    );
    assert.equal(
      maximum(selectedEvaluation.explanations.voicePairs.map((pair) => pair.samePitchOverlapCount)),
      selectedSamePitchExplanationCount,
    );
    assert.equal(
      maximum(selectedEvaluation.explanations.voicePairs.map((pair) => pair.unisonOverlapCount)),
      selectedUnisonExplanationCount,
    );
    assert.equal(
      maximum(selectedEvaluation.explanations.voicePairs.map((pair) => pair.sharedRhythmOverlapCount)),
      selectedSharedRhythmExplanationCount,
    );
  }
});

test("generateScore preserves phase-7 modal counter-subject retention guardrails", () => {
  const blockerSeeds = [
    ["modal-cadence", 0.573],
    ["dense-modal", 0.573],
    ["angular-answer", 0.591],
    ["modal-answer", 0.608],
    ["modal-dorian", 0.627],
  ] as const;

  for (const [seed, counterSubjectIdentityRetention] of blockerSeeds) {
    const output = generateScore({ seed, lengthTicks: PHASE_5_LENGTH_TICKS });
    const selectedEvaluation = requireSelectedCandidateEvaluation(output.diagnostics.selectedCandidateEvaluations);

    assert.ok(roundMetric(output.diagnostics.counterSubjectIdentityRetention) >= counterSubjectIdentityRetention);
    assert.ok(output.diagnostics.modalContextCount > 0);
    assert.ok("counterSubjectIdentityRetention" in selectedEvaluation.dimensions.subjectClarity.features);
  }
});

test("generateScore preserves phase-7 melody and form guardrails", () => {
  const blockerSeeds = [
    ["modal-answer", 33, 2, 1, 36, 13, 13, 2],
    ["contrary-motion", 29, 8, 4, 42, 15, 15, 8],
    ["modal-dorian", 27, 3, 1, 37, 13, 13, 8],
    ["bright-answer", 30, 7, 3, 37, 12, 12, 2],
    ["lyrical-line", 25, 3, 2, 42, 16, 16, 8],
  ] as const;

  for (const [
    seed,
    leapRecoveryMisses,
    selectedMelodyLeapRecoveryMisses,
    selectedVoiceLeapRecoveryMisses,
    soloRunCount,
    unsupportedSoloRunCount,
    abruptTextureDropCount,
    selectedSectionSoloTextureRisk,
  ] of blockerSeeds) {
    const output = generateScore({ seed, lengthTicks: PHASE_5_LENGTH_TICKS });
    const selectedEvaluation = requireSelectedCandidateEvaluation(output.diagnostics.selectedCandidateEvaluations);

    assert.ok(output.diagnostics.leapRecoveryMisses <= leapRecoveryMisses);
    assert.equal(selectedEvaluation.dimensions.melody.features.leapRecoveryMisses, selectedMelodyLeapRecoveryMisses);
    assert.equal(
      maximum(selectedEvaluation.explanations.voices.map((voice) => voice.leapRecoveryMisses)),
      selectedVoiceLeapRecoveryMisses,
    );
    assert.ok(output.diagnostics.soloTexture.soloRunCount <= soloRunCount);
    assert.ok(output.diagnostics.soloTexture.unsupportedSoloRunCount <= unsupportedSoloRunCount);
    assert.ok(output.diagnostics.soloTexture.abruptTextureDropCount <= abruptTextureDropCount);
    assert.equal(
      maximum(selectedEvaluation.explanations.sections.map((section) => section.soloTextureRisk)),
      selectedSectionSoloTextureRisk,
    );
    assert.ok(selectedEvaluation.explanations.sections.every((section) => section.cadenceTargetCount > 0));
    assert.ok("formRepetitionWarnings" in selectedEvaluation.dimensions.form.features);
  }
});

function countIssues(issues: readonly { code: string }[], code: string): number {
  return issues.filter((issue) => issue.code === code).length;
}

function asMetaEvent(event: ScoreEvent | undefined): MetaEvent {
  assert.equal(event?.kind, "meta");
  if (event === undefined || event.kind !== "meta") {
    throw new Error("expected a meta event");
  }

  return event;
}

function scoreMinutes(ticks: number): number {
  return ticks / (TICKS_PER_QUARTER * 90);
}

function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

function requireSelectedCandidateEvaluation(
  selectedCandidateEvaluations: ReturnType<typeof generateScore>["diagnostics"]["selectedCandidateEvaluations"],
) {
  const selectedEvaluation = selectedCandidateEvaluations[0];

  assert.ok(selectedEvaluation !== undefined);
  assert.equal(selectedEvaluation.featureVersion, 1);
  assert.equal(selectedEvaluation.evaluationModelVersion, 2);
  assert.ok(selectedEvaluation.explanations.entries.length > 0);
  assert.ok(selectedEvaluation.explanations.voicePairs.length > 0);
  assert.ok(selectedEvaluation.explanations.voices.length > 0);
  assert.ok(selectedEvaluation.explanations.sections.length > 0);

  return selectedEvaluation;
}

function maximum(values: readonly number[]): number {
  assert.ok(values.length > 0);
  return Math.max(...values);
}

function roundMetric(value: number): number {
  return Number(value.toFixed(3));
}
