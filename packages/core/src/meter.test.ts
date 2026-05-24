import assert from "node:assert/strict";
import test from "node:test";
import { TICKS_PER_QUARTER } from "./constants.js";
import { beatStrengthAtTick, createLegacyMeterContext, createMeterContext } from "./generation/meter.js";

test("legacy meter context preserves the existing two-quarter accent cycle", () => {
  const meterContext = createLegacyMeterContext();

  assert.deepEqual(
    [0, 1, 2, 3, 4, 5, 6].map((quarter) => beatStrengthAtTick(quarter * TICKS_PER_QUARTER, meterContext)),
    ["strong", "weak", "strong", "weak", "strong", "weak", "strong"],
  );
});

test("time-signature meter context maps simple and compound beat strength", () => {
  const triple = createMeterContext({ numerator: 3, denominator: 4 });
  const compound = createMeterContext({ numerator: 6, denominator: 8 });

  assert.deepEqual(
    [0, 1, 2, 3, 4, 5, 6].map((quarter) => beatStrengthAtTick(quarter * TICKS_PER_QUARTER, triple)),
    ["strong", "weak", "weak", "strong", "weak", "weak", "strong"],
  );
  assert.deepEqual(
    [0, 0.5, 1, 1.5, 2, 2.5, 3].map((quarter) => beatStrengthAtTick(quarter * TICKS_PER_QUARTER, compound)),
    ["strong", "offbeat", "offbeat", "weak", "offbeat", "offbeat", "strong"],
  );
});
