import assert from "node:assert/strict";
import test from "node:test";
import { FUGUE_FORM_REVIEW_LENGTH_TICKS, TICKS_PER_QUARTER } from "./constants.js";
import type { CadenceKind, HarmonicPlan, KeySignature, NoteEvent, ScoreEvent, Voice } from "./events.js";
import { cachedGenerateScore as generateScore } from "./generate-test-helpers.js";
import { buildHarmonicPlan } from "./generation/harmony.js";
import { createMeterContext } from "./generation/meter.js";
import { buildTerminalClosureReviewSummary } from "./generation/terminal-closure-review.js";

const C_MAJOR: KeySignature = { tonic: "C", mode: "major" };
const D_DORIAN: KeySignature = { tonic: "D", mode: "dorian" };
const LENGTH_TICKS = TICKS_PER_QUARTER * 4;
const CADENCE_TICK = TICKS_PER_QUARTER * 3;
const TERMINAL_CODA_TARGET_SEEDS = [
  "fugue-smoke",
  "modal-cadence",
  "sparse-cadence",
  "dense-modal",
  "tight-stretto",
  "circle-fifths",
  "bach-001",
  "minor-entry",
] as const;
const TERMINAL_CODA_QUALITY_REVIEW_SEEDS = [
  "bach-001",
  "fugue-smoke",
  "minor-entry",
  "wide-key",
  "lyrical-line",
  "modal-dorian",
  "circle-fifths",
  "close-imitation",
  "sparse-cadence",
  "bright-answer",
  "dark-episode",
  "ornament-test",
  "long-arc",
  "contrary-motion",
  "restless-line",
  "tight-stretto",
  "quiet-cadence",
  "angular-answer",
  "modal-answer",
  "modal-cadence",
  "contrary-answer",
  "dense-modal",
] as const;
const ENDLESS_REVIEW_OUTPUTS = new Map<string, ReturnType<typeof generateScore>>();

function endlessReviewOutput(seed: string): ReturnType<typeof generateScore> {
  const cached = ENDLESS_REVIEW_OUTPUTS.get(seed);
  if (cached !== undefined) {
    return cached;
  }
  const output = generateScore({
    seed,
    lengthTicks: FUGUE_FORM_REVIEW_LENGTH_TICKS,
    mode: "endless-program",
  });
  ENDLESS_REVIEW_OUTPUTS.set(seed, output);
  return output;
}

test("terminal closure review accepts authentic and modal terminal sonorities", () => {
  for (const [key, cadenceKind] of [
    [C_MAJOR, "authentic"],
    [D_DORIAN, "modal"],
  ] as const) {
    const summary = buildTerminalClosureReviewSummary({
      events: scoreEvents(stableSonorityNotes(key, TICKS_PER_QUARTER), LENGTH_TICKS),
      sectionPlans: [terminalPlan(cadenceKind, key)],
      mode: "endless-program",
      segmentIndex: 2,
    });

    assert.equal(summary.segmentIndex, 2);
    assert.equal(summary.schemaVersion, 3);
    assert.equal(summary.terminalCadenceKind, cadenceKind);
    assert.equal(summary.terminalClosureSource, "ordinary-terminal-cadence");
    assert.equal(summary.codaContinuity.classification, "not-applicable");
    assert.equal(summary.preparedVoiceReentry, "not-applicable");
    assert.equal(summary.lowVoiceSupport, "root-supported");
    assert.equal(summary.outerVoiceLandingStatus, "stable");
    assert.equal(summary.unresolvedBoundaryDissonanceCount, 0);
    assert.equal(summary.classification, "accepted");
  }
});

test("terminal closure review keeps non-terminal cadence labels review-visible", () => {
  for (const cadenceKind of ["half", "deceptive", "evaded", "modulatory"] as const) {
    const summary = buildTerminalClosureReviewSummary({
      events: scoreEvents(stableSonorityNotes(C_MAJOR, TICKS_PER_QUARTER), LENGTH_TICKS),
      sectionPlans: [terminalPlan(cadenceKind, C_MAJOR)],
      mode: "endless-program",
      segmentIndex: 0,
    });

    assert.equal(summary.terminalCadenceKind, cadenceKind);
    assert.equal(summary.classification, "review-required");
    assert.match(summary.reasons.join(" "), new RegExp(cadenceKind));
  }
});

test("terminal closure review requires low-voice support and rejects unsupported thinning", () => {
  const summary = buildTerminalClosureReviewSummary({
    events: scoreEvents([note("soprano", 72, CADENCE_TICK, TICKS_PER_QUARTER)], LENGTH_TICKS),
    sectionPlans: [terminalPlan("authentic", C_MAJOR)],
    mode: "endless-program",
    segmentIndex: 0,
  });

  assert.equal(summary.lowVoiceSupport, "missing");
  assert.equal(summary.thinningExplanation, "unsupported-collapse");
  assert.equal(summary.classification, "generator-response-required");
});

test("terminal closure review treats a rest after stable terminal sonority as a piece boundary", () => {
  const summary = buildTerminalClosureReviewSummary({
    events: scoreEvents(stableSonorityNotes(C_MAJOR, TICKS_PER_QUARTER / 2), LENGTH_TICKS),
    sectionPlans: [terminalPlan("authentic", C_MAJOR)],
    mode: "endless-program",
    segmentIndex: 0,
  });

  assert.equal(summary.finalRestClassification, "piece-boundary");
  assert.equal(summary.classification, "accepted");
});

test("continuous-fugue generation does not require terminal closure", () => {
  const output = generateScore({ seed: "fugue-smoke", lengthTicks: TICKS_PER_QUARTER * 16, mode: "continuous-fugue" });

  assert.equal(output.diagnostics.terminalClosureReview.classification, "not-required");
});

test("endless-program target seeds keep stable terminal closure evidence", () => {
  for (const seed of TERMINAL_CODA_TARGET_SEEDS) {
    const output = endlessReviewOutput(seed);
    const summary = output.diagnostics.terminalClosureReview;

    assert.equal(summary.classification, "accepted", seed);
    assert.equal(summary.terminalClosureSource, "generated-coda", seed);
    assert.equal(summary.preparedVoiceReentry, "prepared", seed);
    assert.equal(summary.finalAttackReentryVoiceCount, 0, seed);
    assert.ok(summary.codaStartTick !== undefined, seed);
    assert.ok(summary.cadenceTargetTick !== undefined, seed);
    assert.ok(summary.cadenceTargetTick >= FUGUE_FORM_REVIEW_LENGTH_TICKS - TICKS_PER_QUARTER * 4, seed);
    assert.match(summary.terminalCadenceKind ?? "", /^(authentic|modal)$/, seed);
    assert.equal(summary.lowVoiceSupport, "root-supported", seed);
    assert.equal(summary.outerVoiceLandingStatus, "stable", seed);
    assert.equal(summary.unresolvedBoundaryDissonanceCount, 0, seed);
    assert.ok(
      output.diagnostics.sectionPlans.some((plan) => plan.terminalIntent === "self-contained-coda"),
      seed,
    );
    assert.equal(summary.codaContinuity.classification, "accepted", seed);
    assert.match(
      summary.codaContinuity.codaArchetype ?? "",
      /^(final-fragment-entry|stretto-compaction|pedal-entry-cadence|liquidation-cadence|cadential-echo)$/,
      seed,
    );
    assert.ok(summary.codaContinuity.derivationCount >= 4, seed);
    assert.ok(summary.codaContinuity.subjectDerivedNoteCount >= 0, seed);
    assert.ok(summary.codaContinuity.pedalRootCoverageRatio >= 0, seed);
    assert.ok(Array.isArray(summary.codaContinuity.historicalFunctionCoverage), seed);
    assert.ok(summary.codaContinuity.movingVoiceCountBeforeCadence >= 1, seed);
  }
});

test("endless-program 22 seed codas expose final-subject and pedal-supported closing functions", () => {
  const archetypeCounts = new Map<string, number>();
  let acceptedCount = 0;
  let finalFragmentCount = 0;
  let pedalEntryCount = 0;
  let subjectDerivedSeedCount = 0;

  for (const seed of TERMINAL_CODA_QUALITY_REVIEW_SEEDS) {
    const output = endlessReviewOutput(seed);
    const summary = output.diagnostics.terminalClosureReview;
    const continuity = summary.codaContinuity;

    assert.equal(summary.classification, "accepted", seed);
    assert.equal(summary.terminalClosureSource, "generated-coda", seed);
    assert.equal(summary.unresolvedBoundaryDissonanceCount, 0, seed);
    assert.equal(summary.finalAttackReentryVoiceCount, 0, seed);
    assert.equal(continuity.classification, "accepted", seed);
    assert.ok(continuity.codaArchetype, seed);
    assert.ok(continuity.derivationCount >= 4, seed);
    assert.ok(continuity.historicalFunctionCoverage.length >= 1, seed);

    acceptedCount += 1;
    archetypeCounts.set(continuity.codaArchetype, (archetypeCounts.get(continuity.codaArchetype) ?? 0) + 1);
    finalFragmentCount += Number(continuity.codaArchetype === "final-fragment-entry");
    pedalEntryCount += Number(continuity.codaArchetype === "pedal-entry-cadence");
    subjectDerivedSeedCount += Number(continuity.subjectDerivedNoteCount > 0);

    if (continuity.codaArchetype === "pedal-entry-cadence") {
      assert.ok(continuity.pedalRootCoverageRatio >= 0.45, seed);
      assert.ok(continuity.movingVoiceCountBeforeCadence >= 2, seed);
      assert.ok(continuity.historicalFunctionCoverage.includes("pedal-supported"), seed);
    }
  }

  assert.equal(acceptedCount, TERMINAL_CODA_QUALITY_REVIEW_SEEDS.length);
  assert.ok(finalFragmentCount >= 1);
  assert.ok(pedalEntryCount >= 1);
  assert.ok((archetypeCounts.get("stretto-compaction") ?? 0) <= TERMINAL_CODA_QUALITY_REVIEW_SEEDS.length / 2);
  assert.ok(subjectDerivedSeedCount >= 2);
});

test("endless-program target codas keep derived pre-cadence motion before the landing", () => {
  for (const seed of TERMINAL_CODA_TARGET_SEEDS) {
    const output = endlessReviewOutput(seed);
    const summary = output.diagnostics.terminalClosureReview;
    const coda = output.diagnostics.sectionPlans.find((plan) => plan.terminalIntent === "self-contained-coda");

    assert.ok(coda, seed);
    assert.ok(summary.codaStartTick !== undefined, seed);
    assert.ok(summary.cadenceTargetTick !== undefined, seed);

    const codaNotesBeforeLanding = output.events.filter(
      (event): event is NoteEvent =>
        event.kind === "note" &&
        event.startTick >= summary.codaStartTick! &&
        event.startTick < summary.cadenceTargetTick!,
    );
    const derivedPreCadenceNotes = codaNotesBeforeLanding.filter(
      (noteEvent) =>
        noteEvent.motivicDerivation?.targetFunction === "extend-cadence" &&
        noteEvent.motivicDerivation.transformationKind !== "generic",
    );
    const movingNonBassVoices = (["tenor", "alto", "soprano"] as const).filter(
      (voice) => distinctStartTicks(codaNotesBeforeLanding, voice).size >= 2,
    );

    assert.ok(derivedPreCadenceNotes.length >= 4, seed);
    assert.ok(movingNonBassVoices.length >= 1, seed);
    assert.ok(
      derivedPreCadenceNotes.some((noteEvent) =>
        [
          "subject-head",
          "subject-tail",
          "answer-form",
          "counter-subject-head",
          "counter-subject-tail",
          "cadence-figure",
          "prior-episode-figure",
        ].includes(noteEvent.motivicDerivation?.sourceMotive ?? ""),
      ),
      seed,
    );
    assert.ok(
      codaNotesBeforeLanding.some(
        (noteEvent) => noteEvent.voice !== "bass" && noteEvent.metricalHarmonyIntent === "structural-chord-tone",
      ),
      seed,
    );
  }
});

test("generated self-contained coda keeps sudden final-attack reentry review-visible", () => {
  const plan = terminalPlan("authentic", C_MAJOR, "self-contained-coda");
  const summary = buildTerminalClosureReviewSummary({
    events: scoreEvents(stableSonorityNotes(C_MAJOR, TICKS_PER_QUARTER), LENGTH_TICKS),
    sectionPlans: [plan],
    mode: "endless-program",
    segmentIndex: 0,
  });
  const voiceReentryWindow = summary.windows.find((window) => window.kind === "voice-reentry");

  assert.equal(summary.terminalClosureSource, "generated-coda");
  assert.equal(summary.preparedVoiceReentry, "sudden-final-attack");
  assert.equal(summary.finalAttackReentryVoiceCount, 4);
  assert.equal(summary.codaContinuity.classification, "not-applicable");
  assert.equal(voiceReentryWindow?.classification, "review-required");
  assert.match(voiceReentryWindow?.reason ?? "", /4 terminal voice/);
});

test("generated all-voice long-tone coda is review-visible even with stable final sonority", () => {
  const plan = terminalPlan("authentic", C_MAJOR, "self-contained-coda");
  plan.terminalCodaContext = {
    schemaVersion: 1,
    archetype: "final-fragment-entry",
    selectionReason: "synthetic static coda fixture",
    recentMaterialSource: "subject-head",
    recentStateSequence: ["subject-return"],
    recentSubjectStemDegrees: [0, 1, 2, 4],
    rhythmicCellTicks: [TICKS_PER_QUARTER, TICKS_PER_QUARTER, TICKS_PER_QUARTER, TICKS_PER_QUARTER],
    activeVoiceCount: 4,
    textureDensity: 4,
    contourEnergy: 0,
    localMode: "major",
    cadenceKind: "authentic",
    availableDurationTicks: LENGTH_TICKS,
    pedalImplied: false,
  };
  const summary = buildTerminalClosureReviewSummary({
    events: scoreEvents(
      stableSonorityNotes(C_MAJOR, LENGTH_TICKS).map((event) => ({ ...event, startTick: 0 })),
      LENGTH_TICKS,
    ),
    sectionPlans: [plan],
    mode: "endless-program",
    segmentIndex: 0,
  });
  const codaWindow = summary.windows.find((window) => window.kind === "coda-continuity");

  assert.equal(summary.lowVoiceSupport, "root-supported");
  assert.equal(summary.outerVoiceLandingStatus, "stable");
  assert.equal(summary.codaContinuity.classification, "review-required");
  assert.equal(summary.classification, "review-required");
  assert.equal(summary.codaContinuity.derivationCount, 0);
  assert.equal(summary.codaContinuity.subjectDerivedNoteCount, 0);
  assert.equal(summary.codaContinuity.pedalRootCoverageRatio, 1);
  assert.deepEqual(summary.codaContinuity.historicalFunctionCoverage, []);
  assert.equal(summary.codaContinuity.movingVoiceCountBeforeCadence, 0);
  assert.ok(summary.codaContinuity.longestAllVoiceStaticSpanTicks >= TICKS_PER_QUARTER * 3);
  assert.equal(codaWindow?.classification, "review-required");
});

test("modal endless-program target codas keep modal terminal rhetoric", () => {
  for (const seed of ["modal-cadence", "dense-modal"] as const) {
    const output = endlessReviewOutput(seed);
    const coda = output.diagnostics.sectionPlans.find((plan) => plan.terminalIntent === "self-contained-coda");

    assert.ok(coda, seed);
    assert.equal(coda.cadenceKind, "modal", seed);
    assert.equal(coda.targetKey.mode, "aeolian", seed);
    assert.equal(output.diagnostics.terminalClosureReview.terminalCadenceKind, "modal", seed);
    assert.equal(output.diagnostics.terminalClosureReview.terminalClosureSource, "generated-coda", seed);
    assert.ok(output.diagnostics.tonalCadenceOveruseWarnings <= 1, seed);
  }
});

test("terminal closure intent preserves mode-specific boundary requirements", () => {
  const lengthTicks = TICKS_PER_QUARTER * 16;
  const continuous = generateScore({ seed: "fugue-smoke", lengthTicks, mode: "continuous-fugue" });
  const endless = generateScore({ seed: "fugue-smoke", lengthTicks, mode: "endless-program" });
  const regenerative = generateScore({ seed: "fugue-smoke", lengthTicks, mode: "regenerative-cycle" });

  assert.equal(continuous.diagnostics.terminalClosureReview.classification, "not-required");
  assert.equal(continuous.diagnostics.terminalClosureReview.terminalClosureSource, "not-required");
  assert.equal(continuous.nextSegmentSnapshot.mode, "continuous-fugue");
  assert.equal(endless.diagnostics.terminalClosureReview.classification, "accepted");
  assert.equal(endless.diagnostics.terminalClosureReview.terminalClosureSource, "fallback-terminal-closure");
  assert.equal(endless.nextSegmentSnapshot.mode, "endless-program");
  assert.equal(regenerative.diagnostics.terminalClosureReview.classification, "accepted");
  assert.equal(regenerative.diagnostics.terminalClosureReview.terminalClosureSource, "bridge-compatible-closure");
  assert.equal(regenerative.nextSegmentSnapshot.mode, "regenerative-cycle");
});

test("short endless-program intent keeps fallback terminal-boundary safety net", () => {
  const lengthTicks = TICKS_PER_QUARTER * 16;
  const terminalStartTick = lengthTicks - TICKS_PER_QUARTER;
  const continuous = generateScore({ seed: "fugue-smoke", lengthTicks, mode: "continuous-fugue" });
  const endless = generateScore({ seed: "fugue-smoke", lengthTicks, mode: "endless-program" });

  assert.deepEqual(
    continuous.events.filter(isNoteBefore(terminalStartTick - TICKS_PER_QUARTER)),
    endless.events.filter(isNoteBefore(terminalStartTick - TICKS_PER_QUARTER)),
  );
  assert.equal(endless.diagnostics.terminalClosureReview.classification, "accepted");
  assert.equal(endless.diagnostics.terminalClosureReview.terminalClosureSource, "fallback-terminal-closure");
  assert.ok(!endless.diagnostics.sectionPlans.some((plan) => plan.terminalIntent === "self-contained-coda"));
  assert.ok(
    endless.events.some(
      (event) => event.kind === "note" && event.startTick === terminalStartTick && event.voice === "bass",
    ),
  );
});

test("endless-program coda reserves planner-visible phrase time before the boundary", () => {
  const output = endlessReviewOutput("fugue-smoke");
  const coda = output.diagnostics.sectionPlans.find((plan) => plan.terminalIntent === "self-contained-coda");

  assert.ok(coda);
  assert.equal(coda.state, "subject-return");
  assert.equal(coda.cadenceKind, "authentic");
  assert.equal(coda.ambiguityIntent, "none");
  assert.ok(coda.terminalCodaContext);
  assert.equal(coda.terminalCodaContext.cadenceKind, "authentic");
  assert.ok(coda.terminalCodaContext.recentSubjectStemDegrees.length > 0);
  assert.ok(coda.durationTicks >= coda.meterContext.measureTicks * 2);
  assert.equal(output.diagnostics.terminalClosureReview.terminalClosureSource, "generated-coda");
  assert.equal(output.diagnostics.terminalClosureReview.codaContinuity.classification, "accepted");
  assert.equal(output.diagnostics.terminalClosureReview.codaStartTick, coda.startTick);
  assert.ok(output.diagnostics.stateTransitions.includes("subject-return"));
});

function stableSonorityNotes(key: KeySignature, durationTicks: number): NoteEvent[] {
  if (key.mode === "dorian") {
    return [
      note("bass", 38, CADENCE_TICK, durationTicks),
      note("tenor", 57, CADENCE_TICK, durationTicks),
      note("alto", 65, CADENCE_TICK, durationTicks),
      note("soprano", 74, CADENCE_TICK, durationTicks),
    ];
  }
  return [
    note("bass", 36, CADENCE_TICK, durationTicks),
    note("tenor", 55, CADENCE_TICK, durationTicks),
    note("alto", 64, CADENCE_TICK, durationTicks),
    note("soprano", 72, CADENCE_TICK, durationTicks),
  ];
}

function note(voice: NoteEvent["voice"], pitch: number, startTick: number, durationTicks: number): NoteEvent {
  return {
    kind: "note",
    voice,
    pitch,
    startTick,
    durationTicks,
    velocity: 72,
    role: "free-counterpoint",
  };
}

function scoreEvents(notes: NoteEvent[], lengthTicks: number): ScoreEvent[] {
  return [
    ...notes,
    {
      kind: "meta",
      type: "score-end",
      tick: lengthTicks,
      payload: { lengthTicks },
    },
  ];
}

function terminalPlan(
  cadenceKind: CadenceKind,
  key: KeySignature,
  terminalIntent?: HarmonicPlan["terminalIntent"],
): HarmonicPlan {
  return buildHarmonicPlan({
    state: "subject-return",
    startTick: 0,
    durationTicks: LENGTH_TICKS,
    globalKey: key,
    localKey: key,
    targetKey: key,
    styleProfile: key.mode === "major" || key.mode === "minor" ? "strict-classical" : "hybrid",
    cadenceKind,
    ambiguityIntent: "none",
    meterContext: createMeterContext({ numerator: 4, denominator: 4 }),
    terminalIntent,
  });
}

function isNoteBefore(tick: number): (event: ScoreEvent) => boolean {
  return (event): boolean => event.kind === "note" && event.startTick + event.durationTicks <= tick;
}

function distinctStartTicks(notes: readonly NoteEvent[], voice: Voice): Set<number> {
  return new Set(notes.filter((noteEvent) => noteEvent.voice === voice).map((noteEvent) => noteEvent.startTick));
}
