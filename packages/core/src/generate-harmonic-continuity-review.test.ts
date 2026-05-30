import assert from "node:assert/strict";
import test from "node:test";
import { TICKS_PER_QUARTER } from "./constants.js";
import type { HarmonicPlan, KeySignature, NoteEvent } from "./events.js";
import { generateScore } from "./generate.js";
import { createMeterContext } from "./generation/meter.js";
import { addShortEpisodeHarmonicContinuitySupport } from "./generation/texture.js";

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

  assert.ok(reportedEpisode !== undefined, "reported seed should expose the episode starting at measure 5 beat 4");
  assert.equal(isModulatoryPivotEpisode(reportedEpisode), true);
  assert.equal(followingStretto?.startTick, TICKS_PER_QUARTER * 27);
  assert.ok(followingStretto?.targetKey !== undefined);

  assert.equal(harmonicWindow?.classification, "audible-progression");
  assert.equal(harmonicWindow?.bassRootSupportCount, harmonicWindow?.structuralBeatCount);
  assert.equal(harmonicWindow?.chordToneSupportCount, harmonicWindow?.structuralBeatCount);
  assert.equal(harmonicWindow?.structuralBeatMismatchCount, 0);
  assert.equal(harmonicWindow?.thinStructuralBeatCount, 0);
  assert.equal(acceptanceWindow?.response, "accepted-context");
  assert.ok(diagnostics.texturePlanningReview.metricalHarmony.strongBeatBassRootSupportCount >= 11);
  assert.ok(diagnostics.harmonicFunctionMatches > 0);
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
  assert.ok(
    (summaries.find((summary) => summary.seed === "seed-1dxb2n8-1miapx7")?.reviewRequiredWindowCount ?? 0) <= 1,
  );
  assert.ok((summaries.find((summary) => summary.seed === "circle-fifths")?.reviewRequiredWindowCount ?? 0) <= 1);
  assert.ok((summaries.find((summary) => summary.seed === "circle-fifths")?.structuralBeatMismatchCount ?? 0) >= 0);
  assert.ok(
    summaries.every((summary) => summary.subjectIdentityViolations === 0),
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
