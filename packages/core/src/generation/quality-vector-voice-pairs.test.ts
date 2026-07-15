import assert from "node:assert/strict";
import test from "node:test";
import type { VoicePairSpanClassification, VoicePairSpanSummary } from "../events.js";
import { selectVoicePairReviewSpans } from "./quality-vector-voice-pairs.js";

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
