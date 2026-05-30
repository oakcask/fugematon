import assert from "node:assert/strict";
import test from "node:test";
import {
  createInitialSegmentSnapshot,
  DEFAULT_BOUNDED_PAST_EVENT_CONTEXT_TICKS,
  DEFAULT_SELECTION_MODEL,
  GENERATOR_VERSION,
  INFINITE_PLAYBACK_MODE_SEMANTICS,
  INFINITE_PLAYBACK_SNAPSHOT_SCHEMA_VERSION,
  normalizeInfinitePlaybackMode,
  seedToUint32State,
  TICKS_PER_QUARTER,
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
  assert.equal(INFINITE_PLAYBACK_MODE_SEMANTICS["endless-program"].sectionBridge, "not-required");
  assert.equal(INFINITE_PLAYBACK_MODE_SEMANTICS["regenerative-cycle"].boundaryVisibility, "cadential-bridge");
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
    ticksPerQuarter: 960,
    boundedPastEventContextTicks: 1920,
  });

  assert.equal(snapshot.generatorVersion, 99);
  assert.equal(snapshot.selectionModel, "baseline");
  assert.equal(snapshot.mode, "endless-program");
  assert.equal(snapshot.timebase.ticksPerQuarter, 960);
  assert.equal(snapshot.boundedPastEventContext.maxLookbackTicks, 1920);
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
