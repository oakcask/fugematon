import { TICKS_PER_QUARTER } from "../constants.js";
import type {
  HarmonicPlan,
  NoteEvent,
  Phase13EntrySevereIntervalDurationSummary,
  Phase13LocalSentinelSummary,
  Phase13QualityVectorAxis,
  Phase13QualityVectorAxisSummary,
  Phase13QualityVectorGroupingKey,
  Phase13SopranoRepeatedNotePressureSummary,
  Phase13TEntrySonoritySummary,
  Phase13TMetricExplanationSummary,
  Phase13TVoicePairFunctionSummary,
  Phase13UVoicePairSpanSummary,
  Phase13VoicePairUnisonSummary,
} from "../events.js";
import { sectionPlanAt, voicePairKey } from "./quality-vector-shared.js";

const PHASE_13_EXPECTED_MAX: Record<Phase13QualityVectorAxis, number> = {
  exactSamePitchUnisonDuration: 12,
  pitchClassUnisonDuration: 36,
  longestExactSamePitchSpan: 4,
  longestPitchClassUnisonSpan: 8,
  durationBasedLockstep: 36,
  sopranoRepeatedNotePressure: 12,
  entrySevereIntervalDuration: 8,
  unresolvedEntrySevereIntervalDuration: 4,
};

const PHASE_13_AXIS_WEIGHTS: Record<Phase13QualityVectorAxis, number> = {
  exactSamePitchUnisonDuration: 1.2,
  pitchClassUnisonDuration: 1,
  longestExactSamePitchSpan: 1.4,
  longestPitchClassUnisonSpan: 1.2,
  durationBasedLockstep: 0.8,
  sopranoRepeatedNotePressure: 1.3,
  entrySevereIntervalDuration: 1,
  unresolvedEntrySevereIntervalDuration: 1.5,
};

export function summarizeSopranoRepeatedNotePressure(
  notes: readonly NoteEvent[],
): Phase13SopranoRepeatedNotePressureSummary {
  const sopranoNotes = notes.filter((note) => note.voice === "soprano").sort(compareNotes);
  let runCount = 0;
  let highRegisterRunCount = 0;
  let unreleasedRunCount = 0;
  let pressureDurationTicks = 0;
  let longestRunNoteCount = 0;
  let longestRunDurationTicks = 0;

  let runStart = 0;
  for (let index = 1; index <= sopranoNotes.length; index += 1) {
    const previous = sopranoNotes[index - 1];
    const current = sopranoNotes[index];
    if (previous !== undefined && current !== undefined && current.pitch === previous.pitch) {
      continue;
    }

    const run = sopranoNotes.slice(runStart, index);
    if (run.length >= 3) {
      const durationTicks = run.reduce((sum, note) => sum + note.durationTicks, 0);
      const representativePitch = run[0]?.pitch ?? 0;
      const next = sopranoNotes[index];
      const releasedByContour = next !== undefined && Math.abs(next.pitch - representativePitch) >= 2;
      const ornamentLikeRelease = run.some((note) => note.durationTicks <= TICKS_PER_QUARTER / 2);
      const highRegister = representativePitch >= 72;
      const unreleased = highRegister && !releasedByContour && !ornamentLikeRelease;

      runCount += 1;
      highRegisterRunCount += Number(highRegister);
      unreleasedRunCount += Number(unreleased);
      pressureDurationTicks += unreleased ? durationTicks : 0;
      longestRunNoteCount = Math.max(longestRunNoteCount, run.length);
      longestRunDurationTicks = Math.max(longestRunDurationTicks, durationTicks);
    }

    runStart = index;
  }

  return {
    voice: "soprano",
    runCount,
    highRegisterRunCount,
    unreleasedRunCount,
    pressureDurationTicks,
    longestRunNoteCount,
    longestRunDurationTicks,
    register: "high",
  };
}

export function summarizeAxes(
  voicePairUnisons: readonly Phase13VoicePairUnisonSummary[],
  sopranoRepeatedNotePressure: Phase13SopranoRepeatedNotePressureSummary,
  entrySevereIntervals: readonly Phase13EntrySevereIntervalDurationSummary[],
): Phase13QualityVectorAxisSummary[] {
  const mostExactPair = maximumBy(voicePairUnisons, (summary) => summary.exactSamePitchDurationTicks);
  const mostPitchClassPair = maximumBy(voicePairUnisons, (summary) => summary.pitchClassUnisonDurationTicks);
  const longestExactPair = maximumBy(voicePairUnisons, (summary) => summary.longestExactSamePitchSpanTicks);
  const longestPitchClassPair = maximumBy(voicePairUnisons, (summary) => summary.longestPitchClassUnisonSpanTicks);
  const mostLockstepPair = maximumBy(voicePairUnisons, (summary) => summary.durationBasedLockstepTicks);
  const severeDuration = entrySevereIntervals.reduce((sum, entry) => sum + entry.severeIntervalDurationTicks, 0);
  const unresolvedDuration = entrySevereIntervals.reduce((sum, entry) => sum + entry.unresolvedDurationTicks, 0);
  const worstEntry = maximumBy(entrySevereIntervals, (entry) => entry.unresolvedDurationTicks);

  return [
    axisSummary("exactSamePitchUnisonDuration", ticksToQuarters(mostExactPair.exactSamePitchDurationTicks), {
      voicePair: voicePairKey(mostExactPair),
      sectionRole: mostExactPair.sectionRole,
      styleProfile: mostExactPair.styleProfile,
    }),
    axisSummary("pitchClassUnisonDuration", ticksToQuarters(mostPitchClassPair.pitchClassUnisonDurationTicks), {
      voicePair: voicePairKey(mostPitchClassPair),
      sectionRole: mostPitchClassPair.sectionRole,
      styleProfile: mostPitchClassPair.styleProfile,
    }),
    axisSummary("longestExactSamePitchSpan", ticksToQuarters(longestExactPair.longestExactSamePitchSpanTicks), {
      voicePair: voicePairKey(longestExactPair),
      sectionRole: longestExactPair.sectionRole,
      styleProfile: longestExactPair.styleProfile,
    }),
    axisSummary(
      "longestPitchClassUnisonSpan",
      ticksToQuarters(longestPitchClassPair.longestPitchClassUnisonSpanTicks),
      {
        voicePair: voicePairKey(longestPitchClassPair),
        sectionRole: longestPitchClassPair.sectionRole,
        styleProfile: longestPitchClassPair.styleProfile,
      },
    ),
    axisSummary("durationBasedLockstep", ticksToQuarters(mostLockstepPair.durationBasedLockstepTicks), {
      voicePair: voicePairKey(mostLockstepPair),
      sectionRole: mostLockstepPair.sectionRole,
      styleProfile: mostLockstepPair.styleProfile,
    }),
    axisSummary("sopranoRepeatedNotePressure", ticksToQuarters(sopranoRepeatedNotePressure.pressureDurationTicks), {
      sectionRole: "mixed",
      styleProfile: "mixed",
      voice: "soprano",
      register: sopranoRepeatedNotePressure.register,
    }),
    axisSummary("entrySevereIntervalDuration", ticksToQuarters(severeDuration), {
      sectionRole: worstEntry.state,
      styleProfile: "mixed",
      voice: worstEntry.voice,
      entryRole: worstEntry.form,
    }),
    axisSummary("unresolvedEntrySevereIntervalDuration", ticksToQuarters(unresolvedDuration), {
      sectionRole: worstEntry.state,
      styleProfile: "mixed",
      voice: worstEntry.voice,
      entryRole: worstEntry.form,
    }),
  ];
}

export function summarizeLocalSentinels(
  voicePairUnisons: readonly Phase13VoicePairUnisonSummary[],
  voicePairSpans: readonly Phase13UVoicePairSpanSummary[],
  sopranoRepeatedNotePressure: Phase13SopranoRepeatedNotePressureSummary,
  entrySevereIntervals: readonly Phase13EntrySevereIntervalDurationSummary[],
  sectionPlans: readonly HarmonicPlan[],
): Phase13LocalSentinelSummary[] {
  const sentinels: Phase13LocalSentinelSummary[] = [];

  for (const summary of voicePairUnisons) {
    const voicePair = voicePairKey(summary);
    const exactSpan = longestVoicePairSpan(voicePairSpans, voicePair, "exact-collision");
    const pitchClassSpan = longestVoicePairSpan(voicePairSpans, voicePair, "pitch-class-reinforcement");
    if (summary.longestExactSamePitchSpanTicks >= TICKS_PER_QUARTER * 2) {
      sentinels.push({
        kind: "long-exact-same-pitch-unison",
        severity: "review-required",
        startTick: exactSpan?.startTick ?? 0,
        durationTicks: exactSpan?.durationTicks ?? summary.longestExactSamePitchSpanTicks,
        voicePair,
        sectionRole: exactSpan?.sectionRole ?? summary.sectionRole,
        symptom: "long exact same-pitch unison span by voice pair",
        classification: "exact-collision",
      });
    }
    if (summary.longestPitchClassUnisonSpanTicks >= TICKS_PER_QUARTER * 4) {
      sentinels.push({
        kind: "long-pitch-class-unison",
        severity: "review-required",
        startTick: pitchClassSpan?.startTick ?? 0,
        durationTicks: pitchClassSpan?.durationTicks ?? summary.longestPitchClassUnisonSpanTicks,
        voicePair,
        sectionRole: pitchClassSpan?.sectionRole ?? summary.sectionRole,
        symptom: "long pitch-class unison span by voice pair",
        classification: pitchClassSpan?.classification ?? "pitch-class-reinforcement",
      });
    }
  }

  if (sopranoRepeatedNotePressure.pressureDurationTicks >= TICKS_PER_QUARTER * 2) {
    sentinels.push({
      kind: "high-soprano-repeated-note-pressure",
      severity: "review-required",
      startTick: 0,
      durationTicks: sopranoRepeatedNotePressure.pressureDurationTicks,
      voice: "soprano",
      sectionRole: "mixed",
      symptom: "high soprano repeated-note run without contour or ornament-like release",
    });
  }

  for (const entry of entrySevereIntervals) {
    if (entry.unresolvedDurationTicks === 0) {
      continue;
    }
    sentinels.push({
      kind: "unresolved-entry-severe-interval",
      severity: "review-required",
      startTick: entry.representativeTick,
      durationTicks: entry.unresolvedDurationTicks,
      voice: entry.voice,
      sectionRole: sectionPlanAt(sectionPlans, entry.representativeTick)?.state ?? entry.state,
      symptom: "entry-local second or seventh did not resolve within the deadline",
    });
  }

  return sentinels;
}

export function summarizeMetricExplanations(
  voicePairUnisons: readonly Phase13VoicePairUnisonSummary[],
  voicePairFunctions: readonly Phase13TVoicePairFunctionSummary[],
  entrySevereIntervals: readonly Phase13EntrySevereIntervalDurationSummary[],
  entrySonorities: readonly Phase13TEntrySonoritySummary[],
  sectionPlans: readonly HarmonicPlan[],
): Phase13TMetricExplanationSummary[] {
  const mostPitchClassPair = maximumBy(voicePairUnisons, (summary) => summary.pitchClassUnisonDurationTicks);
  const mostLockstepPair = maximumBy(voicePairUnisons, (summary) => summary.durationBasedLockstepTicks);
  const lockstepFunction = voicePairFunctions.find(
    (summary) => voicePairKey(summary) === voicePairKey(mostLockstepPair),
  );
  const worstEntry = maximumBy(entrySevereIntervals, (entry) => entry.unresolvedDurationTicks);
  const worstSonority = entrySonorities.find((entry) => entry.startTick === worstEntry.startTick);

  return [
    {
      axis: "pitchClassUnisonDuration",
      representativeTick: 0,
      sectionRole: mostPitchClassPair.sectionRole,
      voicePair: voicePairKey(mostPitchClassPair),
      symptom: "pitch-class unison is now split between exact collision, color doubling, and reinforcement",
      classification:
        mostPitchClassPair.exactSamePitchDurationTicks > 0 ? "contains exact collisions" : "register-separated color",
      adoptionMeaning: "diagnostic-reclassification",
    },
    {
      axis: "durationBasedLockstep",
      representativeTick: 0,
      sectionRole: mostLockstepPair.sectionRole,
      voicePair: voicePairKey(mostLockstepPair),
      symptom: "duration lockstep is interpreted by entry, cadence, sequence, pedal, or mechanical role",
      classification:
        (lockstepFunction?.mechanicalCouplingTicks ?? 0) > TICKS_PER_QUARTER * 4
          ? "mechanical coupling remains"
          : "mostly functional support",
      adoptionMeaning:
        (lockstepFunction?.mechanicalCouplingTicks ?? 0) > TICKS_PER_QUARTER * 4
          ? "review-required"
          : "diagnostic-reclassification",
    },
    {
      axis: "unresolvedEntrySevereIntervalDuration",
      representativeTick: worstEntry.representativeTick,
      sectionRole: sectionPlanAt(sectionPlans, worstEntry.representativeTick)?.state ?? worstEntry.state,
      voice: worstEntry.voice,
      symptom: "entry severe intervals are classified by local sonority and resolution path",
      classification: worstSonority?.kinds.join("+") ?? "unclassified",
      adoptionMeaning: worstEntry.unresolvedDurationTicks > 0 ? "review-required" : "musical-improvement",
    },
  ];
}

function longestVoicePairSpan(
  voicePairSpans: readonly Phase13UVoicePairSpanSummary[],
  voicePair: string,
  classification: Phase13UVoicePairSpanSummary["classification"],
): Phase13UVoicePairSpanSummary | undefined {
  return voicePairSpans
    .filter((span) => voicePairKey(span) === voicePair && span.classification === classification)
    .sort((left, right) => right.durationTicks - left.durationTicks || left.startTick - right.startTick)[0];
}

function axisSummary(
  axis: Phase13QualityVectorAxis,
  value: number,
  groupingKey: Phase13QualityVectorGroupingKey,
): Phase13QualityVectorAxisSummary {
  const expectedMax = PHASE_13_EXPECTED_MAX[axis];
  const normalizedValue = roundRatio(value / expectedMax);

  return {
    axis,
    value: roundRatio(value),
    normalizedValue,
    expectedMax,
    weight: PHASE_13_AXIS_WEIGHTS[axis],
    status: normalizedValue > 1 ? "review-required" : "within-profile",
    groupingKey,
    topContributors: groupingKey.voicePair === undefined ? [] : [groupingKey.voicePair],
  };
}

function maximumBy<T>(values: readonly T[], score: (value: T) => number): T {
  const [first, ...rest] = values;
  if (first === undefined) {
    throw new Error("expected at least one value");
  }
  return rest.reduce((best, current) => (score(current) > score(best) ? current : best), first);
}

function compareNotes(left: NoteEvent, right: NoteEvent): number {
  return left.startTick - right.startTick || left.durationTicks - right.durationTicks || left.pitch - right.pitch;
}

function ticksToQuarters(ticks: number): number {
  return ticks / TICKS_PER_QUARTER;
}

function roundRatio(value: number): number {
  return Math.round(value * 1000) / 1000;
}
