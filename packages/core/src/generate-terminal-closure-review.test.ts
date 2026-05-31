import assert from "node:assert/strict";
import test from "node:test";
import { FUGUE_FORM_REVIEW_LENGTH_TICKS, TICKS_PER_QUARTER } from "./constants.js";
import type { CadenceKind, KeySignature, NoteEvent, ScoreEvent } from "./events.js";
import { generateScore } from "./generate.js";
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
    assert.equal(summary.terminalCadenceKind, cadenceKind);
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
    const output = generateScore({
      seed,
      lengthTicks: FUGUE_FORM_REVIEW_LENGTH_TICKS,
      mode: "endless-program",
    });
    const summary = output.diagnostics.terminalClosureReview;

    assert.equal(summary.classification, "accepted", seed);
    assert.ok(summary.cadenceTargetTick !== undefined, seed);
    assert.ok(summary.cadenceTargetTick >= FUGUE_FORM_REVIEW_LENGTH_TICKS - TICKS_PER_QUARTER * 4, seed);
    assert.match(summary.terminalCadenceKind ?? "", /^(authentic|modal)$/, seed);
    assert.equal(summary.lowVoiceSupport, "root-supported", seed);
    assert.equal(summary.outerVoiceLandingStatus, "stable", seed);
    assert.equal(summary.unresolvedBoundaryDissonanceCount, 0, seed);
  }
});

test("terminal closure intent preserves mode-specific boundary requirements", () => {
  const lengthTicks = TICKS_PER_QUARTER * 16;
  const continuous = generateScore({ seed: "fugue-smoke", lengthTicks, mode: "continuous-fugue" });
  const endless = generateScore({ seed: "fugue-smoke", lengthTicks, mode: "endless-program" });
  const regenerative = generateScore({ seed: "fugue-smoke", lengthTicks, mode: "regenerative-cycle" });

  assert.equal(continuous.diagnostics.terminalClosureReview.classification, "not-required");
  assert.equal(continuous.nextSegmentSnapshot.mode, "continuous-fugue");
  assert.equal(endless.diagnostics.terminalClosureReview.classification, "accepted");
  assert.equal(endless.nextSegmentSnapshot.mode, "endless-program");
  assert.equal(regenerative.diagnostics.terminalClosureReview.classification, "accepted");
  assert.equal(regenerative.nextSegmentSnapshot.mode, "regenerative-cycle");
});

test("endless-program intent changes only terminal-boundary score material", () => {
  const lengthTicks = TICKS_PER_QUARTER * 16;
  const terminalStartTick = lengthTicks - TICKS_PER_QUARTER;
  const continuous = generateScore({ seed: "fugue-smoke", lengthTicks, mode: "continuous-fugue" });
  const endless = generateScore({ seed: "fugue-smoke", lengthTicks, mode: "endless-program" });

  assert.deepEqual(
    continuous.events.filter(isNoteBefore(terminalStartTick - TICKS_PER_QUARTER)),
    endless.events.filter(isNoteBefore(terminalStartTick - TICKS_PER_QUARTER)),
  );
  assert.equal(endless.diagnostics.terminalClosureReview.classification, "accepted");
  assert.ok(
    endless.events.some(
      (event) => event.kind === "note" && event.startTick === terminalStartTick && event.voice === "bass",
    ),
  );
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

function terminalPlan(cadenceKind: CadenceKind, key: KeySignature) {
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
  });
}

function isNoteBefore(tick: number): (event: ScoreEvent) => boolean {
  return (event): boolean => event.kind === "note" && event.startTick + event.durationTicks <= tick;
}
