import assert from "node:assert/strict";
import test from "node:test";
import { TICKS_PER_QUARTER } from "./constants.js";
import type { MetaEvent } from "./events.js";
import { generateScore } from "./generate.js";

const FOCUSED_THREE_FOUR_SEEDS = ["seed-0kowcm6-0am7x3f", "seed-0zereox-1v729ih", "tight-stretto"] as const;
const FOUR_FOUR_CONTROL_SEEDS = ["fugue-smoke", "bach-001", "contrary-motion"] as const;

test("focused metrical repair seeds keep the reviewed baseline visible", () => {
  for (const seed of FOCUSED_THREE_FOUR_SEEDS) {
    const output = generateScore({ seed, lengthTicks: TICKS_PER_QUARTER * 32 });
    const signature = timeSignature(output.events);
    const expositionEntries = output.diagnostics.subjectEntries.slice(0, 4);

    assert.deepEqual(signature.payload, { numerator: 3, denominator: 4 });
    assert.deepEqual(
      expositionEntries.map((entry) => entry.startTick),
      [0, 4, 8, 12].map((quarter) => quarter * TICKS_PER_QUARTER),
    );
    assert.deepEqual(
      expositionEntries.map((entry) => quarterOffsetInMeasure(entry.startTick, signature.payload.numerator)),
      [0, 1, 2, 0],
    );
    assert.deepEqual(
      expositionEntries[0]?.metricalIntentPattern
        .filter((intent) => intent.beatStrength === "strong")
        .map((intent) => intent.offsetTick),
      [0, 2, 4, 6].map((quarter) => quarter * TICKS_PER_QUARTER),
    );
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
  return (tick / TICKS_PER_QUARTER) % numerator;
}
