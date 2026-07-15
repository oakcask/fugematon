import assert from "node:assert/strict";
import test from "node:test";
import { TICKS_PER_QUARTER } from "../constants.js";
import type {
  FugueState,
  HarmonicPlan,
  KeySignature,
  MetricalHarmonyIntent,
  NoteEvent,
  PlannedEntry,
  Voice,
} from "../events.js";
import { generateScore } from "../generate.js";
import { buildHarmonicPlan } from "./harmony.js";
import { createMeterContext } from "./meter.js";
import {
  buildSectionConstraintProblem,
  evaluateSectionConstraintProblem,
  isAllowedIntentionalRestReason,
  type SectionConstraintSlot,
} from "./section-constraint-problem.js";

test("section CSP accepts intentional rests only with allowed reasons", () => {
  const plan = sectionPlan({ state: "episode" });
  const problem = buildSectionConstraintProblem({
    notes: supportedNotes(plan.startTick),
    sectionPlan: plan,
  });
  const invalidRestSlot: SectionConstraintSlot = {
    voice: "alto",
    startTick: plan.startTick,
    endTick: plan.startTick + TICKS_PER_QUARTER,
    value: { kind: "intentional-rest", reason: "decorative-rest" },
  };
  const review = evaluateSectionConstraintProblem({
    problem: {
      ...problem,
      slots: [
        ...problem.slots.filter((slot) => slot.voice !== "alto" || slot.startTick !== plan.startTick),
        invalidRestSlot,
      ],
    },
    notes: supportedNotes(plan.startTick),
    sectionPlan: plan,
  });

  assert.equal(isAllowedIntentionalRestReason("cadence-breath"), true);
  assert.equal(isAllowedIntentionalRestReason("decorative-rest"), false);
  assert.equal(review.infeasibleConstraintCounts.invalidIntentionalRestReason, 1);
});

test("section CSP rejects unsupported solo and long unplanned silent runs", () => {
  const plan = sectionPlan({ state: "episode", durationTicks: TICKS_PER_QUARTER * 4 });
  const notes = [
    note({
      voice: "soprano",
      startTick: plan.startTick,
      durationTicks: plan.durationTicks,
      pitch: 72,
    }),
  ];
  const review = evaluateSectionConstraintProblem({
    problem: buildSectionConstraintProblem({ notes, sectionPlan: plan }),
    notes,
    sectionPlan: plan,
  });

  assert.equal(review.infeasibleConstraintCounts.unsupportedSolo, 4);
  assert.equal(review.infeasibleConstraintCounts.minActiveVoiceViolation, 4);
  assert.equal(review.infeasibleConstraintCounts.longUnplannedSilentRun, 3);
  assert.equal(review.selectedRelaxationLevel, "density-floor-review");
});

test("section CSP accepts function-classified entry handoff thinning", () => {
  const plan: HarmonicPlan = {
    ...sectionPlan({ state: "subject-return", durationTicks: TICKS_PER_QUARTER * 4 }),
    cadenceKind: "deceptive",
  };
  const notes = [
    note({ voice: "soprano", startTick: 0, durationTicks: plan.durationTicks, pitch: 72, role: "subject" }),
    note({ voice: "tenor", startTick: 0, durationTicks: plan.durationTicks, pitch: 55 }),
    note({ voice: "alto", startTick: TICKS_PER_QUARTER, durationTicks: TICKS_PER_QUARTER * 3, pitch: 64 }),
    note({ voice: "bass", startTick: TICKS_PER_QUARTER, durationTicks: TICKS_PER_QUARTER * 3, pitch: 48 }),
  ];
  const entry = plannedEntry({ voice: "soprano", state: "subject-return", actualPitchClassSequence: [0] });
  const review = evaluateSectionConstraintProblem({
    problem: buildSectionConstraintProblem({
      notes,
      sectionPlan: plan,
      subjectEntries: [entry],
      intentionalRests: [
        {
          voice: "alto",
          startTick: 0,
          endTick: TICKS_PER_QUARTER,
          durationTicks: TICKS_PER_QUARTER,
          state: plan.state,
          reason: "entry-handoff-delay",
        },
        {
          voice: "bass",
          startTick: 0,
          endTick: TICKS_PER_QUARTER,
          durationTicks: TICKS_PER_QUARTER,
          state: plan.state,
          reason: "entry-handoff-delay",
        },
      ],
    }),
    notes,
    sectionPlan: plan,
    subjectEntries: [entry],
  });

  assert.equal(review.infeasibleConstraintCounts.minActiveVoiceViolation, 0);
  assert.ok(
    review.densityClassifications.every(
      (classification) =>
        classification.reason === "entry-handoff-delay" && classification.response === "accepted-context",
    ),
  );
});

test("section CSP separates passing support from an unsupported structural label", () => {
  const startTick = TICKS_PER_QUARTER;
  const plan: HarmonicPlan = {
    ...sectionPlan({ state: "episode", startTick, durationTicks: TICKS_PER_QUARTER * 2 }),
    cadenceKind: "deceptive",
  };
  const passingNotes = [
    note({ voice: "soprano", startTick: 0, pitch: 60 }),
    note({
      voice: "soprano",
      startTick,
      pitch: 62,
      metricalHarmonyIntent: "structural-chord-tone",
    }),
    note({ voice: "soprano", startTick: startTick * 2, pitch: 64 }),
    ...supportedNotes(startTick, plan.durationTicks).filter((candidate) => candidate.voice !== "soprano"),
  ];
  const passing = evaluateSectionConstraintProblem({
    problem: buildSectionConstraintProblem({ notes: passingNotes, sectionPlan: plan }),
    notes: passingNotes,
    sectionPlan: plan,
  });
  const unsupportedNotes = passingNotes
    .filter((candidate) => candidate.voice !== "soprano")
    .concat(
      note({
        voice: "soprano",
        startTick,
        durationTicks: plan.durationTicks,
        pitch: 62,
        metricalHarmonyIntent: "structural-chord-tone",
      }),
    );
  const unsupported = evaluateSectionConstraintProblem({
    problem: buildSectionConstraintProblem({ notes: unsupportedNotes, sectionPlan: plan }),
    notes: unsupportedNotes,
    sectionPlan: plan,
  });

  assert.equal(passing.infeasibleConstraintCounts.nonChordStructuralSupportCount, 0);
  assert.ok(
    passing.structuralSupportClassifications.some((classification) => classification.classification === "passing-tone"),
  );
  assert.ok(unsupported.infeasibleConstraintCounts.nonChordStructuralSupportCount > 0);
  assert.ok(
    unsupported.structuralSupportClassifications.some(
      (classification) => classification.classification === "unsupported-structural-label",
    ),
  );
});

test("section CSP requires structural root and chord support at harmonic anchors", () => {
  const plan = sectionPlan({ state: "subject-return" });
  const unsupported = evaluateSectionConstraintProblem({
    problem: buildSectionConstraintProblem({
      notes: [
        note({ voice: "soprano", startTick: plan.startTick, pitch: 74 }),
        note({ voice: "alto", startTick: plan.startTick, pitch: 65 }),
        note({ voice: "tenor", startTick: plan.startTick, pitch: 57 }),
      ],
      sectionPlan: plan,
    }),
    notes: [
      note({ voice: "soprano", startTick: plan.startTick, pitch: 74 }),
      note({ voice: "alto", startTick: plan.startTick, pitch: 65 }),
      note({ voice: "tenor", startTick: plan.startTick, pitch: 57 }),
    ],
    sectionPlan: plan,
  });
  const supportedNotesAtAnchor = supportedNotes(plan.startTick, plan.durationTicks);
  const supported = evaluateSectionConstraintProblem({
    problem: buildSectionConstraintProblem({ notes: supportedNotesAtAnchor, sectionPlan: plan }),
    notes: supportedNotesAtAnchor,
    sectionPlan: plan,
  });

  assert.ok(unsupported.infeasibleConstraintCounts.structuralChordSupportMiss > 0);
  assert.ok(unsupported.infeasibleConstraintCounts.structuralRootSupportMiss > 0);
  assert.equal(supported.infeasibleConstraintCounts.structuralChordSupportMiss, 0);
  assert.equal(supported.infeasibleConstraintCounts.structuralRootSupportMiss, 0);
});

test("section CSP diagnostics are deterministic for the same seed and input", () => {
  const first = generateScore({ seed: "fugue-smoke", lengthTicks: TICKS_PER_QUARTER * 32 });
  const second = generateScore({ seed: "fugue-smoke", lengthTicks: TICKS_PER_QUARTER * 32 });

  assert.deepEqual(first.diagnostics.constraintSatisfactionReview, second.diagnostics.constraintSatisfactionReview);
  assert.equal(first.diagnostics.constraintSatisfactionReview.schemaVersion, 6);
  assert.ok(first.diagnostics.constraintSatisfactionReview.solverCandidateCount > 0);
  assert.equal(typeof first.diagnostics.constraintSatisfactionReview.metricalBoundaryCost, "number");
  assert.equal(typeof first.diagnostics.constraintSatisfactionReview.unpreparedTransitionCount, "number");
});

test("section CSP counts upper-line thematic monopoly as soft agency evidence", () => {
  const plan = sectionPlan({ state: "subject-return", durationTicks: TICKS_PER_QUARTER * 4 });
  const notes = [
    note({ voice: "soprano", startTick: 0, durationTicks: plan.durationTicks, pitch: 72, role: "subject" }),
    note({ voice: "alto", startTick: 0, durationTicks: plan.durationTicks, pitch: 64, role: "free-counterpoint" }),
    note({ voice: "tenor", startTick: 0, durationTicks: plan.durationTicks, pitch: 55, role: "free-counterpoint" }),
    note({ voice: "bass", startTick: 0, durationTicks: plan.durationTicks, pitch: 48, role: "free-counterpoint" }),
  ];
  const review = evaluateSectionConstraintProblem({
    problem: buildSectionConstraintProblem({ notes, sectionPlan: plan }),
    notes,
    sectionPlan: plan,
  });

  assert.ok(review.infeasibleConstraintCounts.upperVoiceThematicMonopolyCount > 0);
  assert.ok(review.infeasibleConstraintCounts.lowerVoiceFillerDominanceCount > 0);
  assert.equal(review.selectedRelaxationLevel, "none");
});

test("section CSP accepts upper free-counterpoint agency with the same density", () => {
  const plan = sectionPlan({ state: "episode", durationTicks: TICKS_PER_QUARTER * 2 });
  const notes = [
    note({ voice: "soprano", startTick: 0, durationTicks: plan.durationTicks, pitch: 72, role: "free-counterpoint" }),
    note({ voice: "alto", startTick: 0, durationTicks: plan.durationTicks, pitch: 64, role: "free-counterpoint" }),
    note({ voice: "tenor", startTick: 0, durationTicks: plan.durationTicks, pitch: 55, role: "free-counterpoint" }),
    note({ voice: "bass", startTick: 0, durationTicks: plan.durationTicks, pitch: 48, role: "free-counterpoint" }),
  ];
  const review = evaluateSectionConstraintProblem({
    problem: buildSectionConstraintProblem({ notes, sectionPlan: plan }),
    notes,
    sectionPlan: plan,
  });

  assert.equal(review.infeasibleConstraintCounts.upperVoiceThematicMonopolyCount, 0);
  assert.equal(review.infeasibleConstraintCounts.lowerVoiceFillerDominanceCount, 0);
});

test("section CSP counts lower-line continuity gaps when upper agency thins low support", () => {
  const plan: HarmonicPlan = {
    ...sectionPlan({ state: "episode", durationTicks: TICKS_PER_QUARTER * 4 }),
    cadenceKind: "deceptive",
  };
  const notes = [
    note({ voice: "soprano", startTick: 0, durationTicks: plan.durationTicks, pitch: 72, role: "free-counterpoint" }),
    note({ voice: "alto", startTick: 0, durationTicks: plan.durationTicks, pitch: 64, role: "free-counterpoint" }),
    note({ voice: "tenor", startTick: 0, durationTicks: plan.durationTicks, pitch: 55, role: "free-counterpoint" }),
  ];
  const review = evaluateSectionConstraintProblem({
    problem: buildSectionConstraintProblem({ notes, sectionPlan: plan }),
    notes,
    sectionPlan: plan,
  });

  assert.ok(review.infeasibleConstraintCounts.lowerLineContinuityGapCount > 0);
});

test("section CSP counts free-counterpoint scarcity away from planned entries and cadences", () => {
  const plan: HarmonicPlan = {
    ...sectionPlan({ state: "episode", durationTicks: TICKS_PER_QUARTER * 4 }),
    cadenceKind: "deceptive",
    anchors: [
      { tick: 0, localKey: cMajor(), function: "tonic", cadenceTarget: false },
      { tick: TICKS_PER_QUARTER * 2, localKey: cMajor(), function: "tonic", cadenceTarget: false },
    ],
  };
  const notes = [
    note({ voice: "soprano", startTick: 0, durationTicks: plan.durationTicks, pitch: 72, role: "subject-fragment" }),
    note({ voice: "alto", startTick: 0, durationTicks: plan.durationTicks, pitch: 64, role: "counter-subject" }),
    note({ voice: "tenor", startTick: 0, durationTicks: plan.durationTicks, pitch: 55, role: "counter-subject" }),
    note({ voice: "bass", startTick: 0, durationTicks: plan.durationTicks, pitch: 48, role: "answer" }),
  ];
  const review = evaluateSectionConstraintProblem({
    problem: buildSectionConstraintProblem({ notes, sectionPlan: plan }),
    notes,
    sectionPlan: plan,
  });

  assert.ok(review.infeasibleConstraintCounts.freeCounterpointScarcityCount > 0);
  assert.equal(review.selectedRelaxationLevel, "none");
});

test("section CSP counts structural support lockstep as soft agency evidence", () => {
  const basePlan = sectionPlan({ state: "episode", durationTicks: TICKS_PER_QUARTER * 4 });
  const plan: HarmonicPlan = {
    ...basePlan,
    cadenceKind: "half",
    anchors: [
      { tick: 0, localKey: cMajor(), function: "tonic", cadenceTarget: false },
      { tick: TICKS_PER_QUARTER * 2, localKey: cMajor(), function: "tonic", cadenceTarget: false },
    ],
  };
  const notes = [
    note({ voice: "soprano", startTick: 0, durationTicks: plan.durationTicks, pitch: 72, role: "free-counterpoint" }),
    note({
      voice: "alto",
      startTick: 0,
      durationTicks: plan.durationTicks,
      pitch: 64,
      role: "free-counterpoint",
      metricalHarmonyIntent: "structural-chord-tone",
    }),
    note({
      voice: "tenor",
      startTick: 0,
      durationTicks: plan.durationTicks,
      pitch: 55,
      role: "free-counterpoint",
      metricalHarmonyIntent: "structural-chord-tone",
    }),
    note({
      voice: "bass",
      startTick: 0,
      durationTicks: plan.durationTicks,
      pitch: 48,
      role: "free-counterpoint",
      metricalHarmonyIntent: "structural-root-support",
    }),
  ];
  const review = evaluateSectionConstraintProblem({
    problem: buildSectionConstraintProblem({ notes, sectionPlan: plan }),
    notes,
    sectionPlan: plan,
  });

  assert.ok(review.infeasibleConstraintCounts.supportFillerLockstepCount > 0);
  assert.equal(review.selectedRelaxationLevel, "none");
});

test("section CSP counts short structural support churn as soft agency evidence", () => {
  const plan: HarmonicPlan = {
    ...sectionPlan({ state: "episode", durationTicks: TICKS_PER_QUARTER * 4 }),
    cadenceKind: "deceptive",
  };
  const notes = [
    note({ voice: "soprano", startTick: 0, durationTicks: plan.durationTicks, pitch: 72, role: "free-counterpoint" }),
    note({ voice: "alto", startTick: 0, durationTicks: plan.durationTicks, pitch: 64, role: "free-counterpoint" }),
    note({
      voice: "tenor",
      startTick: 0,
      durationTicks: TICKS_PER_QUARTER,
      pitch: 55,
      role: "free-counterpoint",
      metricalHarmonyIntent: "structural-chord-tone",
    }),
    note({
      voice: "tenor",
      startTick: TICKS_PER_QUARTER,
      durationTicks: TICKS_PER_QUARTER,
      pitch: 55,
      role: "free-counterpoint",
      metricalHarmonyIntent: "structural-chord-tone",
    }),
    note({
      voice: "bass",
      startTick: 0,
      durationTicks: plan.durationTicks,
      pitch: 48,
      role: "free-counterpoint",
      metricalHarmonyIntent: "structural-root-support",
    }),
  ];
  const review = evaluateSectionConstraintProblem({
    problem: buildSectionConstraintProblem({ notes, sectionPlan: plan }),
    notes,
    sectionPlan: plan,
  });

  assert.ok(review.infeasibleConstraintCounts.shortStructuralSupportChurnCount > 0);
});

test("section CSP metrical-boundary cost ranks downbeat, prepared pickup, and unprepared offbeat", () => {
  const downbeatPlan = sectionPlan({ state: "episode", startTick: 0 });
  const preparedPlan = sectionPlan({ state: "episode", startTick: TICKS_PER_QUARTER });
  const offbeatPlan = sectionPlan({ state: "episode", startTick: TICKS_PER_QUARTER / 2 });
  const downbeat = evaluateSectionConstraintProblem({
    problem: buildSectionConstraintProblem({ notes: supportedNotes(0), sectionPlan: downbeatPlan }),
    notes: supportedNotes(0),
    sectionPlan: downbeatPlan,
  });
  const preparedNotes = [
    note({ voice: "bass", startTick: 0, durationTicks: TICKS_PER_QUARTER * 2, pitch: 48 }),
    ...supportedNotes(preparedPlan.startTick).filter((candidate) => candidate.voice !== "bass"),
  ];
  const prepared = evaluateSectionConstraintProblem({
    problem: buildSectionConstraintProblem({ notes: preparedNotes, sectionPlan: preparedPlan }),
    notes: preparedNotes,
    sectionPlan: preparedPlan,
  });
  const offbeat = evaluateSectionConstraintProblem({
    problem: buildSectionConstraintProblem({ notes: supportedNotes(offbeatPlan.startTick), sectionPlan: offbeatPlan }),
    notes: supportedNotes(offbeatPlan.startTick),
    sectionPlan: offbeatPlan,
  });

  assert.ok(downbeat.metricalBoundaryCost < prepared.metricalBoundaryCost);
  assert.ok(prepared.metricalBoundaryCost < offbeat.metricalBoundaryCost);
  assert.equal(prepared.preparedPickupCount > 0, true);
  assert.equal(offbeat.unpreparedTransitionCount > 0, true);
});

test("section CSP detects planned entry identity, support, unison, and lockstep pressure", () => {
  const plan = sectionPlan({ state: "subject-return", durationTicks: TICKS_PER_QUARTER * 4 });
  const entry = plannedEntry({
    voice: "soprano",
    form: "answer",
    state: "subject-return",
    actualPitchClassSequence: [7, 9],
  });
  const notes = [
    note({ voice: "soprano", startTick: 0, durationTicks: TICKS_PER_QUARTER, pitch: 60, role: "answer" }),
    note({
      voice: "soprano",
      startTick: TICKS_PER_QUARTER,
      durationTicks: TICKS_PER_QUARTER,
      pitch: 62,
      role: "answer",
    }),
    note({ voice: "alto", startTick: 0, durationTicks: TICKS_PER_QUARTER * 2, pitch: 61, role: "counter-subject" }),
    note({ voice: "tenor", startTick: 0, durationTicks: TICKS_PER_QUARTER, pitch: 48, role: "free-counterpoint" }),
    note({ voice: "bass", startTick: 0, durationTicks: TICKS_PER_QUARTER, pitch: 36, role: "free-counterpoint" }),
  ];
  const review = evaluateSectionConstraintProblem({
    problem: buildSectionConstraintProblem({ notes, sectionPlan: plan, subjectEntries: [entry] }),
    notes,
    sectionPlan: plan,
    subjectEntries: [entry],
  });

  assert.equal(review.infeasibleConstraintCounts.entryPlanViolationCount, 1);
  assert.ok(review.infeasibleConstraintCounts.entrySupportInstabilityCount > 0);
  assert.ok(review.infeasibleConstraintCounts.unresolvedSevereEntryIntervalCount > 0);
  assert.ok(review.infeasibleConstraintCounts.voicePairUnisonPressureCount > 0);
  assert.ok(review.infeasibleConstraintCounts.voicePairLockstepCount > 0);
});

function sectionPlan(input: { state: FugueState; startTick?: number; durationTicks?: number }): HarmonicPlan {
  return buildHarmonicPlan({
    state: input.state,
    startTick: input.startTick ?? 0,
    durationTicks: input.durationTicks ?? TICKS_PER_QUARTER * 4,
    globalKey: { tonic: "C", mode: "major" },
    localKey: { tonic: "C", mode: "major" },
    targetKey: { tonic: "C", mode: "major" },
    styleProfile: "strict-classical",
    cadenceKind: "authentic",
    ambiguityIntent: "none",
    meterContext: createMeterContext({ numerator: 4, denominator: 4 }),
  });
}

function supportedNotes(startTick: number, durationTicks = TICKS_PER_QUARTER): NoteEvent[] {
  return [
    note({ voice: "bass", startTick, durationTicks, pitch: 48 }),
    note({ voice: "tenor", startTick, durationTicks, pitch: 55 }),
    note({ voice: "alto", startTick, durationTicks, pitch: 64 }),
    note({ voice: "soprano", startTick, durationTicks, pitch: 72 }),
  ];
}

function note(input: {
  voice: NoteEvent["voice"];
  startTick: number;
  durationTicks?: number;
  pitch: number;
  role?: NoteEvent["role"];
  metricalHarmonyIntent?: MetricalHarmonyIntent;
}): NoteEvent {
  return {
    kind: "note",
    voice: input.voice,
    startTick: input.startTick,
    durationTicks: input.durationTicks ?? TICKS_PER_QUARTER,
    pitch: input.pitch,
    velocity: 72,
    role: input.role ?? "free-counterpoint",
    metricalHarmonyIntent: input.metricalHarmonyIntent,
  };
}

function plannedEntry(input: Partial<PlannedEntry> & { voice: Voice }): PlannedEntry {
  return {
    voice: input.voice,
    form: input.form ?? "subject",
    state: input.state ?? "subject-return",
    startTick: input.startTick ?? 0,
    globalKey: input.globalKey ?? cMajor(),
    localKey: input.localKey ?? cMajor(),
    answerKind: input.answerKind,
    registerTarget: input.registerTarget ?? 60,
    expectedDegreePattern: input.expectedDegreePattern ?? [0, 1],
    actualPitchClassSequence: input.actualPitchClassSequence ?? [0, 2],
    metricalIntentPattern: input.metricalIntentPattern ?? [],
  };
}

function cMajor(): KeySignature {
  return { tonic: "C", mode: "major" };
}
