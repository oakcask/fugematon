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
  PHASE_5_DIAGNOSTICS_PROFILE,
  PHASE_5_LENGTH_TICKS,
  PHASE_5_REVIEW_SEEDS,
  TICKS_PER_QUARTER,
  VOICES,
} from "./constants.js";
import type { MetaEvent, NoteEvent, ScoreEvent } from "./events.js";
import { generateScore } from "./generate.js";

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

  assert.ok(output.diagnostics.counterSubjectCoverage >= 0.5);
  assert.ok(output.diagnostics.freeCounterpointCoverage >= 0.5);
  assert.equal(output.diagnostics.fallbackPassageCount, 0);
  assert.equal(output.diagnostics.melodicStagnationWarnings, 0);
  assert.ok(output.diagnostics.leapRecoveryMisses <= 12);
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
