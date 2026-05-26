import { TICKS_PER_QUARTER } from "../constants.js";
import type { HarmonicPlan, MeterConsistencyReviewSummary, PlannedEntry } from "../events.js";
import { beatStrengthAtTick, isCompoundMidpoint, isMeasureDownbeat, measureOffsetTicks } from "./meter.js";

export function analyzeMeterConsistency(
  subjectEntries: readonly PlannedEntry[],
  sectionPlans: readonly HarmonicPlan[],
): MeterConsistencyReviewSummary {
  const meterContext = sectionPlans[0]?.meterContext ?? {
    timeSignature: { numerator: 4, denominator: 4 } as const,
    measureTicks: TICKS_PER_QUARTER * 4,
    beatTicks: TICKS_PER_QUARTER,
    strongBeatIntervalTicks: TICKS_PER_QUARTER * 2,
    weakBeatIntervalTicks: TICKS_PER_QUARTER,
    compound: false,
  };
  const windows: MeterConsistencyReviewSummary["windows"] = [];

  for (const entry of subjectEntries.slice(0, 16)) {
    const entryWindow = meterWindow("entry-start", entry.startTick, meterContext, {
      voice: entry.voice,
      state: entry.state,
      form: entry.form,
    });
    windows.push(entryWindow);

    const reviewedAccents = entry.metricalIntentPattern.filter(
      (candidate) =>
        candidate.beatStrength === "strong" || (meterContext.compound && candidate.beatStrength === "weak"),
    );
    for (const intent of reviewedAccents) {
      windows.push(
        meterWindow("subject-accent", entry.startTick + intent.offsetTick, meterContext, {
          voice: entry.voice,
          state: entry.state,
          form: entry.form,
        }),
      );
    }
  }

  for (const plan of sectionPlans.slice(0, 16)) {
    windows.push(meterWindow("phrase-boundary", plan.startTick, meterContext, { state: plan.state }));
    for (const anchor of plan.anchors) {
      windows.push(
        meterWindow(anchor.cadenceTarget ? "cadence-target" : "harmonic-anchor", anchor.tick, meterContext, {
          state: plan.state,
        }),
      );
    }
  }

  return summarizeMeterConsistency(meterContext, windows);
}

function summarizeMeterConsistency(
  meterContext: HarmonicPlan["meterContext"],
  windows: MeterConsistencyReviewSummary["windows"],
): MeterConsistencyReviewSummary {
  const downbeatEntryCount = windows.filter(
    (window) => window.kind === "entry-start" && window.classification === "meter-confirming",
  ).length;
  const offMeasureEntryCount = windows.filter(
    (window) => window.kind === "entry-start" && window.classification === "review-required",
  ).length;
  const compoundMidpointCount = windows.filter((window) => window.classification === "compound-midpoint").length;
  const strongIntentOnNonDownbeatCount = windows.filter(
    (window) => window.kind === "subject-accent" && window.classification === "review-required",
  ).length;
  const cadenceTargetOffDownbeatCount = windows.filter(
    (window) => window.kind === "cadence-target" && window.classification === "review-required",
  ).length;
  const phraseBoundaryOffDownbeatCount = windows.filter(
    (window) => window.kind === "phrase-boundary" && window.classification === "review-required",
  ).length;

  return {
    schemaVersion: 1,
    status: "review-required",
    timeSignature: meterContext.timeSignature,
    measureTicks: meterContext.measureTicks,
    beatTicks: meterContext.beatTicks,
    compound: meterContext.compound,
    focusedWindowCount: windows.length,
    downbeatEntryCount,
    offMeasureEntryCount,
    compoundMidpointCount,
    strongIntentOnNonDownbeatCount,
    cadenceTargetOffDownbeatCount,
    phraseBoundaryOffDownbeatCount,
    windows: windows.slice(0, 64),
  };
}

function meterWindow(
  kind: MeterConsistencyReviewSummary["windows"][number]["kind"],
  tick: number,
  meterContext: HarmonicPlan["meterContext"],
  details: Pick<MeterConsistencyReviewSummary["windows"][number], "voice" | "state" | "form">,
): MeterConsistencyReviewSummary["windows"][number] {
  const offsetTicks = measureOffsetTicks(tick, meterContext);
  const classification = isMeasureDownbeat(tick, meterContext)
    ? "meter-confirming"
    : isCompoundMidpoint(tick, meterContext)
      ? "compound-midpoint"
      : kind === "entry-start" && beatStrengthAtTick(tick, meterContext) !== "offbeat"
        ? "pickup-or-cross-metric"
        : "review-required";

  return {
    kind,
    tick,
    measureOffsetTicks: offsetTicks,
    beatStrength: beatStrengthAtTick(tick, meterContext),
    classification,
    ...details,
  };
}
