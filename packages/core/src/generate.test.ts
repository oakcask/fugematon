import assert from "node:assert/strict";
import test from "node:test";
import {
  EXPOSITION_DIAGNOSTICS_PROFILE,
  EXPOSITION_REPRESENTATIVE_SEEDS,
  TICKS_PER_QUARTER,
  VOICES,
} from "./constants.js";
import type { KeySignature, MetaEvent, NoteEvent } from "./events.js";
import { generateScore } from "./generate.js";
import { asMetaEvent, cachedGenerateScore, countIssues } from "./generate-test-helpers.js";
import { reviewTest } from "./test-profile.js";
import {
  analyzeWritingProfileConstraints,
  constrainNotePitchToWritingProfile,
  resolveWritingProfile,
} from "./writing-profile.js";

const FUGUE_FORM_STATE_REVIEW_LENGTH_TICKS = TICKS_PER_QUARTER * 64;
const CONTINUOUS_FUGUE_REVIEW_LENGTH_TICKS = TICKS_PER_QUARTER * 32;

test("generateScore is deterministic for identical input", () => {
  const input = {
    seed: "bach-001",
    lengthTicks: 7680,
  };

  assert.deepEqual(generateScore(input), generateScore(input));
});

test("cachedGenerateScore does not share mutable result objects", () => {
  const input = {
    seed: "cache-isolation",
    lengthTicks: 960,
  };
  const first = cachedGenerateScore(input);
  const expected = cachedGenerateScore(input);

  first.events.push({ kind: "meta", type: "score-end", tick: 1, payload: { lengthTicks: 1 } });
  first.diagnostics.warnings.push("mutated by caller");

  assert.notStrictEqual(cachedGenerateScore(input), first);
  assert.deepEqual(cachedGenerateScore(input), expected);
});

test("generateScore defaults to the four-voice writing profile without changing explicit default output", () => {
  const implicit = generateScore({ seed: "bach-001", lengthTicks: 7680 });
  const explicit = generateScore({
    seed: "bach-001",
    lengthTicks: 7680,
    writingProfileId: "four-voice-default",
  });

  assert.deepEqual(explicit, implicit);
  assert.deepEqual(implicit.diagnostics.writingProfile, { id: "four-voice-default", version: 1 });
  assert.deepEqual(implicit.nextSegmentSnapshot.writingProfile, { id: "four-voice-default", version: 1 });
});

test("generateScore preserves the selected writing profile across continuous-fugue segments", () => {
  const first = generateScore({
    seed: "fugue-smoke",
    lengthTicks: 7680,
    mode: "continuous-fugue",
    segmentIndex: 0,
    writingProfileId: "music-box-n20",
  });
  const second = generateScore({
    seed: "fugue-smoke",
    lengthTicks: 7680,
    mode: "continuous-fugue",
    segmentIndex: 1,
    previousSegmentSnapshot: first.nextSegmentSnapshot,
  });

  assert.deepEqual(first.diagnostics.writingProfile, { id: "music-box-n20", version: 1 });
  assert.deepEqual(first.nextSegmentSnapshot.writingProfile, { id: "music-box-n20", version: 1 });
  assert.deepEqual(second.diagnostics.writingProfile, { id: "music-box-n20", version: 1 });
  assert.deepEqual(second.nextSegmentSnapshot.writingProfile, { id: "music-box-n20", version: 1 });
  assert.throws(
    () =>
      generateScore({
        seed: "fugue-smoke",
        lengthTicks: 7680,
        mode: "continuous-fugue",
        segmentIndex: 1,
        previousSegmentSnapshot: first.nextSegmentSnapshot,
        writingProfileId: "piano-two-hand",
      }),
    /core\.writing-profile\.snapshot-mismatch/,
  );
});

test("music-box writing profiles generate only supported pitches", () => {
  for (const writingProfileId of ["music-box-n20", "music-box-n40"] as const) {
    const output = generateScore({
      seed: "music-box-profile",
      lengthTicks: 7680,
      writingProfileId,
    });
    const profile = resolveWritingProfile(writingProfileId);
    const allowedPitches = new Set(profile.absolutePitchSet);
    const notes = output.events.filter((event): event is NoteEvent => event.kind === "note");

    assert.equal(output.diagnostics.writingProfilePitchViolations, 0);
    assert.equal(output.diagnostics.writingProfileConstraints.profileId, writingProfileId);
    assert.ok(notes.every((note) => allowedPitches.has(note.pitch)));
  }
});

test("music-box harmonic sonority diagnostics keep focused windows visible", () => {
  for (const seed of ["fugue-smoke", "angular-answer"] as const) {
    const output = generateScore({
      seed,
      lengthTicks: TICKS_PER_QUARTER * 16,
      writingProfileId: "music-box-n20",
      selectionModel: "section-local-planner",
    });

    assert.equal(output.diagnostics.writingProfilePitchViolations, 0);
    assert.ok(output.diagnostics.qualityVector.harmonicSonorities.focusedWindowCount > 0);
  }
});

test("constrained writing profiles preserve hard profile and entry contracts for the reported crossing seed", () => {
  for (const writingProfileId of ["music-box-n20", "music-box-n40", "four-voice-default"] as const) {
    const output = generateScore({
      seed: "seed-04fup6t-1rmrxhp",
      lengthTicks: 7680,
      writingProfileId,
    });
    const profile = resolveWritingProfile(writingProfileId);
    const notes = output.events.filter((event): event is NoteEvent => event.kind === "note");

    assert.equal(output.diagnostics.voiceCrossings, 0, `${writingProfileId} should avoid voice crossings`);
    assert.equal(output.diagnostics.rangeViolations, 0, `${writingProfileId} should avoid range violations`);
    assert.equal(
      output.diagnostics.writingProfilePitchViolations,
      0,
      `${writingProfileId} should avoid profile pitch violations`,
    );
    assert.equal(
      output.diagnostics.subjectIdentityViolations,
      0,
      `${writingProfileId} should preserve subject identity`,
    );
    assert.equal(output.diagnostics.answerPlanViolations, 0, `${writingProfileId} should preserve answer identity`);
    assert.equal(output.diagnostics.keyMetadataMismatches, 0, `${writingProfileId} should keep key metadata aligned`);
    assert.ok(
      notes.every((note) => constrainNotePitchToWritingProfile(note, profile) === note.pitch),
      `${writingProfileId} should make final profile projection a no-op`,
    );
    if (writingProfileId === "music-box-n20") {
      const q9ToQ12SopranoPitches = notes
        .filter(
          (note) =>
            note.voice === "soprano" &&
            note.startTick >= TICKS_PER_QUARTER * 9 &&
            note.startTick < TICKS_PER_QUARTER * 12,
        )
        .map((note) => note.pitch);
      assert.ok(
        q9ToQ12SopranoPitches.every((pitch) => pitch < 93),
        "music-box-n20 should not choose A6",
      );
    }
    assert.ok(
      output.diagnostics.generatorSearchTrace.candidates.some(
        (candidate) => candidate.candidateId === "score-writing-profile-final-projection-noop",
      ),
    );
  }
});

test("profile-aware harmonic feasibility preserves music-box structural support for the reported harmonic seed", () => {
  const focusedLengthTicks = TICKS_PER_QUARTER * 16;
  const summaries = (["music-box-n20", "four-voice-default", "harpsichord-manual"] as const).map((writingProfileId) => {
    const output = generateScore({
      seed: "seed-1wudr38-0fbqzth",
      lengthTicks: focusedLengthTicks,
      writingProfileId,
    });
    const counts = output.diagnostics.constraintSatisfactionReview.infeasibleConstraintCounts;
    return {
      writingProfileId,
      diagnostics: output.diagnostics,
      counts,
    };
  });
  const musicBox = summaries.find((summary) => summary.writingProfileId === "music-box-n20")!;
  const defaultProfile = summaries.find((summary) => summary.writingProfileId === "four-voice-default")!;

  for (const { writingProfileId, diagnostics } of summaries) {
    assert.equal(diagnostics.voiceCrossings, 0, `${writingProfileId} should avoid voice crossings`);
    assert.equal(diagnostics.rangeViolations, 0, `${writingProfileId} should avoid range violations`);
    assert.equal(
      diagnostics.writingProfilePitchViolations,
      0,
      `${writingProfileId} should avoid profile pitch violations`,
    );
    assert.equal(diagnostics.subjectIdentityViolations, 0, `${writingProfileId} should preserve subject identity`);
    const answerPlanCeiling = writingProfileId === "music-box-n20" ? 2 : 0;
    assert.ok(
      diagnostics.answerPlanViolations <= answerPlanCeiling,
      `${writingProfileId} should keep answer identity within the profile-aware ceiling`,
    );
    assert.equal(diagnostics.keyMetadataMismatches, 0, `${writingProfileId} should keep key metadata aligned`);
    assert.equal(diagnostics.unresolvedDissonanceCount, 0, `${writingProfileId} should avoid hard dissonance failures`);
    if (writingProfileId === "music-box-n20") {
      assert.equal(diagnostics.samePitchOverlapCount, 0, `${writingProfileId} should repair exact same-pitch overlaps`);
    }
    const sustainedCeiling = writingProfileId === "music-box-n20" ? 16 : 4;
    assert.ok(
      diagnostics.dissonanceTriage.sustainedSevereVerticalDissonanceCount <= sustainedCeiling,
      `${writingProfileId} should stay below the focused sustained-dissonance ceiling`,
    );
  }
  assert.equal(musicBox.counts.nonChordStructuralSupportCount, 0);
  assert.ok(musicBox.diagnostics.qualityVector.harmonicSonorities.generatorResponseWindowCount <= 20);
  assert.equal(
    defaultProfile.diagnostics.dissonanceTriage.windows.some(
      (window) =>
        window.classification === "sustained-semitone-stack" &&
        JSON.stringify([...(window.pitches ?? [])].sort((left, right) => left - right)) ===
          JSON.stringify([41, 52, 64, 77]),
    ),
    false,
    "four-voice-default should not keep the reported F2-E3-E4-F5 held stack",
  );
});

reviewTest("music-box n20 preserves reported focused entry and profile hard contracts", () => {
  const output = generateScore({
    seed: "seed-1wudr38-0fbqzth",
    lengthTicks: TICKS_PER_QUARTER * 24,
    writingProfileId: "music-box-n20",
  });

  assert.equal(output.diagnostics.voiceCrossings, 0);
  assert.ok(output.diagnostics.answerPlanViolations <= 5);
  assert.equal(output.diagnostics.rangeViolations, 0);
  assert.equal(output.diagnostics.writingProfilePitchViolations, 0);
  assert.equal(output.diagnostics.subjectIdentityViolations, 0);
  assert.equal(output.diagnostics.keyMetadataMismatches, 0);
});

test("writing profile diagnostics catch synthetic music-box and piano playability violations", () => {
  const musicBoxProfile = resolveWritingProfile("music-box-n20");
  const musicBoxDiagnostics = analyzeWritingProfileConstraints(
    [
      syntheticNote({ voice: "soprano", pitch: 61, startTick: 0 }),
      syntheticNote({ voice: "alto", pitch: 60, startTick: 0 }),
      syntheticNote({ voice: "tenor", pitch: 62, startTick: 0 }),
      syntheticNote({ voice: "bass", pitch: 64, startTick: 0 }),
      syntheticNote({ voice: "soprano", pitch: 65, startTick: 0 }),
      syntheticNote({ voice: "alto", pitch: 60, startTick: TICKS_PER_QUARTER / 4 }),
    ],
    musicBoxProfile,
  );

  assert.ok(musicBoxDiagnostics.writingProfilePitchViolations > 0);
  assert.equal(musicBoxDiagnostics.unavailablePitchClassCount, 1);
  assert.ok(musicBoxDiagnostics.musicBoxSimultaneityViolations > 0);
  assert.ok(musicBoxDiagnostics.musicBoxRepeatRateViolations > 0);

  const pianoDiagnostics = analyzeWritingProfileConstraints(
    [
      syntheticNote({ voice: "bass", pitch: 36, startTick: 0 }),
      syntheticNote({ voice: "tenor", pitch: 60, startTick: 0 }),
    ],
    resolveWritingProfile("piano-two-hand"),
  );

  assert.ok(pianoDiagnostics.handSpanViolations > 0);
  assert.ok(pianoDiagnostics.windows.some((window) => window.reason.includes("hand-span")));
});

test("generateScore changes seed-derived metadata for different seeds", () => {
  const first = generateScore({ seed: "bach-001", lengthTicks: 7680 });
  const second = generateScore({ seed: "bach-002", lengthTicks: 7680 });

  assert.notDeepEqual(first.events, second.events);
});

test("generateScore emits a tick-based exposition", () => {
  const output = generateScore({ seed: "exposition-contract", lengthTicks: 960 });
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
  assert.equal(output.diagnostics.generatorSearchTrace.mode, "solver");
  assert.ok(output.diagnostics.generatorSearchTrace.evaluatedCandidateCount >= 2);
  assert.notEqual(output.diagnostics.generatorSearchTrace.selectedCandidateId, "legacy-generated-score");
  assert.equal(output.diagnostics.generatorSearchTrace.rejectedCandidateCount, 0);
  assert.ok(
    output.diagnostics.generatorSearchTrace.candidates.some((candidate) =>
      candidate.candidateId.startsWith("exposition-"),
    ),
  );
  assert.ok(
    output.diagnostics.generatorSearchTrace.candidates.every(
      (candidate) =>
        (candidate.candidateId.startsWith("exposition-") || candidate.candidateId.startsWith("score-")) &&
        candidate.windowStartTick >= 0 &&
        candidate.windowEndTick > candidate.windowStartTick &&
        candidate.hardFailures.length === 0,
    ),
  );
  assert.equal(countIssues(output.diagnostics.issues, "range-violation"), output.diagnostics.rangeViolations);
  assert.equal(countIssues(output.diagnostics.issues, "voice-crossing"), output.diagnostics.voiceCrossings);
  assert.equal(countIssues(output.diagnostics.issues, "parallel-perfect"), output.diagnostics.parallelPerfects);
});

test("generateScore validates reproducibility inputs", () => {
  assert.throws(() => generateScore({ seed: "", lengthTicks: 960 }), /seed/);
  assert.throws(() => generateScore({ seed: "x", lengthTicks: 0 }), /lengthTicks/);
  assert.throws(
    () => generateScore({ seed: "x", lengthTicks: 960, writingProfileId: "unknown-profile" as never }),
    /core\.writing-profile\.invalid-id/,
  );
});

test("generateScore keeps public event and diagnostics counts aligned", () => {
  const output = generateScore({
    seed: "event-contract",
    lengthTicks: 7680,
  });
  const notes = output.events.filter((event): event is NoteEvent => event.kind === "note");
  const stateChanges = output.events.filter(
    (event): event is Extract<MetaEvent, { type: "state-change" }> =>
      event.kind === "meta" && event.type === "state-change",
  );

  assert.equal(output.diagnostics.eventCount, output.events.length);
  assert.equal(output.diagnostics.noteCount, notes.length);
  assert.deepEqual(
    stateChanges.map((event) => event.payload.state),
    output.diagnostics.stateTransitions,
  );
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

reviewTest("generateScore extends focused scores with fugue-form states", () => {
  const output = generateScore({ seed: "fugue-smoke", lengthTicks: FUGUE_FORM_STATE_REVIEW_LENGTH_TICKS });
  const stateChanges = output.events.filter(
    (event): event is Extract<MetaEvent, { type: "state-change" }> =>
      event.kind === "meta" && event.type === "state-change",
  );

  assert.ok(output.diagnostics.generatedUntilTick >= FUGUE_FORM_STATE_REVIEW_LENGTH_TICKS);
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
  assert.ok(
    output.diagnostics.generatorSearchTrace.candidates.some(
      (candidate) => candidate.candidateId.startsWith("section-") && candidate.candidateId.includes("-episode-"),
    ),
  );
  assert.ok(
    output.diagnostics.generatorSearchTrace.candidates.some(
      (candidate) =>
        candidate.candidateId.startsWith("section-") &&
        (candidate.reason.includes("episode-") || candidate.reason.includes("free-counterpoint-")),
    ),
  );
  assert.ok(
    output.diagnostics.generatorSearchTrace.candidates.some(
      (candidate) => candidate.candidateId.startsWith("section-") && candidate.reason.includes("terminal-support-"),
    ),
  );
  assert.equal(output.diagnostics.terminalClosureReview.classification, "not-required");
});

reviewTest("generateScore continues continuous-fugue segments from a carried snapshot", () => {
  const first = generateScore({
    seed: "fugue-smoke",
    lengthTicks: CONTINUOUS_FUGUE_REVIEW_LENGTH_TICKS,
    mode: "continuous-fugue",
    segmentIndex: 0,
  });
  const second = generateScore({
    seed: "fugue-smoke",
    lengthTicks: CONTINUOUS_FUGUE_REVIEW_LENGTH_TICKS,
    mode: "continuous-fugue",
    segmentIndex: 1,
    previousSegmentSnapshot: first.nextSegmentSnapshot,
  });
  const firstStateChange = second.events.find(
    (event): event is Extract<MetaEvent, { type: "state-change" }> =>
      event.kind === "meta" && event.type === "state-change",
  );

  assert.equal(first.nextSegmentSnapshot.segmentIndex, 0);
  assert.equal(second.nextSegmentSnapshot.segmentIndex, 1);
  assert.equal(first.diagnostics.generatorSearchTrace.mode, "solver");
  assert.ok(first.diagnostics.generatorSearchTrace.evaluatedCandidateCount >= 2);
  assert.equal(second.diagnostics.generatorSearchTrace.mode, "solver");
  assert.ok(second.diagnostics.generatorSearchTrace.evaluatedCandidateCount >= 2);
  assert.notEqual(second.diagnostics.generatorSearchTrace.selectedCandidateId, "legacy-generated-score");
  assert.ok(
    second.diagnostics.generatorSearchTrace.candidates.some(
      (candidate) =>
        candidate.candidateId.startsWith("segment-1-boundary-continuation-") &&
        candidate.windowStartTick === 0 &&
        candidate.windowEndTick > candidate.windowStartTick &&
        Array.isArray(candidate.hardFailures) &&
        typeof candidate.softCost === "number" &&
        candidate.reason.includes("segment-boundary-"),
    ),
  );
  assert.notEqual(firstStateChange?.payload.state, "exposition");
  assert.notEqual(second.diagnostics.sectionPlans[0]?.state, "exposition");
  assert.ok(second.diagnostics.continuousSegmentContinuity.carriedSubjectFamily);
  assert.notEqual(second.diagnostics.continuousSegmentContinuity.classification, "generator-response-required-reset");
  assert.notDeepEqual(
    second.diagnostics.subjectEntries.slice(0, 4).map((entry) => [entry.voice, entry.state]),
    [
      ["alto", "exposition"],
      ["soprano", "exposition"],
      ["tenor", "exposition"],
      ["bass", "exposition"],
    ],
  );
  assert.deepEqual(
    generateScore({
      seed: "fugue-smoke",
      lengthTicks: CONTINUOUS_FUGUE_REVIEW_LENGTH_TICKS,
      mode: "continuous-fugue",
      segmentIndex: 1,
      previousSegmentSnapshot: first.nextSegmentSnapshot,
    }),
    second,
  );
});

test("generateScore consumes carried PRNG state for continuous-fugue continuation choices", () => {
  const first = generateScore({
    seed: "fugue-smoke",
    lengthTicks: 7680,
    mode: "continuous-fugue",
    segmentIndex: 0,
  });
  const continuationInput = {
    seed: "fugue-smoke",
    lengthTicks: 7680,
    mode: "continuous-fugue" as const,
    segmentIndex: 1,
    previousSegmentSnapshot: first.nextSegmentSnapshot,
  };
  const baseline = generateScore(continuationInput);
  const alteredPrngSnapshot = {
    ...first.nextSegmentSnapshot,
    prngInternalState: {
      ...first.nextSegmentSnapshot.prngInternalState,
      state: [1, 2, 3, 4] as [number, number, number, number],
    },
  };
  const altered = generateScore({
    ...continuationInput,
    previousSegmentSnapshot: alteredPrngSnapshot,
  });

  assert.deepEqual(generateScore(continuationInput), baseline);
  assert.notEqual(altered.diagnostics.continuousSegmentContinuity.classification, "generator-response-required-reset");
  assert.equal(altered.diagnostics.continuousSegmentContinuity.carriedSubjectFamily, true);
  assert.notDeepEqual(
    altered.nextSegmentSnapshot.prngInternalState.state,
    baseline.nextSegmentSnapshot.prngInternalState.state,
  );
});

test("generateScore treats continuous-fugue segment zero as initial boundary context", () => {
  const first = generateScore({
    seed: "seed-10tymfq-0udkhlm",
    lengthTicks: 7680,
    mode: "continuous-fugue",
    segmentIndex: 0,
  });
  const second = generateScore({
    seed: "seed-10tymfq-0udkhlm",
    lengthTicks: 7680,
    mode: "continuous-fugue",
    segmentIndex: 1,
    previousSegmentSnapshot: first.nextSegmentSnapshot,
  });

  assert.equal(first.diagnostics.sectionPlans[0]?.state, "exposition");
  assert.equal(first.diagnostics.continuousSegmentContinuity.classification, "accepted-continuation");
  assert.equal(first.diagnostics.continuousSegmentContinuity.carriedSubjectFamily, false);
  assert.equal(first.diagnostics.continuousSegmentContinuity.pianoRollSessionTimelineContinuous, true);
  assert.ok(
    ["accepted-continuation", "prepared-stretto", "developmental-episode"].includes(
      second.diagnostics.continuousSegmentContinuity.classification,
    ),
  );
  assert.equal(second.diagnostics.continuousSegmentContinuity.carriedSubjectFamily, true);
});

reviewTest("generateScore exposes audible carry for the reported continuous-fugue boundary", () => {
  const first = generateScore({
    seed: "seed-1f6nfdt-0sv4of6",
    lengthTicks: CONTINUOUS_FUGUE_REVIEW_LENGTH_TICKS,
    mode: "continuous-fugue",
    segmentIndex: 0,
  });
  const second = generateScore({
    seed: "seed-1f6nfdt-0sv4of6",
    lengthTicks: CONTINUOUS_FUGUE_REVIEW_LENGTH_TICKS,
    mode: "continuous-fugue",
    segmentIndex: 1,
    previousSegmentSnapshot: first.nextSegmentSnapshot,
  });
  const carry = second.diagnostics.continuousBoundaryCarry;

  assert.ok(
    ["developmental-episode", "prepared-subject-return"].includes(
      second.diagnostics.continuousSegmentContinuity.classification,
    ),
  );
  assert.match(carry.classification, /^(carried-line-continuation|prepared-reentry)$/);
  assert.notEqual(carry.classification, "generator-response-required-hard-restart");
  assert.notEqual(carry.classification, "review-required-thin-boundary");
  assert.ok(
    carry.carriedVoices.length +
      carry.suspendedOrResolvingVoices.length +
      carry.pedalVoices.length +
      carry.staggeredVoices.length >
      0,
  );
});

test("generateScore repairs synthetic thin-tail continuous-fugue hard restarts", () => {
  const first = generateScore({
    seed: "fugue-smoke",
    lengthTicks: 7680,
    mode: "continuous-fugue",
    segmentIndex: 0,
  });
  const previousSegmentSnapshot = {
    ...first.nextSegmentSnapshot,
    cadencePreparation: {
      ...first.nextSegmentSnapshot.cadencePreparation,
      unresolved: true,
      targetKind: "half" as const,
    },
    densityArc: {
      ...first.nextSegmentSnapshot.densityArc,
      currentVoiceCount: 1,
      recentVoiceCounts: [1],
    },
    boundedPastEventContext: {
      ...first.nextSegmentSnapshot.boundedPastEventContext,
      events: [
        {
          kind: "note" as const,
          voice: "bass" as const,
          startTick: -TICKS_PER_QUARTER * 2,
          durationTicks: TICKS_PER_QUARTER,
          pitch: 48,
          velocity: 62,
          role: "free-counterpoint" as const,
          metricalHarmonyIntent: "structural-root-support" as const,
        },
      ],
      voiceRoleContinuity: [],
    },
  };
  const second = generateScore({
    seed: "fugue-smoke",
    lengthTicks: 7680,
    mode: "continuous-fugue",
    segmentIndex: 1,
    previousSegmentSnapshot,
  });

  assert.match(
    second.diagnostics.continuousBoundaryCarry.classification,
    /^(carried-line-continuation|prepared-reentry|generator-response-required-hard-restart)$/,
  );
  const traceCandidateIds = new Set(
    second.diagnostics.generatorSearchTrace.candidates.map((candidate) => candidate.candidateId),
  );
  assert.ok([...traceCandidateIds].some((candidateId) => candidateId.startsWith("segment-1-boundary-continuation-")));
  assert.ok(
    second.diagnostics.generatorSearchTrace.candidates.some(
      (candidate) =>
        candidate.candidateId.startsWith("segment-1-boundary-continuation-") &&
        candidate.reason.includes("segment-boundary-"),
    ),
  );
  assert.ok(
    second.diagnostics.generatorSearchTrace.candidates.some(
      (candidate) =>
        candidate.candidateId.startsWith("segment-1-boundary-continuation-") &&
        candidate.selected &&
        candidate.hardFailureCount === 0 &&
        candidate.reason.includes("segment-boundary-"),
    ),
  );
});

test("generateScore uses carried planner hint and tonal region for continuous-fugue continuation", () => {
  const first = generateScore({
    seed: "wide-key",
    lengthTicks: 7680,
    mode: "continuous-fugue",
    segmentIndex: 0,
  });
  const carriedKey = { tonic: "D", mode: "minor" } satisfies KeySignature;
  const previousSegmentSnapshot = {
    ...first.nextSegmentSnapshot,
    tonalRegion: {
      ...first.nextSegmentSnapshot.tonalRegion,
      currentKey: carriedKey,
      targetKey: carriedKey,
    },
    densityArc: {
      ...first.nextSegmentSnapshot.densityArc,
      currentVoiceCount: 2,
      recentVoiceCounts: [2],
    },
    sectionPlannerState: {
      ...first.nextSegmentSnapshot.sectionPlannerState,
      currentState: "stretto-like" as const,
      nextStateHint: "stretto-like" as const,
      stateHistory: [...first.nextSegmentSnapshot.sectionPlannerState.stateHistory, "stretto-like" as const],
    },
  };
  const second = generateScore({
    seed: "wide-key",
    lengthTicks: 7680,
    mode: "continuous-fugue",
    segmentIndex: 1,
    previousSegmentSnapshot,
  });

  assert.equal(second.diagnostics.sectionPlans[0]?.state, "subject-return");
  assert.deepEqual(second.diagnostics.sectionPlans[0]?.departureKey, carriedKey);
  assert.equal(second.diagnostics.continuousSegmentContinuity.previousTailState, "stretto-like");
  assert.equal(second.diagnostics.continuousSegmentContinuity.nextFirstState, "subject-return");
  assert.equal(second.diagnostics.continuousSegmentContinuity.classification, "prepared-subject-return");
});

test("generateScore flags continuous-fugue segment restarts when no snapshot is carried", () => {
  const output = generateScore({
    seed: "fugue-smoke",
    lengthTicks: 7680,
    mode: "continuous-fugue",
    segmentIndex: 1,
  });

  assert.equal(output.diagnostics.sectionPlans[0]?.state, "exposition");
  assert.equal(output.diagnostics.continuousSegmentContinuity.classification, "generator-response-required-reset");
  assert.equal(output.diagnostics.continuousSegmentContinuity.carriedSubjectFamily, false);
  assert.deepEqual(
    output.diagnostics.continuousSegmentContinuity.firstEntries.map((entry) => [entry.voice, entry.state]),
    [
      ["alto", "exposition"],
      ["soprano", "exposition"],
      ["tenor", "exposition"],
      ["bass", "exposition"],
    ],
  );
});

test("endless-program segment generation remains a fresh terminal segment without snapshot continuation", () => {
  const first = generateScore({
    seed: "fugue-smoke",
    lengthTicks: 7680,
    mode: "endless-program",
    segmentIndex: 1,
  });

  assert.equal(first.diagnostics.sectionPlans[0]?.state, "exposition");
  assert.equal(first.diagnostics.terminalClosureReview.classification, "accepted");
});

test("generateScore emits section plans with bounded harmonic anchors", () => {
  const output = generateScore({ seed: "section-plan-contract", lengthTicks: TICKS_PER_QUARTER * 32 });
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

test("generateScore validates representative exposition seeds", () => {
  for (const { seed, category } of EXPOSITION_REPRESENTATIVE_SEEDS) {
    const output = generateScore({ seed, lengthTicks: 7680 });
    const notes = output.events.filter((event): event is NoteEvent => event.kind === "note");

    assert.ok(category === "fixed" || category === "boundary");
    assert.ok(output.diagnostics.generatedUntilTick >= 7680);
    assert.equal(output.diagnostics.subjectEntries.length, 4);
    assert.deepEqual(new Set(notes.map((note) => note.voice)), new Set(VOICES));
    assert.equal(output.diagnostics.rangeViolations, EXPOSITION_DIAGNOSTICS_PROFILE.rangeViolations);
    assert.equal(output.diagnostics.voiceCrossings, EXPOSITION_DIAGNOSTICS_PROFILE.voiceCrossings);
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

function syntheticNote(input: { voice: NoteEvent["voice"]; pitch: number; startTick: number }): NoteEvent {
  return {
    kind: "note",
    voice: input.voice,
    startTick: input.startTick,
    durationTicks: TICKS_PER_QUARTER,
    pitch: input.pitch,
    velocity: 64,
    role: "free-counterpoint",
  };
}
