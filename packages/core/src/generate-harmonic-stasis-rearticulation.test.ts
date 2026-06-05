import assert from "node:assert/strict";
import test from "node:test";
import { TICKS_PER_QUARTER } from "./constants.js";
import type {
  EpisodeMotiveSource,
  EpisodeTransformationKind,
  KeySignature,
  MetricalHarmonyIntent,
  NoteEvent,
  NoteRole,
} from "./events.js";
import { generateScore } from "./generate.js";
import {
  analyzeHarmonicStasisRearticulation,
  repairHarmonicStasisRearticulation,
} from "./generation/harmonic-stasis-rearticulation.js";
import { buildHarmonicPlan } from "./generation/harmony.js";

const FOCUSED_LENGTH_TICKS = TICKS_PER_QUARTER * 64;
const C_MAJOR: KeySignature = { tonic: "C", mode: "major" };

test("harmonic stasis rearticulation repairs the reported first-episode handoff response", () => {
  const { diagnostics } = generateScore({ seed: "seed-1syy921-0025pp1", lengthTicks: FOCUSED_LENGTH_TICKS });
  const firstEpisode = diagnostics.sectionPlans.find((plan) => plan.state === "episode");
  assert.ok(firstEpisode);

  const windows = diagnostics.harmonicStasisRearticulation.windows.filter(
    (window) =>
      firstEpisode.startTick <= window.startTick &&
      window.startTick < firstEpisode.startTick + firstEpisode.durationTicks,
  );

  assert.ok(windows.some((window) => window.firstEpisodeHandoff));
  assert.ok(windows.some((window) => window.allActiveVoicesFreeCounterpoint));
  assert.ok(windows.some((window) => window.sourceMotive === "answer-form" || window.preparesNextEntry));
  assert.equal(diagnostics.harmonicStasisRearticulation.generatorResponseWindowCount, 0);
  assert.ok(
    diagnostics.generatorSearchTrace.candidates.some(
      (candidate) =>
        candidate.candidateId === "score-harmonic-stasis-unrepaired-final-repair-evidence" &&
        candidate.reason.includes("free-counterpoint-"),
    ),
  );
  assert.ok(
    diagnostics.generatorSearchTrace.candidates.some(
      (candidate) => candidate.candidateId === "score-harmonic-stasis-solver-repaired",
    ),
  );
  assert.equal(hardConstraintFailures(diagnostics), 0);
});

test("harmonic stasis rearticulation keeps focused seed evidence review-visible after repair", () => {
  const seeds = [
    "seed-07mwf08-1te3e2o",
    "seed-1db5j19-1nhjtae",
    "seed-1syy921-0025pp1",
    "fugue-smoke",
    "modal-cadence",
    "dark-episode",
    "tight-stretto",
  ] as const;
  const summaries = seeds.map((seed) => {
    const { diagnostics } = generateScore({ seed, lengthTicks: FOCUSED_LENGTH_TICKS });
    return {
      seed,
      focusedWindowCount: diagnostics.harmonicStasisRearticulation.focusedWindowCount,
      generatorResponseWindowCount: diagnostics.harmonicStasisRearticulation.generatorResponseWindowCount,
      hardConstraintFailures: hardConstraintFailures(diagnostics),
      genericFreeCounterpointDurationTicks: diagnostics.episodeMotivicDevelopment.genericFreeCounterpointDurationTicks,
    };
  });

  assert.ok(summaries.some((summary) => summary.focusedWindowCount > 0));
  assert.ok(summaries.every((summary) => summary.generatorResponseWindowCount === 0));
  assert.ok(summaries.every((summary) => summary.hardConstraintFailures === 0));
  assert.ok(summaries.every((summary) => summary.genericFreeCounterpointDurationTicks === 0));
});

test("harmonic stasis rearticulation classifies first-episode all-free structural repeats", () => {
  const plan = buildHarmonicPlan({
    state: "episode",
    startTick: 0,
    durationTicks: TICKS_PER_QUARTER * 8,
    globalKey: C_MAJOR,
    localKey: C_MAJOR,
    targetKey: C_MAJOR,
    styleProfile: "strict-classical",
    cadenceKind: "modulatory",
    ambiguityIntent: "none",
  });
  const notes: NoteEvent[] = [
    note({
      voice: "tenor",
      startTick: 0,
      pitch: 55,
      intent: "structural-root-support",
      sourceMotive: "answer-form",
      transformationKind: "cadential-continuation",
      preparesNextEntry: true,
    }),
    note({
      voice: "tenor",
      startTick: TICKS_PER_QUARTER,
      pitch: 55,
      intent: "structural-root-support",
      sourceMotive: "answer-form",
      transformationKind: "cadential-continuation",
      preparesNextEntry: true,
    }),
    note({
      voice: "tenor",
      startTick: TICKS_PER_QUARTER * 2,
      pitch: 55,
      intent: "structural-root-support",
      sourceMotive: "answer-form",
      transformationKind: "cadential-continuation",
      preparesNextEntry: true,
    }),
    note({ voice: "alto", startTick: 0, durationTicks: TICKS_PER_QUARTER * 3, pitch: 64 }),
    note({ voice: "bass", startTick: 0, durationTicks: TICKS_PER_QUARTER * 3, pitch: 48 }),
  ];

  const diagnostics = analyzeHarmonicStasisRearticulation(notes, [plan]);

  assert.equal(diagnostics.focusedWindowCount, 1);
  assert.equal(diagnostics.generatorResponseWindowCount, 1);
  assert.deepEqual(diagnostics.windows[0], {
    startTick: 0,
    durationTicks: TICKS_PER_QUARTER * 3,
    state: "episode",
    voice: "tenor",
    pitch: 55,
    attackCount: 3,
    role: "free-counterpoint",
    metricalHarmonyIntent: "structural-root-support",
    localKey: C_MAJOR,
    harmonicFunction: "tonic",
    activeVoiceCount: 3,
    activeVoices: ["alto", "tenor", "bass"],
    allActiveVoicesFreeCounterpoint: true,
    firstEpisodeHandoff: true,
    preparesNextEntry: true,
    sourceMotive: "answer-form",
    transformationKind: "cadential-continuation",
    sequenceDirection: "descending",
    classification: "generator-response",
    response: "generator-response-required",
  });
});

test("harmonic stasis rearticulation preserves role-aware accepted context", () => {
  const plan = buildHarmonicPlan({
    state: "episode",
    startTick: 0,
    durationTicks: TICKS_PER_QUARTER * 8,
    globalKey: C_MAJOR,
    localKey: C_MAJOR,
    targetKey: C_MAJOR,
    styleProfile: "strict-classical",
    cadenceKind: "authentic",
    ambiguityIntent: "none",
  });
  const notes: NoteEvent[] = [
    note({ voice: "soprano", startTick: 0, pitch: 72, role: "subject" }),
    note({ voice: "soprano", startTick: TICKS_PER_QUARTER, pitch: 72, role: "subject" }),
    note({
      voice: "alto",
      startTick: TICKS_PER_QUARTER * 2,
      pitch: 67,
      sourceMotive: "cadence-figure",
      transformationKind: "cadential-continuation",
      preparesCadence: true,
    }),
    note({
      voice: "alto",
      startTick: TICKS_PER_QUARTER * 3,
      pitch: 67,
      sourceMotive: "cadence-figure",
      transformationKind: "cadential-continuation",
      preparesCadence: true,
    }),
  ];

  const diagnostics = analyzeHarmonicStasisRearticulation(notes, [plan]);

  assert.equal(diagnostics.focusedWindowCount, 1);
  assert.equal(diagnostics.acceptedContextWindowCount, 1);
  assert.equal(diagnostics.reviewRequiredWindowCount, 0);
  assert.equal(diagnostics.generatorResponseWindowCount, 0);
  assert.equal(diagnostics.windows[0]?.voice, "alto");
  assert.equal(diagnostics.windows[0]?.classification, "accepted-context");
  assert.equal(diagnostics.windows[0]?.response, "accepted-context");
});

test("harmonic stasis repair prefers local pitch motion before falling back to reattack reduction", () => {
  const plan = buildHarmonicPlan({
    state: "episode",
    startTick: 0,
    durationTicks: TICKS_PER_QUARTER * 8,
    globalKey: C_MAJOR,
    localKey: C_MAJOR,
    targetKey: C_MAJOR,
    styleProfile: "strict-classical",
    cadenceKind: "modulatory",
    ambiguityIntent: "none",
  });
  const notes: NoteEvent[] = [
    note({
      voice: "tenor",
      startTick: 0,
      pitch: 55,
      durationTicks: TICKS_PER_QUARTER / 2,
      intent: "structural-root-support",
      sourceMotive: "answer-form",
      transformationKind: "cadential-continuation",
      preparesNextEntry: true,
    }),
    note({
      voice: "tenor",
      startTick: TICKS_PER_QUARTER / 2,
      pitch: 55,
      durationTicks: TICKS_PER_QUARTER / 2,
      intent: "structural-root-support",
      sourceMotive: "answer-form",
      transformationKind: "cadential-continuation",
      preparesNextEntry: true,
    }),
    note({
      voice: "tenor",
      startTick: TICKS_PER_QUARTER,
      pitch: 55,
      durationTicks: TICKS_PER_QUARTER / 2,
      intent: "structural-root-support",
      sourceMotive: "answer-form",
      transformationKind: "cadential-continuation",
      preparesNextEntry: true,
    }),
    note({ voice: "alto", startTick: 0, durationTicks: TICKS_PER_QUARTER * 2, pitch: 67 }),
    note({ voice: "bass", startTick: 0, durationTicks: TICKS_PER_QUARTER * 2, pitch: 48 }),
  ];

  assert.equal(analyzeHarmonicStasisRearticulation(notes, [plan]).generatorResponseWindowCount, 1);

  repairHarmonicStasisRearticulation(notes, [plan]);
  const repaired = analyzeHarmonicStasisRearticulation(notes, [plan]);
  const tenorPitches = notes
    .filter((candidate) => candidate.voice === "tenor")
    .sort((left, right) => left.startTick - right.startTick)
    .map((candidate) => candidate.pitch);

  assert.equal(repaired.generatorResponseWindowCount, 0);
  assert.notDeepEqual(tenorPitches, [55, 55, 55]);
  assert.ok(notes.every((candidate) => candidate.motivicDerivation !== undefined || candidate.voice !== "tenor"));
});

function hardConstraintFailures(diagnostics: ReturnType<typeof generateScore>["diagnostics"]): number {
  return (
    diagnostics.rangeViolations +
    diagnostics.voiceCrossings +
    diagnostics.subjectIdentityViolations +
    diagnostics.answerPlanViolations +
    diagnostics.keyMetadataMismatches
  );
}

function note(input: {
  voice: NoteEvent["voice"];
  startTick: number;
  pitch: number;
  durationTicks?: number;
  role?: NoteRole;
  intent?: MetricalHarmonyIntent;
  sourceMotive?: EpisodeMotiveSource;
  transformationKind?: EpisodeTransformationKind;
  preparesNextEntry?: boolean;
  preparesCadence?: boolean;
}): NoteEvent {
  return {
    kind: "note",
    voice: input.voice,
    startTick: input.startTick,
    durationTicks: input.durationTicks ?? TICKS_PER_QUARTER,
    pitch: input.pitch,
    velocity: 88,
    role: input.role ?? "free-counterpoint",
    metricalHarmonyIntent: input.intent ?? "weak-chord-tone",
    motivicDerivation:
      input.sourceMotive === undefined || input.transformationKind === undefined
        ? undefined
        : {
            sourceMotive: input.sourceMotive,
            transformationKind: input.transformationKind,
            targetFunction: "prepare-subject-return",
            sequenceDirection: "descending",
            preparesNextEntry: input.preparesNextEntry ?? false,
            preparesCadence: input.preparesCadence ?? false,
          },
  };
}
