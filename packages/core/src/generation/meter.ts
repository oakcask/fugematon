import { TICKS_PER_QUARTER } from "../constants.js";
import type { BeatStrength, MeterContext, TimeSignature } from "../events.js";

const LEGACY_DUPLE_BEAT_INTERVAL_TICKS = TICKS_PER_QUARTER * 2;

export function createMeterContext(timeSignature: TimeSignature): MeterContext {
  const beatTicks = TICKS_PER_QUARTER * (4 / timeSignature.denominator);
  const measureTicks = beatTicks * timeSignature.numerator;
  if (timeSignature.numerator === 6 && timeSignature.denominator === 8) {
    return {
      timeSignature,
      measureTicks,
      beatTicks: TICKS_PER_QUARTER + TICKS_PER_QUARTER / 2,
      strongBeatIntervalTicks: measureTicks,
      weakBeatIntervalTicks: TICKS_PER_QUARTER + TICKS_PER_QUARTER / 2,
      compound: true,
    };
  }

  return {
    timeSignature,
    measureTicks,
    beatTicks,
    strongBeatIntervalTicks: timeSignature.numerator === 4 ? LEGACY_DUPLE_BEAT_INTERVAL_TICKS : measureTicks,
    weakBeatIntervalTicks: beatTicks,
    compound: false,
  };
}

export function createLegacyMeterContext(): MeterContext {
  return {
    timeSignature: { numerator: 4, denominator: 4 },
    measureTicks: TICKS_PER_QUARTER * 4,
    beatTicks: TICKS_PER_QUARTER,
    strongBeatIntervalTicks: LEGACY_DUPLE_BEAT_INTERVAL_TICKS,
    weakBeatIntervalTicks: TICKS_PER_QUARTER,
    compound: false,
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

export function measureOffsetTicks(tick: number, meterContext: MeterContext): number {
  return positiveModulo(tick, meterContext.measureTicks);
}

export function isMeasureDownbeat(tick: number, meterContext: MeterContext): boolean {
  return measureOffsetTicks(tick, meterContext) === 0;
}

export function isCompoundMidpoint(tick: number, meterContext: MeterContext): boolean {
  return meterContext.compound && measureOffsetTicks(tick, meterContext) === meterContext.beatTicks;
}

export function alignDurationToMeasures(durationTicks: number, meterContext: MeterContext): number {
  return Math.max(
    meterContext.measureTicks,
    Math.round(durationTicks / meterContext.measureTicks) * meterContext.measureTicks,
  );
}

export function previousMeasureDownbeat(tick: number, meterContext: MeterContext): number {
  return tick - measureOffsetTicks(tick, meterContext);
}

function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}
