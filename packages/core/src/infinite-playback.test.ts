import assert from "node:assert/strict";
import test from "node:test";
import type { HarmonicPlan, KeySignature, PlannedEntry, ScoreEvent } from "./index.js";
import {
  appendInfinitePlaybackSegmentHistory,
  createInitialSegmentSnapshot,
  createSegmentEndSnapshot,
  DEFAULT_BOUNDED_PAST_EVENT_CONTEXT_TICKS,
  DEFAULT_SELECTION_MODEL,
  GENERATOR_VERSION,
  INFINITE_PLAYBACK_MODE_SEMANTICS,
  INFINITE_PLAYBACK_SNAPSHOT_SCHEMA_VERSION,
  normalizeInfinitePlaybackMode,
  planSegmentGenerationDeadlineResult,
  seedToUint32State,
  TICKS_PER_QUARTER,
  WRITING_PROFILE_VERSION,
} from "./index.js";

const PHASE_8_REVIEW_SIGNALS = [
  "entry-boundary-continuity",
  "phrase-development",
  "score-window-acceptance",
  "meter-consistency",
  "texture-continuity",
  "historical-reference-calibration",
  "episode-motivic-development",
  "harmonic-stasis-rearticulation",
  "stretto-entry-harmony",
] as const;

test("Phase 8 playback modes define distinct segment boundary semantics", () => {
  assert.deepEqual(Object.keys(INFINITE_PLAYBACK_MODE_SEMANTICS).sort(), [
    "continuous-fugue",
    "endless-program",
    "regenerative-cycle",
  ]);

  assert.deepEqual(INFINITE_PLAYBACK_MODE_SEMANTICS["continuous-fugue"], {
    mode: "continuous-fugue",
    label: "continuous fugue",
    boundaryVisibility: "hidden",
    cadenceRequirement: "avoid-terminal-cadence",
    subjectMemory: "continuous-transform",
    carriesTonalRegion: true,
    carriesDensityArc: true,
    carriesNoveltyFatigueBudget: true,
    sectionBridge: "required",
    reviewSignalsRemainVisible: PHASE_8_REVIEW_SIGNALS,
  });
  assert.equal(INFINITE_PLAYBACK_MODE_SEMANTICS["endless-program"].boundaryVisibility, "audible");
  assert.equal(INFINITE_PLAYBACK_MODE_SEMANTICS["endless-program"].cadenceRequirement, "require-terminal-cadence");
  assert.equal(INFINITE_PLAYBACK_MODE_SEMANTICS["endless-program"].sectionBridge, "not-required");
  assert.equal(INFINITE_PLAYBACK_MODE_SEMANTICS["regenerative-cycle"].boundaryVisibility, "cadential-bridge");
  assert.equal(INFINITE_PLAYBACK_MODE_SEMANTICS["regenerative-cycle"].cadenceRequirement, "require-terminal-cadence");
  assert.equal(INFINITE_PLAYBACK_MODE_SEMANTICS["regenerative-cycle"].sectionBridge, "required");

  for (const semantics of Object.values(INFINITE_PLAYBACK_MODE_SEMANTICS)) {
    assert.deepEqual(semantics.reviewSignalsRemainVisible, PHASE_8_REVIEW_SIGNALS);
    assert.equal(semantics.carriesTonalRegion, true);
    assert.equal(semantics.carriesDensityArc, true);
    assert.equal(semantics.carriesNoveltyFatigueBudget, true);
  }
});

test("normalizes Phase 8 document labels to public mode values", () => {
  assert.equal(normalizeInfinitePlaybackMode("continuous fugue"), "continuous-fugue");
  assert.equal(normalizeInfinitePlaybackMode("endless program"), "endless-program");
  assert.equal(normalizeInfinitePlaybackMode("regenerative cycle"), "regenerative-cycle");
  assert.equal(normalizeInfinitePlaybackMode("continuous-fugue"), "continuous-fugue");

  assert.throws(() => normalizeInfinitePlaybackMode("playlist"), /core\.infinite-playback\.invalid-mode/);
});

test("creates an initial segment snapshot from seed and empty bounded context", () => {
  const snapshot = createInitialSegmentSnapshot({
    seed: "phase-8-contract",
    mode: "regenerative cycle",
  });

  assert.equal(snapshot.schemaVersion, INFINITE_PLAYBACK_SNAPSHOT_SCHEMA_VERSION);
  assert.equal(snapshot.generatorVersion, GENERATOR_VERSION);
  assert.equal(snapshot.selectionModel, DEFAULT_SELECTION_MODEL);
  assert.deepEqual(snapshot.writingProfile, {
    id: "four-voice-default",
    version: WRITING_PROFILE_VERSION,
  });
  assert.equal(snapshot.segmentIndex, 0);
  assert.equal(snapshot.tick, 0);
  assert.equal(snapshot.mode, "regenerative-cycle");
  assert.deepEqual(snapshot.timebase, { ticksPerQuarter: TICKS_PER_QUARTER });
  assert.deepEqual(snapshot.prngInternalState, {
    algorithm: "xoshiro128**",
    state: seedToUint32State("phase-8-contract"),
  });
  assert.deepEqual(snapshot.boundedPastEventContext, {
    maxLookbackTicks: DEFAULT_BOUNDED_PAST_EVENT_CONTEXT_TICKS,
    events: [],
    voiceRoleContinuity: [],
    metricalContexts: [],
    harmonicContexts: [],
    sectionFunctions: [],
  });
  assert.deepEqual(snapshot.subjectFamily, {
    familyId: "initial",
    stemPitchClasses: [],
    activeTransformations: [],
  });
  assert.deepEqual(snapshot.answerTransform, { recentTransforms: [] });
  assert.deepEqual(snapshot.fragmentDerivation, {
    sourceMotiveIds: [],
    transformations: [],
    sequencePatterns: [],
  });
  assert.deepEqual(snapshot.tonalRegion, { recentRegions: [] });
  assert.deepEqual(snapshot.cadencePreparation, { unresolved: false });
  assert.deepEqual(snapshot.densityArc, {
    currentVoiceCount: 0,
    recentVoiceCounts: [],
  });
  assert.deepEqual(snapshot.noveltyFatigueBudget, {
    noveltyBudget: 1,
    fatigue: 0,
    repeatedSubjectFamilyCount: 0,
  });
  assert.deepEqual(snapshot.sectionPlannerState, {
    currentState: "exposition",
    stateHistory: [],
  });
  assert.deepEqual(snapshot.unresolvedVoiceContinuity, []);
});

test("supports explicit resume-compatibility metadata in initial snapshots", () => {
  const snapshot = createInitialSegmentSnapshot({
    seed: "phase-8-custom-contract",
    mode: "endless-program",
    generatorVersion: 99,
    selectionModel: "baseline",
    writingProfileId: "piano-two-hand",
    ticksPerQuarter: 960,
    boundedPastEventContextTicks: 1920,
  });

  assert.equal(snapshot.generatorVersion, 99);
  assert.equal(snapshot.selectionModel, "baseline");
  assert.deepEqual(snapshot.writingProfile, {
    id: "piano-two-hand",
    version: WRITING_PROFILE_VERSION,
  });
  assert.equal(snapshot.mode, "endless-program");
  assert.equal(snapshot.timebase.ticksPerQuarter, 960);
  assert.equal(snapshot.boundedPastEventContext.maxLookbackTicks, 1920);
});

test("creates a segment-end snapshot with bounded tail context for continuation", () => {
  const key = { tonic: "D", mode: "minor" } satisfies KeySignature;
  const meterContext = {
    timeSignature: { numerator: 4, denominator: 4 },
    measureTicks: TICKS_PER_QUARTER * 4,
    beatTicks: TICKS_PER_QUARTER,
    strongBeatIntervalTicks: TICKS_PER_QUARTER * 2,
    weakBeatIntervalTicks: TICKS_PER_QUARTER,
    compound: false,
  } satisfies HarmonicPlan["meterContext"];
  const sectionPlans: HarmonicPlan[] = [
    {
      state: "episode",
      startTick: 0,
      durationTicks: TICKS_PER_QUARTER * 4,
      meterContext,
      localKey: { tonic: "A", mode: "minor" },
      departureKey: { tonic: "A", mode: "minor" },
      targetKey: { tonic: "C", mode: "major" },
      styleProfile: "strict-classical",
      cadenceKind: "modulatory",
      ambiguityIntent: "pivot-harmony",
      parallelKeyShift: false,
      sequencePattern: "circle-fifths",
      anchors: [],
    },
    {
      state: "subject-return",
      startTick: TICKS_PER_QUARTER * 4,
      durationTicks: TICKS_PER_QUARTER * 4,
      meterContext,
      localKey: key,
      departureKey: { tonic: "C", mode: "major" },
      targetKey: key,
      styleProfile: "strict-classical",
      cadenceKind: "half",
      ambiguityIntent: "none",
      parallelKeyShift: false,
      anchors: [],
    },
  ];
  const subjectEntries: PlannedEntry[] = [
    {
      voice: "tenor",
      form: "subject",
      state: "subject-return",
      startTick: TICKS_PER_QUARTER * 5,
      globalKey: key,
      localKey: key,
      registerTarget: 60,
      expectedDegreePattern: [1, 2, 3, 5],
      actualPitchClassSequence: [2, 4, 5, 9],
      metricalIntentPattern: [],
    },
    {
      voice: "alto",
      form: "subject-fragment",
      state: "subject-return",
      startTick: TICKS_PER_QUARTER * 6,
      globalKey: key,
      localKey: key,
      registerTarget: 67,
      expectedDegreePattern: [3, 2],
      actualPitchClassSequence: [5, 4],
      metricalIntentPattern: [],
    },
  ];
  const events: ScoreEvent[] = [
    {
      kind: "note",
      voice: "tenor",
      startTick: TICKS_PER_QUARTER * 5,
      durationTicks: TICKS_PER_QUARTER * 2,
      pitch: 62,
      velocity: 88,
      role: "subject",
    },
    {
      kind: "note",
      voice: "alto",
      startTick: TICKS_PER_QUARTER * 7,
      durationTicks: TICKS_PER_QUARTER,
      pitch: 65,
      velocity: 82,
      role: "free-counterpoint",
    },
    {
      kind: "meta",
      type: "state-change",
      tick: TICKS_PER_QUARTER * 4,
      payload: { state: "subject-return" },
    },
  ];
  const snapshot = createSegmentEndSnapshot({
    seed: "continuation-snapshot",
    mode: "continuous-fugue",
    segmentIndex: 2,
    tick: TICKS_PER_QUARTER * 8,
    events,
    subjectEntries,
    sectionPlans,
    timeSignature: meterContext.timeSignature,
    bpm: 72,
    prngState: [1, 2, 3, 4],
    writingProfileId: "harpsichord-manual",
    boundedPastEventContextTicks: TICKS_PER_QUARTER * 4,
  });

  assert.equal(snapshot.segmentIndex, 2);
  assert.equal(snapshot.mode, "continuous-fugue");
  assert.deepEqual(snapshot.writingProfile, {
    id: "harpsichord-manual",
    version: WRITING_PROFILE_VERSION,
  });
  assert.deepEqual(snapshot.timebase, {
    ticksPerQuarter: TICKS_PER_QUARTER,
    timeSignature: meterContext.timeSignature,
    bpm: 72,
  });
  assert.deepEqual(snapshot.subjectFamily.stemPitchClasses, [2, 4, 5, 9]);
  assert.deepEqual(snapshot.tonalRegion.currentKey, key);
  assert.equal(snapshot.cadencePreparation.unresolved, true);
  assert.equal(snapshot.sectionPlannerState.currentState, "subject-return");
  assert.equal(snapshot.sectionPlannerState.nextStateHint, "subject-return");
  assert.equal(snapshot.densityArc.currentVoiceCount, 2);
  assert.deepEqual(snapshot.prngInternalState.state, [1, 2, 3, 4]);
  assert.deepEqual(
    snapshot.boundedPastEventContext.events.map((event) =>
      event.kind === "note" ? [event.voice, event.startTick] : [event.type, event.tick],
    ),
    [
      ["tenor", -TICKS_PER_QUARTER * 3],
      ["alto", -TICKS_PER_QUARTER],
      ["state-change", -TICKS_PER_QUARTER * 4],
    ],
  );
  assert.deepEqual(snapshot.boundedPastEventContext.sectionFunctions, [
    { startTick: -TICKS_PER_QUARTER * 8, state: "episode" },
    { startTick: -TICKS_PER_QUARTER * 4, state: "subject-return" },
  ]);
});

test("validates initial segment snapshot reproducibility inputs", () => {
  assert.throws(() => createInitialSegmentSnapshot({ seed: "" }), /core\.infinite-playback\.empty-seed/);
  assert.throws(
    () => createInitialSegmentSnapshot({ seed: "phase-8", generatorVersion: 0 }),
    /core\.infinite-playback\.invalid-generator-version/,
  );
  assert.throws(
    () => createInitialSegmentSnapshot({ seed: "phase-8", ticksPerQuarter: 0 }),
    /core\.infinite-playback\.invalid-timebase/,
  );
  assert.throws(
    () => createInitialSegmentSnapshot({ seed: "phase-8", boundedPastEventContextTicks: -1 }),
    /core\.infinite-playback\.invalid-context-window/,
  );
});

test("Phase 9 deadline planning returns generated candidates that satisfy hard constraints", () => {
  const result = planSegmentGenerationDeadlineResult({
    mode: "continuous fugue",
    segmentIndex: 3,
    startedAtMs: 1000,
    completedAtMs: 1320,
    deadlineMs: 500,
    generatedCandidateSatisfiesHardConstraints: true,
    bestSoFarCandidateSatisfiesHardConstraints: false,
  });

  assert.equal(result.mode, "continuous-fugue");
  assert.equal(result.segmentIndex, 3);
  assert.equal(result.elapsedMs, 320);
  assert.equal(result.deadlineExceededByMs, 0);
  assert.equal(result.timedOut, false);
  assert.equal(result.hardConstraintSatisfied, true);
  assert.equal(result.returnedCandidateKind, "generated");
  assert.equal(result.hardConstraintSource, "generated");
  assert.equal(result.referenceDiagnosticsPreserved, true);
  assert.equal(result.qualityVectorPreserved, true);
  assert.deepEqual(result.reviewSignalsRemainVisible, PHASE_8_REVIEW_SIGNALS);
});

test("Phase 9 deadline planning falls back to best-so-far without hiding review signals", () => {
  const result = planSegmentGenerationDeadlineResult({
    mode: "endless-program",
    segmentIndex: 4,
    startedAtMs: 0,
    completedAtMs: 751,
    deadlineMs: 750,
    generatedCandidateSatisfiesHardConstraints: true,
    bestSoFarCandidateSatisfiesHardConstraints: true,
  });

  assert.equal(result.mode, "endless-program");
  assert.equal(result.elapsedMs, 751);
  assert.equal(result.deadlineExceededByMs, 1);
  assert.equal(result.timedOut, true);
  assert.equal(result.hardConstraintSatisfied, true);
  assert.equal(result.returnedCandidateKind, "best-so-far");
  assert.equal(result.hardConstraintSource, "best-so-far");
  assert.equal(result.referenceDiagnosticsPreserved, true);
  assert.equal(result.qualityVectorPreserved, true);
  assert.deepEqual(result.reviewSignalsRemainVisible, PHASE_8_REVIEW_SIGNALS);
});

test("Phase 9 deadline planning records conservative fallback when no hard-safe candidate is ready", () => {
  const result = planSegmentGenerationDeadlineResult({
    mode: "regenerative cycle",
    segmentIndex: 5,
    startedAtMs: 2000,
    deadlineMs: 600,
    generatedCandidateSatisfiesHardConstraints: false,
    bestSoFarCandidateSatisfiesHardConstraints: false,
  });

  assert.equal(result.mode, "regenerative-cycle");
  assert.equal(result.elapsedMs, 600);
  assert.equal(result.deadlineExceededByMs, 0);
  assert.equal(result.timedOut, true);
  assert.equal(result.hardConstraintSatisfied, true);
  assert.equal(result.returnedCandidateKind, "conservative-fallback");
  assert.equal(result.hardConstraintSource, "conservative-fallback");
  assert.equal(result.referenceDiagnosticsPreserved, true);
  assert.equal(result.qualityVectorPreserved, true);
  assert.deepEqual(result.reviewSignalsRemainVisible, PHASE_8_REVIEW_SIGNALS);
});

test("Phase 9 long-run history preserves replay state changes and segment boundaries", () => {
  const firstDeadline = planSegmentGenerationDeadlineResult({
    mode: "continuous-fugue",
    segmentIndex: 0,
    startedAtMs: 0,
    completedAtMs: 250,
    deadlineMs: 500,
    generatedCandidateSatisfiesHardConstraints: true,
    bestSoFarCandidateSatisfiesHardConstraints: false,
  });
  const firstHistory = appendInfinitePlaybackSegmentHistory({
    mode: "continuous fugue",
    segmentIndex: 0,
    deadlineResult: firstDeadline,
    events: [
      {
        kind: "meta",
        type: "state-change",
        tick: 0,
        payload: { state: "exposition" },
      },
      {
        kind: "note",
        voice: "soprano",
        startTick: 0,
        durationTicks: TICKS_PER_QUARTER,
        pitch: 72,
        velocity: 88,
        role: "subject",
      },
    ],
  });
  const fallbackDeadline = planSegmentGenerationDeadlineResult({
    mode: "continuous-fugue",
    segmentIndex: 1,
    startedAtMs: 250,
    completedAtMs: 801,
    deadlineMs: 500,
    generatedCandidateSatisfiesHardConstraints: false,
    bestSoFarCandidateSatisfiesHardConstraints: true,
  });
  const secondHistory = appendInfinitePlaybackSegmentHistory({
    previous: firstHistory,
    mode: "continuous-fugue",
    segmentIndex: 1,
    deadlineResult: fallbackDeadline,
    events: [
      {
        kind: "meta",
        type: "state-change",
        tick: TICKS_PER_QUARTER,
        payload: { state: "episode" },
      },
      {
        kind: "note",
        voice: "alto",
        startTick: TICKS_PER_QUARTER,
        durationTicks: TICKS_PER_QUARTER * 2,
        pitch: 64,
        velocity: 84,
        role: "free-counterpoint",
      },
    ],
  });

  assert.deepEqual(secondHistory.replay, [
    {
      segmentIndex: 0,
      startTick: 0,
      endTick: TICKS_PER_QUARTER,
      eventCount: 2,
    },
    {
      segmentIndex: 1,
      startTick: TICKS_PER_QUARTER,
      endTick: TICKS_PER_QUARTER * 3,
      eventCount: 2,
    },
  ]);
  assert.deepEqual(secondHistory.stateChanges, [
    { segmentIndex: 0, tick: 0, state: "exposition" },
    { segmentIndex: 1, tick: TICKS_PER_QUARTER, state: "episode" },
  ]);
  assert.deepEqual(secondHistory.boundaries, [
    {
      segmentIndex: 0,
      tick: TICKS_PER_QUARTER,
      mode: "continuous-fugue",
      returnedCandidateKind: "generated",
      timedOut: false,
    },
    {
      segmentIndex: 1,
      tick: TICKS_PER_QUARTER * 3,
      mode: "continuous-fugue",
      returnedCandidateKind: "best-so-far",
      timedOut: true,
    },
  ]);
  assert.deepEqual(secondHistory.reviewSignalsRemainVisible, PHASE_8_REVIEW_SIGNALS);
});

test("validates Phase 9 deadline planning inputs", () => {
  assert.throws(
    () =>
      planSegmentGenerationDeadlineResult({
        mode: "continuous-fugue",
        segmentIndex: -1,
        startedAtMs: 0,
        deadlineMs: 500,
        generatedCandidateSatisfiesHardConstraints: true,
        bestSoFarCandidateSatisfiesHardConstraints: false,
      }),
    /core\.infinite-playback\.invalid-segment-index/,
  );
  assert.throws(
    () =>
      planSegmentGenerationDeadlineResult({
        mode: "continuous-fugue",
        segmentIndex: 0,
        startedAtMs: 10,
        completedAtMs: 9,
        deadlineMs: 500,
        generatedCandidateSatisfiesHardConstraints: true,
        bestSoFarCandidateSatisfiesHardConstraints: false,
      }),
    /core\.infinite-playback\.invalid-completion-time/,
  );
  assert.throws(
    () =>
      planSegmentGenerationDeadlineResult({
        mode: "continuous-fugue",
        segmentIndex: 0,
        startedAtMs: 0,
        deadlineMs: 0,
        generatedCandidateSatisfiesHardConstraints: true,
        bestSoFarCandidateSatisfiesHardConstraints: false,
      }),
    /core\.infinite-playback\.invalid-deadline/,
  );
});
