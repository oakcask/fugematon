import { TICKS_PER_QUARTER } from "../constants.js";
import type { BeatStrength, TimeSignature } from "../events.js";

export type MeterContext = {
  timeSignature: TimeSignature;
  measureTicks: number;
  beatTicks: number;
  strongBeatIntervalTicks: number;
  weakBeatIntervalTicks: number;
};

const LEGACY_DUPLE_BEAT_INTERVAL_TICKS = TICKS_PER_QUARTER * 2;

export function createLegacyMeterContext(): MeterContext {
  return {
    timeSignature: { numerator: 4, denominator: 4 },
    measureTicks: TICKS_PER_QUARTER * 4,
    beatTicks: TICKS_PER_QUARTER,
    strongBeatIntervalTicks: LEGACY_DUPLE_BEAT_INTERVAL_TICKS,
    weakBeatIntervalTicks: TICKS_PER_QUARTER,
  };
}

export function beatStrengthAtTick(
  tick: number,
  meterContext: MeterContext = createLegacyMeterContext(),
): BeatStrength {
  if (tick % meterContext.strongBeatIntervalTicks === 0) {
    return "strong";
  }
  if (tick % meterContext.weakBeatIntervalTicks === 0) {
    return "weak";
  }
  return "offbeat";
}
