import assert from "node:assert/strict";
import test from "node:test";
import type { VoicePairSpanClassification, VoicePairSpanSummary } from "../events.js";
import { classifyVoicePairSpan, selectVoicePairReviewSpans } from "./quality-vector-voice-pairs.js";

test("voice-pair review selection retains shorter evidence from every classification", () => {
  const classifications: VoicePairSpanClassification[] = [
    "mechanical-coupling",
    "exact-collision",
    "color-doubling",
    "subject-support",
    "cadence-support",
    "sequence-support",
    "pitch-class-reinforcement",
  ];
  const functionalSpans = Array.from({ length: 18 }, (_, index) =>
    span("subject-support", 20_000 - index * 100, index),
  );
  const reviewSpans = classifications
    .filter((classification) => classification !== "subject-support")
    .map((classification, index) => span(classification, 1_000 - index, 100 + index));

  const selected = selectVoicePairReviewSpans([...functionalSpans, ...reviewSpans]);

  assert.equal(selected.length, 18);
  for (const classification of classifications) {
    assert.ok(selected.some((candidate) => candidate.classification === classification));
  }
});

test("planned-entry pickup support is functional rather than mechanical coupling", () => {
  const pickup = {
    pitch: 48,
    role: "free-counterpoint" as const,
    startTick: 480,
    durationTicks: 960,
    motivicDerivation: {
      sourceMotive: "prior-episode-figure" as const,
      transformationKind: "rhythmic-paraphrase" as const,
      targetFunction: "prepare-subject-return" as const,
      sequenceDirection: "none" as const,
      preparesNextEntry: true,
      preparesCadence: false,
    },
  };
  const outsideVoice = {
    pitch: 64,
    role: "free-counterpoint" as const,
    startTick: 480,
    durationTicks: 960,
    motivicDerivation: undefined,
  };

  assert.equal(classifyVoicePairSpan(pickup, outsideVoice, undefined, 480), "subject-support");
  assert.equal(
    classifyVoicePairSpan({ ...pickup, motivicDerivation: undefined }, outsideVoice, undefined, 480),
    "mechanical-coupling",
  );
});

test("shared motivic function distinguishes imitation and cadence from mechanical lockstep", () => {
  const note = {
    pitch: 60,
    role: "free-counterpoint" as const,
    startTick: 480,
    durationTicks: 960,
    motivicDerivation: {
      sourceMotive: "prior-episode-figure" as const,
      transformationKind: "rhythmic-paraphrase" as const,
      targetFunction: "prepare-subject-return" as const,
      sequenceDirection: "none" as const,
      preparesNextEntry: false,
      preparesCadence: false,
    },
  };

  assert.equal(classifyVoicePairSpan(note, { ...note, pitch: 64 }, undefined, 480), "subject-support");
  assert.equal(
    classifyVoicePairSpan(
      { ...note, motivicDerivation: { ...note.motivicDerivation, targetFunction: "extend-cadence" } },
      {
        ...note,
        pitch: 64,
        motivicDerivation: { ...note.motivicDerivation, targetFunction: "extend-cadence" },
      },
      undefined,
      480,
    ),
    "cadence-support",
  );
  assert.equal(
    classifyVoicePairSpan(
      note,
      { ...note, pitch: 64, motivicDerivation: { ...note.motivicDerivation, targetFunction: "relax-after-density" } },
      undefined,
      480,
    ),
    "mechanical-coupling",
  );
});

function span(
  classification: VoicePairSpanClassification,
  durationTicks: number,
  startTick: number,
): VoicePairSpanSummary {
  return {
    leftVoice: "soprano",
    rightVoice: "bass",
    startTick,
    durationTicks,
    sectionRole: "subject-return",
    classification,
    symptom: classification,
  };
}
