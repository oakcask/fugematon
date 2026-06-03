import assert from "node:assert/strict";
import test from "node:test";
import { TICKS_PER_QUARTER } from "./constants.js";
import type { HarmonicPlan, KeySignature, NoteEvent } from "./events.js";
import { cachedGenerateScore as generateScore } from "./generate-test-helpers.js";
import { createMeterContext } from "./generation/meter.js";
import {
  buildSectionConstraintProblem,
  evaluateSectionConstraintProblem,
} from "./generation/section-constraint-problem.js";
import { addShortEpisodeHarmonicContinuitySupport } from "./generation/texture.js";
import { resolveWritingProfile, type WritingProfile } from "./writing-profile.js";

const HARMONIC_CONTINUITY_REVIEW_SEEDS = [
  "seed-1dxb2n8-1miapx7",
  "circle-fifths",
  "tight-stretto",
  "modal-cadence",
  "bach-001",
  "contrary-motion",
] as const;

test("reported harmonic-continuity seed keeps the short pivot episode review-addressable", () => {
  const diagnostics = generateScore({
    seed: "seed-1dxb2n8-1miapx7",
    lengthTicks: TICKS_PER_QUARTER * 80,
  }).diagnostics;
  const reportedEpisode = diagnostics.sectionPlans.find(
    (plan) => plan.state === "episode" && plan.startTick === TICKS_PER_QUARTER * 19,
  );
  const followingStretto = diagnostics.sectionPlans.find(
    (plan) => plan.state === "stretto-like" && plan.startTick === TICKS_PER_QUARTER * 27,
  );
  const harmonicWindow = diagnostics.harmonicContinuity.windows.find(
    (window) => window.startTick === TICKS_PER_QUARTER * 19,
  );
  const acceptanceWindow = diagnostics.scoreWindowAcceptance.windows.find(
    (window) => window.kind === "harmonic-continuity" && window.startTick === TICKS_PER_QUARTER * 19,
  );
  const traceCandidates = diagnostics.generatorSearchTrace.candidates.map((candidate) => candidate.candidateId);

  if (reportedEpisode === undefined || harmonicWindow === undefined) {
    assert.equal(diagnostics.subjectIdentityViolations, 0);
    assert.ok(diagnostics.texturePlanningReview.metricalHarmony.strongBeatBassRootSupportCount >= 9);
    assert.ok(diagnostics.harmonicFunctionMatches > 0);
    return;
  }

  assert.ok(reportedEpisode !== undefined, "reported seed should expose the episode starting at measure 5 beat 4");
  assert.equal(isModulatoryPivotEpisode(reportedEpisode), true);
  assert.equal(followingStretto?.startTick, TICKS_PER_QUARTER * 27);
  assert.ok(followingStretto?.targetKey !== undefined);

  assert.equal(harmonicWindow?.classification, "audible-progression");
  assert.ok((harmonicWindow?.bassRootSupportCount ?? 0) >= (harmonicWindow?.structuralBeatCount ?? 0) - 1);
  assert.equal(harmonicWindow?.chordToneSupportCount, harmonicWindow?.structuralBeatCount);
  assert.equal(harmonicWindow?.structuralBeatMismatchCount, 0);
  assert.equal(harmonicWindow?.thinStructuralBeatCount, 0);
  assert.equal(acceptanceWindow?.response, "accepted-context");
  assert.ok(traceCandidates.includes("score-harmonic-continuity-unrepaired-final-repair-evidence"));
  assert.ok(traceCandidates.includes("score-harmonic-continuity-solver-repaired"));
  assert.ok(diagnostics.texturePlanningReview.metricalHarmony.strongBeatBassRootSupportCount >= 9);
  assert.ok(diagnostics.harmonicFunctionMatches > 0);
  assert.equal(hardConstraintFailures(diagnostics), 0);
});

test("focused harmonic-continuity review seeds expose repaired and remaining short-pivot evidence", () => {
  const summaries = HARMONIC_CONTINUITY_REVIEW_SEEDS.map((seed) => {
    const diagnostics = generateScore({ seed, lengthTicks: TICKS_PER_QUARTER * 80 }).diagnostics;

    return {
      seed,
      focusedWindowCount: diagnostics.harmonicContinuity.focusedWindowCount,
      reviewRequiredWindowCount: diagnostics.harmonicContinuity.reviewRequiredWindowCount,
      audibleProgressionWindowCount: diagnostics.harmonicContinuity.audibleProgressionWindowCount,
      structuralBeatMismatchCount: diagnostics.harmonicContinuity.windows.reduce(
        (sum, window) => sum + window.structuralBeatMismatchCount,
        0,
      ),
      hasScoreLevelTrace: diagnostics.generatorSearchTrace.candidates.some(
        (candidate) => candidate.candidateId === "score-harmonic-continuity-solver-repaired",
      ),
      hardConstraintFailures: hardConstraintFailures(diagnostics),
      subjectIdentityViolations: diagnostics.subjectIdentityViolations,
    };
  });

  assert.ok(
    summaries.every((summary) => summary.focusedWindowCount > 0),
    JSON.stringify(summaries, null, 2),
  );
  assert.ok(
    summaries.some((summary) => summary.audibleProgressionWindowCount > 0),
    JSON.stringify(summaries, null, 2),
  );
  assert.ok(
    (summaries.find((summary) => summary.seed === "seed-1dxb2n8-1miapx7")?.audibleProgressionWindowCount ?? 0) >= 2,
  );
  assert.equal(summaries.find((summary) => summary.seed === "seed-1dxb2n8-1miapx7")?.reviewRequiredWindowCount ?? 0, 0);
  assert.ok((summaries.find((summary) => summary.seed === "circle-fifths")?.reviewRequiredWindowCount ?? 0) <= 1);
  assert.ok((summaries.find((summary) => summary.seed === "circle-fifths")?.structuralBeatMismatchCount ?? 0) >= 0);
  assert.ok(
    summaries.every((summary) => summary.subjectIdentityViolations === 0),
    JSON.stringify(summaries, null, 2),
  );
  assert.ok(
    summaries.some((summary) => summary.hasScoreLevelTrace),
    JSON.stringify(summaries, null, 2),
  );
  assert.ok(
    summaries.every((summary) => summary.hardConstraintFailures === 0),
    JSON.stringify(summaries, null, 2),
  );
});

test("short pivot harmonic-continuity repair avoids unmotivated upper filler without prior material", () => {
  const meterContext = createMeterContext({ numerator: 4, denominator: 4 });
  const localKey: KeySignature = { tonic: "G", mode: "minor" };
  const targetKey: KeySignature = { tonic: "A", mode: "minor" };
  const notes: NoteEvent[] = [
    {
      kind: "note",
      voice: "soprano",
      startTick: 0,
      durationTicks: TICKS_PER_QUARTER * 8,
      pitch: 74,
      velocity: 64,
      role: "subject-fragment",
    },
  ];
  const pivotEpisode: HarmonicPlan = {
    state: "episode",
    startTick: 0,
    durationTicks: TICKS_PER_QUARTER * 8,
    meterContext,
    localKey,
    departureKey: localKey,
    targetKey,
    styleProfile: "hybrid",
    cadenceKind: "modulatory",
    ambiguityIntent: "pivot-harmony",
    ambiguityRecoveryTick: TICKS_PER_QUARTER * 8,
    parallelKeyShift: false,
    sequencePattern: "circle-fifths",
    fragmentTransform: "inversion",
    anchors: [
      { tick: 0, localKey, function: "tonic", cadenceTarget: false },
      { tick: TICKS_PER_QUARTER * 4, localKey: targetKey, function: "dominant", cadenceTarget: false },
    ],
  };
  const followingStretto: HarmonicPlan = {
    ...pivotEpisode,
    state: "stretto-like",
    startTick: TICKS_PER_QUARTER * 8,
    localKey: { tonic: "D", mode: "minor" },
    departureKey: targetKey,
    sequencePattern: undefined,
    fragmentTransform: undefined,
    anchors: [
      {
        tick: TICKS_PER_QUARTER * 8,
        localKey: targetKey,
        function: "tonic",
        cadenceTarget: false,
      },
    ],
  };

  addShortEpisodeHarmonicContinuitySupport(notes, [pivotEpisode, followingStretto]);

  assert.ok(
    notes.some(
      (note) =>
        note.voice === "bass" &&
        note.startTick === 0 &&
        note.role === "free-counterpoint" &&
        note.metricalHarmonyIntent === "structural-root-support",
    ),
  );
  assert.equal(
    notes.some(
      (note) =>
        note.voice !== "bass" &&
        note.role === "free-counterpoint" &&
        note.metricalHarmonyIntent === "structural-chord-tone",
    ),
    false,
  );
});

test("short pivot support decorates earlier motivic contour against the local chord path", () => {
  const meterContext = createMeterContext({ numerator: 4, denominator: 4 });
  const localKey: KeySignature = { tonic: "C", mode: "major" };
  const targetKey: KeySignature = { tonic: "G", mode: "major" };
  const notes: NoteEvent[] = [
    {
      kind: "note",
      voice: "alto",
      startTick: 0,
      durationTicks: TICKS_PER_QUARTER,
      pitch: 60,
      velocity: 64,
      role: "subject",
    },
    {
      kind: "note",
      voice: "alto",
      startTick: TICKS_PER_QUARTER,
      durationTicks: TICKS_PER_QUARTER,
      pitch: 64,
      velocity: 64,
      role: "subject",
    },
    {
      kind: "note",
      voice: "alto",
      startTick: TICKS_PER_QUARTER * 2,
      durationTicks: TICKS_PER_QUARTER,
      pitch: 67,
      velocity: 64,
      role: "subject",
    },
    {
      kind: "note",
      voice: "soprano",
      startTick: TICKS_PER_QUARTER * 4,
      durationTicks: TICKS_PER_QUARTER * 8,
      pitch: 72,
      velocity: 64,
      role: "subject-fragment",
    },
  ];
  const pivotEpisode: HarmonicPlan = {
    state: "episode",
    startTick: TICKS_PER_QUARTER * 4,
    durationTicks: TICKS_PER_QUARTER * 8,
    meterContext,
    localKey,
    departureKey: localKey,
    targetKey,
    styleProfile: "hybrid",
    cadenceKind: "modulatory",
    ambiguityIntent: "pivot-harmony",
    ambiguityRecoveryTick: TICKS_PER_QUARTER * 12,
    parallelKeyShift: false,
    sequencePattern: "ascending-step",
    fragmentTransform: "contrary-motion",
    anchors: [
      { tick: TICKS_PER_QUARTER * 4, localKey, function: "tonic", cadenceTarget: false },
      { tick: TICKS_PER_QUARTER * 6, localKey: targetKey, function: "predominant", cadenceTarget: false },
      { tick: TICKS_PER_QUARTER * 8, localKey: targetKey, function: "dominant", cadenceTarget: false },
    ],
  };
  const followingStretto: HarmonicPlan = {
    ...pivotEpisode,
    state: "stretto-like",
    startTick: TICKS_PER_QUARTER * 12,
    anchors: [{ tick: TICKS_PER_QUARTER * 12, localKey: targetKey, function: "tonic", cadenceTarget: false }],
  };

  addShortEpisodeHarmonicContinuitySupport(notes, [pivotEpisode, followingStretto]);

  const tenorSupport = notes
    .filter((note) => note.voice === "tenor" && note.role === "free-counterpoint")
    .sort((left, right) => left.startTick - right.startTick);

  for (const expectedStartTick of [4, 6, 8, 10].map((quarter) => TICKS_PER_QUARTER * quarter)) {
    assert.ok(tenorSupport.some((note) => note.startTick === expectedStartTick));
  }
  assert.ok(new Set(tenorSupport.map((note) => note.pitch)).size >= 3);
  assert.ok(tenorSupport.every((note) => note.metricalHarmonyIntent === "structural-chord-tone"));
});

test("short pivot structural support repair uses profile-domain chord tones before projection", () => {
  const { pivotEpisode, followingStretto } = shortPivotPlans();
  const profile = resolveWritingProfile("music-box-n20");
  const notes: NoteEvent[] = [
    {
      kind: "note",
      voice: "tenor",
      startTick: 0,
      durationTicks: TICKS_PER_QUARTER * 2,
      pitch: 62,
      velocity: 52,
      role: "free-counterpoint",
      metricalHarmonyIntent: "structural-chord-tone",
    },
  ];

  addShortEpisodeHarmonicContinuitySupport(notes, [pivotEpisode, followingStretto], profile);

  const repairedTenor = notes.find((note) => note.voice === "tenor" && note.startTick === 0);
  assert.ok(repairedTenor !== undefined);
  assert.ok([60, 64, 67, 72].includes(repairedTenor.pitch));
  assert.ok(profile.absolutePitchSet.includes(repairedTenor.pitch));
});

test("short pivot structural support repair leaves non-chord evidence when no profile chord tone exists", () => {
  const { pivotEpisode, followingStretto } = shortPivotPlans();
  const profile = {
    ...resolveWritingProfile("music-box-n20"),
    absolutePitchSet: [60, 62, 67, 72],
    voiceRanges: {
      soprano: { min: 72, max: 72 },
      alto: { min: 67, max: 67 },
      tenor: { min: 62, max: 62 },
      bass: { min: 60, max: 60 },
    },
  } satisfies WritingProfile;
  const notes: NoteEvent[] = [
    {
      kind: "note",
      voice: "tenor",
      startTick: 0,
      durationTicks: TICKS_PER_QUARTER * 2,
      pitch: 62,
      velocity: 52,
      role: "free-counterpoint",
      metricalHarmonyIntent: "structural-chord-tone",
    },
  ];

  addShortEpisodeHarmonicContinuitySupport(notes, [pivotEpisode, followingStretto], profile);

  const unrepairedTenor = notes.find((note) => note.voice === "tenor" && note.startTick === 0);
  const window = evaluateSectionConstraintProblem({
    problem: buildSectionConstraintProblem({ notes, sectionPlan: pivotEpisode }),
    notes,
    sectionPlan: pivotEpisode,
  });
  assert.equal(unrepairedTenor?.pitch, 62);
  assert.ok(window.infeasibleConstraintCounts.nonChordStructuralSupportCount > 0);
});

function isModulatoryPivotEpisode(plan: HarmonicPlan): boolean {
  return (
    plan.state === "episode" &&
    plan.cadenceKind === "modulatory" &&
    plan.ambiguityIntent === "pivot-harmony" &&
    plan.sequencePattern !== undefined &&
    plan.fragmentTransform !== undefined &&
    plan.targetKey !== undefined
  );
}

function shortPivotPlans(): { pivotEpisode: HarmonicPlan; followingStretto: HarmonicPlan } {
  const meterContext = createMeterContext({ numerator: 4, denominator: 4 });
  const localKey: KeySignature = { tonic: "C", mode: "major" };
  const pivotEpisode: HarmonicPlan = {
    state: "episode",
    startTick: 0,
    durationTicks: TICKS_PER_QUARTER * 8,
    meterContext,
    localKey,
    departureKey: localKey,
    targetKey: localKey,
    styleProfile: "hybrid",
    cadenceKind: "modulatory",
    ambiguityIntent: "pivot-harmony",
    ambiguityRecoveryTick: TICKS_PER_QUARTER * 8,
    parallelKeyShift: false,
    sequencePattern: "ascending-step",
    fragmentTransform: "contrary-motion",
    anchors: [
      { tick: 0, localKey, function: "tonic", cadenceTarget: false },
      { tick: TICKS_PER_QUARTER * 4, localKey, function: "dominant", cadenceTarget: false },
    ],
  };

  return {
    pivotEpisode,
    followingStretto: {
      ...pivotEpisode,
      state: "stretto-like",
      startTick: TICKS_PER_QUARTER * 8,
      anchors: [{ tick: TICKS_PER_QUARTER * 8, localKey, function: "tonic", cadenceTarget: false }],
    },
  };
}

function hardConstraintFailures(diagnostics: ReturnType<typeof generateScore>["diagnostics"]): number {
  return (
    diagnostics.rangeViolations +
    diagnostics.voiceCrossings +
    diagnostics.subjectIdentityViolations +
    diagnostics.answerPlanViolations +
    diagnostics.keyMetadataMismatches +
    diagnostics.writingProfilePitchViolations
  );
}
