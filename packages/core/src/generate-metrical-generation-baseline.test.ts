import assert from "node:assert/strict";
import test from "node:test";
import { TICKS_PER_QUARTER } from "./constants.js";
import type { MetaEvent } from "./events.js";
import { generateScore } from "./generate.js";

const FOCUSED_THREE_FOUR_SEEDS = ["seed-0kowcm6-0am7x3f", "seed-0zereox-1v729ih", "tight-stretto"] as const;
const FOUR_FOUR_CONTROL_SEEDS = ["fugue-smoke", "bach-001", "contrary-motion"] as const;
const FOCUSED_SIX_EIGHT_SEEDS = ["meter-6-8-122", "meter-6-8-150", "meter-6-8-169"] as const;

test("focused 3/4 metrical repair seeds establish triple-meter entry starts", () => {
  for (const seed of FOCUSED_THREE_FOUR_SEEDS) {
    const output = generateScore({ seed, lengthTicks: TICKS_PER_QUARTER * 32 });
    const signature = timeSignature(output.events);
    const expositionEntries = output.diagnostics.subjectEntries.slice(0, 4);
    const meterReview = output.diagnostics.meterConsistencyReview;

    assert.deepEqual(signature.payload, { numerator: 3, denominator: 4 });
    assert.deepEqual(
      expositionEntries.map((entry) => entry.startTick),
      [0, 3, 6, 9].map((quarter) => quarter * TICKS_PER_QUARTER),
    );
    assert.deepEqual(
      expositionEntries.map((entry) => quarterOffsetInMeasure(entry.startTick, signature.payload.numerator)),
      [0, 0, 0, 0],
    );
    assert.deepEqual(
      expositionEntries[0]?.metricalIntentPattern
        .filter((intent) => intent.beatStrength === "strong")
        .map((intent) => intent.offsetTick),
      [0, 3].map((quarter) => quarter * TICKS_PER_QUARTER),
    );
    assert.equal(meterReview.timeSignature.numerator, 3);
    assert.equal(meterReview.offMeasureEntryCount, 0);
    assert.equal(meterReview.strongIntentOnNonDownbeatCount, 0);
    assert.equal(meterReview.cadenceTargetOffDownbeatCount, 0);
  }
});

test("focused 6/8 metrical repair seeds expose compound grouping", () => {
  for (const seed of FOCUSED_SIX_EIGHT_SEEDS) {
    const output = generateScore({ seed, lengthTicks: TICKS_PER_QUARTER * 32 });
    const signature = timeSignature(output.events);
    const expositionEntries = output.diagnostics.subjectEntries.slice(0, 4);
    const meterReview = output.diagnostics.meterConsistencyReview;

    assert.deepEqual(signature.payload, { numerator: 6, denominator: 8 });
    assert.deepEqual(
      expositionEntries.map((entry) => entry.startTick),
      [0, 3, 6, 9].map((quarter) => quarter * TICKS_PER_QUARTER),
    );
    assert.ok(meterReview.compound);
    assert.ok(meterReview.compoundMidpointCount > 0);
    assert.equal(meterReview.cadenceTargetOffDownbeatCount, 0);
  }
});

test("metrical repair controls include the reviewed common-time seed set", () => {
  for (const seed of FOUR_FOUR_CONTROL_SEEDS) {
    const output = generateScore({ seed, lengthTicks: TICKS_PER_QUARTER * 32 });
    const signature = timeSignature(output.events);

    assert.deepEqual(signature.payload, { numerator: 4, denominator: 4 });
    assert.deepEqual(
      output.diagnostics.subjectEntries.slice(0, 4).map((entry) => entry.startTick),
      [0, 4, 8, 12].map((quarter) => quarter * TICKS_PER_QUARTER),
    );
  }
});

function timeSignature(
  events: ReturnType<typeof generateScore>["events"],
): Extract<MetaEvent, { type: "time-signature" }> {
  const event = events.find(
    (candidate): candidate is Extract<MetaEvent, { type: "time-signature" }> =>
      candidate.kind === "meta" && candidate.type === "time-signature",
  );

  assert.ok(event !== undefined);
  return event;
}

function quarterOffsetInMeasure(tick: number, numerator: 3 | 4 | 6): number {
  return (tick / TICKS_PER_QUARTER) % (numerator === 6 ? 3 : numerator);
}
