import assert from "node:assert/strict";
import test from "node:test";
import { TICKS_PER_QUARTER } from "./constants.js";
import type { HarmonicPlan, KeySignature, NoteEvent, PlannedEntry } from "./events.js";
import { cachedGenerateScore as generateScore } from "./generate-test-helpers.js";
import { createMeterContext } from "./generation/meter.js";
import { buildFugueScore } from "./generation/sections.js";
import { Xoshiro128StarStar } from "./prng.js";
import { resolveWritingProfile } from "./writing-profile.js";

test("score-level support cleanup emits paired before and after trace evidence", () => {
  const diagnostics = generateScore({
    seed: "angular-answer",
    lengthTicks: TICKS_PER_QUARTER * 288,
  }).diagnostics;
  const candidateIds = new Set(diagnostics.generatorSearchTrace.candidates.map((candidate) => candidate.candidateId));

  for (const surface of ["long-rest-phrase-closure", "bass-answer-tail-texture-support"] as const) {
    assert.ok(candidateIds.has(`score-${surface}-unrepaired-final-repair-evidence`));
    assert.ok(candidateIds.has(`score-${surface}-solver-repaired`));
  }
  assert.ok(!candidateIds.has("score-functional-thinning-support-unrepaired-final-repair-evidence"));
  assert.ok(!candidateIds.has("score-functional-thinning-support-solver-repaired"));
  assert.ok(!candidateIds.has("score-texture-voice-crossing-repair-unrepaired-final-repair-evidence"));
  assert.ok(!candidateIds.has("score-texture-voice-crossing-repair-solver-repaired"));
  assert.ok(!candidateIds.has("score-unexplained-rest-thinning-support-unrepaired-final-repair-evidence"));
  assert.ok(!candidateIds.has("score-unexplained-rest-thinning-support-solver-repaired"));
  assert.equal(hardConstraintFailures(diagnostics), 0);
});

test("texture voice-order repair emits paired before and after trace evidence for a focused score delta", () => {
  const meterContext = createMeterContext({ numerator: 4, denominator: 4 });
  const localKey: KeySignature = { tonic: "C", mode: "major" };
  const sectionPlan: HarmonicPlan = {
    state: "episode",
    startTick: 0,
    durationTicks: TICKS_PER_QUARTER * 8,
    meterContext,
    localKey,
    departureKey: localKey,
    targetKey: localKey,
    styleProfile: "strict-classical",
    cadenceKind: "half",
    ambiguityIntent: "none",
    parallelKeyShift: false,
    anchors: [
      { tick: 0, localKey, function: "tonic", cadenceTarget: false },
      { tick: TICKS_PER_QUARTER * 4, localKey, function: "dominant", cadenceTarget: false },
    ],
  };
  const notes: NoteEvent[] = [
    textureNote("soprano", 72, "structural-chord-tone", "subject"),
    textureNote("alto", 59),
    textureNote("tenor", 60, "structural-root-support"),
    textureNote("bass", 43, "structural-root-support"),
  ];
  const subjectEntries: PlannedEntry[] = [
    {
      voice: "soprano",
      form: "subject",
      state: "episode",
      startTick: 0,
      globalKey: localKey,
      localKey,
      registerTarget: 72,
      expectedDegreePattern: [0],
      actualPitchClassSequence: [0],
      metricalIntentPattern: [
        {
          offsetTick: 0,
          beatStrength: "strong",
          scaleDegree: 0,
          harmonicFunction: "tonic",
          intent: "structural-chord-tone",
          chordTone: true,
        },
      ],
    },
  ];
  const score = buildFugueScore(
    [],
    localKey,
    TICKS_PER_QUARTER * 8,
    Xoshiro128StarStar.fromSeed("texture-voice-crossing-focused"),
    "section-local-planner",
    meterContext,
    {
      initialExposition: {
        notes,
        subjectEntries,
        sectionPlans: [sectionPlan],
        endTick: TICKS_PER_QUARTER * 8,
        durationTicks: TICKS_PER_QUARTER * 8,
      },
    },
    resolveWritingProfile("four-voice-default"),
  );
  const beforeCandidate = score.selectedConstraintCandidates.find(
    (candidate) => candidate.candidateId === "score-texture-voice-order-unrepaired-final-repair-evidence",
  );
  const afterCandidate = score.selectedConstraintCandidates.find(
    (candidate) => candidate.candidateId === "score-texture-voice-order-solver-repaired",
  );

  assert.ok(beforeCandidate);
  assert.ok(afterCandidate);
  assert.deepEqual(
    beforeCandidate.result.hardFailures.map((failure) => failure.code),
    ["voice-crossing"],
  );
  assert.equal(afterCandidate.result.hardFailures.length, 0);
  assert.equal(score.notes.find((note) => note.voice === "tenor")?.pitch, 48);
  assert.ok(
    score.selectedConstraintCandidates.every(
      (candidate) => !candidate.candidateId.startsWith("score-texture-voice-crossing-repair-"),
    ),
  );
});

function textureNote(
  voice: NoteEvent["voice"],
  pitch: number,
  metricalHarmonyIntent: NoteEvent["metricalHarmonyIntent"] = "structural-chord-tone",
  role: NoteEvent["role"] = "free-counterpoint",
): NoteEvent {
  return {
    kind: "note",
    voice,
    startTick: 0,
    durationTicks: TICKS_PER_QUARTER * 8,
    pitch,
    velocity: 64,
    role,
    metricalHarmonyIntent,
  };
}

function hardConstraintFailures(diagnostics: ReturnType<typeof generateScore>["diagnostics"]): number {
  return (
    diagnostics.rangeViolations +
    diagnostics.voiceCrossings +
    diagnostics.subjectIdentityViolations +
    diagnostics.answerPlanViolations +
    diagnostics.keyMetadataMismatches
  );
}
