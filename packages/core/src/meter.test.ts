import assert from "node:assert/strict";
import test from "node:test";
import { TICKS_PER_QUARTER } from "./constants.js";
import { beatStrengthAtTick, createLegacyMeterContext } from "./generation/meter.js";

test("legacy meter context preserves the existing two-quarter accent cycle", () => {
  const meterContext = createLegacyMeterContext();

  assert.deepEqual(
    [0, 1, 2, 3, 4, 5, 6].map((quarter) => beatStrengthAtTick(quarter * TICKS_PER_QUARTER, meterContext)),
    ["strong", "weak", "strong", "weak", "strong", "weak", "strong"],
  );
});
