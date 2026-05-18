import { TICKS_PER_QUARTER } from "../constants.js";
import type {
  FugueState,
  HarmonicPlan,
  NoteEvent,
  Phase13EntrySevereIntervalDurationSummary,
  Phase13LocalSentinelSummary,
  Phase13QualityVector,
  Phase13QualityVectorAxis,
  Phase13QualityVectorAxisSummary,
  Phase13QualityVectorGroupingKey,
  Phase13SopranoRepeatedNotePressureSummary,
  Phase13VoicePairUnisonSummary,
  PlannedEntry,
  StyleProfile,
  Voice,
} from "../events.js";
import { positiveModulo } from "./shared.js";

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

const PHASE_13_VOICE_PAIRS: readonly [Voice, Voice][] = [
  ["soprano", "alto"],
  ["soprano", "tenor"],
  ["soprano", "bass"],
  ["alto", "tenor"],
  ["alto", "bass"],
  ["tenor", "bass"],
];

export function analyzePhase13QualityVector(
  notes: readonly NoteEvent[],
  subjectEntries: readonly PlannedEntry[],
  sectionPlans: readonly HarmonicPlan[],
): Phase13QualityVector {
  const voicePairUnisons = summarizeVoicePairUnisons(notes, sectionPlans);
  const sopranoRepeatedNotePressure = summarizeSopranoRepeatedNotePressure(notes);
  const entrySevereIntervals = summarizeEntrySevereIntervalDurations(notes, subjectEntries);
  const localSentinels = summarizeLocalSentinels(
    voicePairUnisons,
    sopranoRepeatedNotePressure,
    entrySevereIntervals,
    sectionPlans,
  );

  return {
    schemaVersion: 1,
    modelVersion: 1,
    axes: summarizeAxes(voicePairUnisons, sopranoRepeatedNotePressure, entrySevereIntervals),
    voicePairUnisons,
    sopranoRepeatedNotePressure,
    entrySevereIntervals,
    localSentinels,
  };
}

function summarizeVoicePairUnisons(
  notes: readonly NoteEvent[],
  sectionPlans: readonly HarmonicPlan[],
): Phase13VoicePairUnisonSummary[] {
  const checkpoints = noteCheckpoints(notes);

  return PHASE_13_VOICE_PAIRS.map(([leftVoice, rightVoice]) => {
    let activeDurationTicks = 0;
    let exactSamePitchDurationTicks = 0;
    let pitchClassUnisonDurationTicks = 0;
    let durationBasedLockstepTicks = 0;
    let currentExactSpanTicks = 0;
    let currentPitchClassSpanTicks = 0;
    let longestExactSamePitchSpanTicks = 0;
    let longestPitchClassUnisonSpanTicks = 0;
    const sectionRoleTicks = new Map<FugueState, number>();
    const styleProfileTicks = new Map<StyleProfile, number>();

    for (let index = 0; index < checkpoints.length - 1; index += 1) {
      const startTick = checkpoints[index]!;
      const endTick = checkpoints[index + 1]!;
      const durationTicks = endTick - startTick;
      if (durationTicks <= 0) {
        continue;
      }

      const left = activeNoteForVoiceAt(notes, leftVoice, startTick);
      const right = activeNoteForVoiceAt(notes, rightVoice, startTick);
      if (left === undefined || right === undefined) {
        currentExactSpanTicks = 0;
        currentPitchClassSpanTicks = 0;
        continue;
      }

      activeDurationTicks += durationTicks;
      const section = sectionPlanAt(sectionPlans, startTick);
      if (section !== undefined) {
        sectionRoleTicks.set(section.state, (sectionRoleTicks.get(section.state) ?? 0) + durationTicks);
        styleProfileTicks.set(section.styleProfile, (styleProfileTicks.get(section.styleProfile) ?? 0) + durationTicks);
      }

      const exactSamePitch = left.pitch === right.pitch;
      const pitchClassUnison = positiveModulo(left.pitch, 12) === positiveModulo(right.pitch, 12);
      const durationLockstep = left.startTick === right.startTick && left.durationTicks === right.durationTicks;

      if (exactSamePitch) {
        exactSamePitchDurationTicks += durationTicks;
        currentExactSpanTicks += durationTicks;
      } else {
        currentExactSpanTicks = 0;
      }
      if (pitchClassUnison) {
        pitchClassUnisonDurationTicks += durationTicks;
        currentPitchClassSpanTicks += durationTicks;
      } else {
        currentPitchClassSpanTicks = 0;
      }
      if (durationLockstep) {
        durationBasedLockstepTicks += durationTicks;
      }
      longestExactSamePitchSpanTicks = Math.max(longestExactSamePitchSpanTicks, currentExactSpanTicks);
      longestPitchClassUnisonSpanTicks = Math.max(longestPitchClassUnisonSpanTicks, currentPitchClassSpanTicks);
    }

    return {
      leftVoice,
      rightVoice,
      activeDurationTicks,
      exactSamePitchDurationTicks,
      pitchClassUnisonDurationTicks,
      durationBasedLockstepTicks,
      longestExactSamePitchSpanTicks,
      longestPitchClassUnisonSpanTicks,
      sectionRole: dominantMapKey(sectionRoleTicks) ?? "mixed",
      styleProfile: dominantMapKey(styleProfileTicks) ?? "mixed",
    };
  });
}

function summarizeSopranoRepeatedNotePressure(notes: readonly NoteEvent[]): Phase13SopranoRepeatedNotePressureSummary {
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

function summarizeEntrySevereIntervalDurations(
  notes: readonly NoteEvent[],
  subjectEntries: readonly PlannedEntry[],
): Phase13EntrySevereIntervalDurationSummary[] {
  return subjectEntries.map((entry) => {
    const checkpoints = entrySupportCheckpoints(notes, entry);
    let severeIntervalDurationTicks = 0;
    let unresolvedDurationTicks = 0;
    let representativeTick = entry.startTick;

    for (let index = 0; index < checkpoints.length - 1; index += 1) {
      const startTick = checkpoints[index]!;
      const endTick = checkpoints[index + 1]!;
      const durationTicks = endTick - startTick;
      if (durationTicks <= 0 || !hasSevereEntryIntervalAt(notes, entry, startTick)) {
        continue;
      }

      severeIntervalDurationTicks += durationTicks;
      representativeTick = startTick;
      const resolutionDeadlineTick = startTick + TICKS_PER_QUARTER;
      const resolvesBeforeDeadline = checkpoints.some(
        (candidateTick) =>
          candidateTick > startTick &&
          candidateTick <= resolutionDeadlineTick &&
          !hasSevereEntryIntervalAt(notes, entry, candidateTick),
      );
      if (!resolvesBeforeDeadline) {
        unresolvedDurationTicks += durationTicks;
      }
    }

    return {
      voice: entry.voice,
      form: entry.form,
      state: entry.state,
      startTick: entry.startTick,
      severeIntervalDurationTicks,
      unresolvedDurationTicks,
      resolutionDeadlineTicks: TICKS_PER_QUARTER,
      representativeTick,
    };
  });
}

function summarizeAxes(
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

function summarizeLocalSentinels(
  voicePairUnisons: readonly Phase13VoicePairUnisonSummary[],
  sopranoRepeatedNotePressure: Phase13SopranoRepeatedNotePressureSummary,
  entrySevereIntervals: readonly Phase13EntrySevereIntervalDurationSummary[],
  sectionPlans: readonly HarmonicPlan[],
): Phase13LocalSentinelSummary[] {
  const sentinels: Phase13LocalSentinelSummary[] = [];

  for (const summary of voicePairUnisons) {
    const voicePair = voicePairKey(summary);
    if (summary.longestExactSamePitchSpanTicks >= TICKS_PER_QUARTER * 2) {
      sentinels.push({
        kind: "long-exact-same-pitch-unison",
        severity: "review-required",
        startTick: 0,
        durationTicks: summary.longestExactSamePitchSpanTicks,
        voicePair,
        sectionRole: summary.sectionRole,
        symptom: "long exact same-pitch unison span by voice pair",
      });
    }
    if (summary.longestPitchClassUnisonSpanTicks >= TICKS_PER_QUARTER * 4) {
      sentinels.push({
        kind: "long-pitch-class-unison",
        severity: "review-required",
        startTick: 0,
        durationTicks: summary.longestPitchClassUnisonSpanTicks,
        voicePair,
        sectionRole: summary.sectionRole,
        symptom: "long pitch-class unison span by voice pair",
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

function entrySupportCheckpoints(notes: readonly NoteEvent[], entry: PlannedEntry): number[] {
  const entryWindowEndTick = entry.startTick + TICKS_PER_QUARTER * 2;
  return [
    ...new Set(
      notes
        .filter((note) => note.startTick < entryWindowEndTick && entry.startTick < note.startTick + note.durationTicks)
        .flatMap((note) => [note.startTick, note.startTick + note.durationTicks]),
    ),
  ]
    .filter((tick) => tick >= entry.startTick && tick < entryWindowEndTick && tick % (TICKS_PER_QUARTER / 2) === 0)
    .sort((left, right) => left - right);
}

function hasSevereEntryIntervalAt(notes: readonly NoteEvent[], entry: PlannedEntry, tick: number): boolean {
  const entryNote = notes.find(
    (note) =>
      note.voice === entry.voice &&
      note.startTick <= tick &&
      tick < note.startTick + note.durationTicks &&
      isEntryRole(note.role),
  );
  if (entryNote === undefined) {
    return false;
  }

  return notes
    .filter(
      (note) =>
        note.voice !== entry.voice &&
        note.startTick <= tick &&
        tick < note.startTick + note.durationTicks &&
        (note.role === "counter-subject" || note.role === "free-counterpoint"),
    )
    .some((supportNote) => {
      const intervalClass = Math.abs(entryNote.pitch - supportNote.pitch) % 12;
      return intervalClass === 1 || intervalClass === 2 || intervalClass === 10 || intervalClass === 11;
    });
}

function activeNoteForVoiceAt(
  notes: readonly NoteEvent[],
  voice: Voice,
  tick: number,
): Pick<NoteEvent, "pitch" | "startTick" | "durationTicks"> | undefined {
  return notes.find(
    (note) => note.voice === voice && note.startTick <= tick && tick < note.startTick + note.durationTicks,
  );
}

function noteCheckpoints(notes: readonly NoteEvent[]): number[] {
  return [...new Set(notes.flatMap((note) => [note.startTick, note.startTick + note.durationTicks]))].sort(
    (left, right) => left - right,
  );
}

function sectionPlanAt(sectionPlans: readonly HarmonicPlan[], tick: number): HarmonicPlan | undefined {
  return sectionPlans.find((plan) => plan.startTick <= tick && tick < plan.startTick + plan.durationTicks);
}

function isEntryRole(role: NoteEvent["role"]): boolean {
  return role === "subject" || role === "answer" || role === "subject-fragment";
}

function voicePairKey(summary: Pick<Phase13VoicePairUnisonSummary, "leftVoice" | "rightVoice">): string {
  return `${summary.leftVoice}-${summary.rightVoice}`;
}

function dominantMapKey<Key>(counts: ReadonlyMap<Key, number>): Key | undefined {
  return [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0];
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
