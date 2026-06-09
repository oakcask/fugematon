import { TICKS_PER_QUARTER } from "../constants.js";
import type {
  DissonanceTriageSummary,
  DissonanceTriageWindow,
  EntrySonoritySummary,
  HarmonicPlan,
  MeterContext,
  MetricalHarmonyIntent,
  NoteEvent,
  NoteRole,
  Voice,
} from "../events.js";
import { createLegacyMeterContext } from "./meter.js";
import { scoreWindowSectionStateAt, scoreWindowVoicePairs } from "./score-window-shared.js";
import { positiveModulo, VOICE_ENTRY_ORDER } from "./shared.js";
import type { ActivePitch } from "./types.js";
import { halfBeatVerticalities } from "./verticality.js";

const DISSONANCE_TRIAGE_WINDOW_LIMIT = 48;
const PASSING_NEIGHBOR_OFFBEAT_INTENTS = new Set<MetricalHarmonyIntent>([
  "weak-passing-tone",
  "weak-neighbor-tone",
  "offbeat-motion",
]);
type SemitoneClashClassification = Extract<
  DissonanceTriageWindow["classification"],
  "weak-passing-semitone-clash" | "passing-neighbor-offbeat-semitone-clash"
>;

export function analyzeDissonanceTriage(
  notes: Parameters<typeof halfBeatVerticalities>[0],
  sectionPlans: readonly HarmonicPlan[],
  entrySonorities: readonly EntrySonoritySummary[],
): DissonanceTriageSummary {
  const semitoneWindows = summarizeSemitoneClashWindows(notes, sectionPlans);
  const entryWindows = summarizeEntrySonorityWindows(entrySonorities);
  const sustainedWindows = summarizeSustainedSevereVerticalDissonanceWindows(notes, sectionPlans);
  const generatorResponseSustainedWindows = sustainedWindows.filter(
    (window) => window.response === "generator-response-required",
  );
  const weakPassingSemitoneWindows = semitoneWindows.filter(
    (window) => window.classification === "weak-passing-semitone-clash",
  );

  return {
    schemaVersion: 2,
    weakPassingSemitoneClashTicks: weakPassingSemitoneWindows.length * (TICKS_PER_QUARTER / 2),
    passingNeighborOffbeatSemitoneClashTicks: semitoneWindows.length * (TICKS_PER_QUARTER / 2),
    entryAdjacentSecondFrictionCount: entrySonorities.reduce(
      (sum, sonority) => sum + sonority.adjacentSecondFrictionCount,
      0,
    ),
    unresolvedAccentedEntryClashCount: entrySonorities.reduce(
      (sum, sonority) => sum + sonority.unresolvedAccentedClashCount,
      0,
    ),
    sustainedSevereVerticalDissonanceCount: generatorResponseSustainedWindows.length,
    sustainedSevereVerticalDissonanceTicks: generatorResponseSustainedWindows.reduce(
      (sum, window) => sum + (window.durationTicks ?? 0),
      0,
    ),
    maxSustainedSevereVerticalDissonanceTicks: Math.max(
      0,
      ...generatorResponseSustainedWindows.map((window) => window.durationTicks ?? 0),
    ),
    windows: [...sustainedWindows, ...entryWindows, ...semitoneWindows].slice(0, DISSONANCE_TRIAGE_WINDOW_LIMIT),
  };
}

function summarizeSemitoneClashWindows(
  notes: Parameters<typeof halfBeatVerticalities>[0],
  sectionPlans: readonly HarmonicPlan[],
): DissonanceTriageWindow[] {
  return halfBeatVerticalities(notes).flatMap(({ tick, active }) => {
    if (tick % TICKS_PER_QUARTER === 0 || active.size < 2) {
      return [];
    }

    const state = scoreWindowSectionStateAt(tick, sectionPlans);
    const windows: DissonanceTriageWindow[] = [];
    const activeVoices = VOICE_ENTRY_ORDER.filter((voice) => active.has(voice));
    for (const [leftVoice, rightVoice] of scoreWindowVoicePairs(activeVoices)) {
      const window = semitoneClashWindowAt(tick, state, active, leftVoice, rightVoice);
      if (window !== undefined) {
        windows.push(window);
      }
    }
    return windows;
  });
}

function semitoneClashWindowAt(
  tick: number,
  state: DissonanceTriageWindow["state"],
  active: ReadonlyMap<DissonanceTriageWindow["voices"][number], ActivePitch>,
  leftVoice: DissonanceTriageWindow["voices"][number],
  rightVoice: DissonanceTriageWindow["voices"][number],
): DissonanceTriageWindow | undefined {
  const left = active.get(leftVoice);
  const right = active.get(rightVoice);
  if (left === undefined || right === undefined || !isSemitoneClash(left, right)) {
    return undefined;
  }

  const intents = activePitchIntents(left, right);
  const classification = classifySemitoneClashIntents(intents);
  if (classification === undefined) {
    return undefined;
  }

  return {
    startTick: tick,
    state,
    voices: [leftVoice, rightVoice],
    roles: activePitchRoles(left, right),
    metricalHarmonyIntents: intents,
    classification,
    response: "review-required",
  };
}

function activePitchIntents(left: ActivePitch, right: ActivePitch): MetricalHarmonyIntent[] {
  return [left.metricalHarmonyIntent, right.metricalHarmonyIntent].filter(
    (intent): intent is MetricalHarmonyIntent => intent !== undefined,
  );
}

function activePitchRoles(left: ActivePitch, right: ActivePitch): NoteRole[] {
  return [left.role, right.role].filter((role): role is NoteRole => role !== undefined);
}

function classifySemitoneClashIntents(
  intents: readonly MetricalHarmonyIntent[],
): SemitoneClashClassification | undefined {
  if (intents.includes("weak-passing-tone")) {
    return "weak-passing-semitone-clash";
  }
  if (intents.some((intent) => PASSING_NEIGHBOR_OFFBEAT_INTENTS.has(intent))) {
    return "passing-neighbor-offbeat-semitone-clash";
  }
  return undefined;
}

function summarizeEntrySonorityWindows(entrySonorities: readonly EntrySonoritySummary[]): DissonanceTriageWindow[] {
  return entrySonorities.flatMap((sonority) => {
    const windows: DissonanceTriageWindow[] = [];
    const voices = [sonority.voice, ...sonority.supportVoices];
    if (sonority.adjacentSecondFrictionCount > 0) {
      windows.push({
        startTick: sonority.representativeTick,
        state: sonority.state,
        voices,
        roles: [],
        metricalHarmonyIntents: [],
        classification: "entry-adjacent-second-friction",
        response: "review-required",
      });
    }
    if (sonority.unresolvedAccentedClashCount > 0) {
      windows.push({
        startTick: sonority.representativeTick,
        state: sonority.state,
        voices,
        roles: [],
        metricalHarmonyIntents: [],
        classification: "unresolved-accented-entry-clash",
        response: "review-required",
      });
    }
    return windows;
  });
}

function isSemitoneClash(left: ActivePitch, right: ActivePitch): boolean {
  const interval = positiveModulo(left.pitch - right.pitch, 12);
  return interval === 1 || interval === 11;
}

function summarizeSustainedSevereVerticalDissonanceWindows(
  notes: readonly NoteEvent[],
  sectionPlans: readonly HarmonicPlan[],
): DissonanceTriageWindow[] {
  const segments = sustainedVerticalitySegments(notes, sectionPlans);
  const windows: DissonanceTriageWindow[] = [];

  for (const segment of segments) {
    const meterContext = meterContextAtTick(segment.startTick, sectionPlans);
    if (segment.durationTicks < meterContext.weakBeatIntervalTicks || segment.active.size < 2) {
      continue;
    }

    const severe = classifySevereVerticality(segment.active);
    if (severe === undefined) {
      continue;
    }

    const suspension = isPreparedSuspensionWindow({
      notes,
      sectionPlans,
      startTick: segment.startTick,
      endTick: segment.endTick,
      active: segment.active,
      severe,
      meterContext,
    });
    const activeVoices = VOICE_ENTRY_ORDER.filter((voice) => segment.active.has(voice));
    const activePitches = activeVoices
      .map((voice) => segment.active.get(voice)?.pitch)
      .filter((pitch): pitch is number => pitch !== undefined);

    windows.push({
      startTick: segment.startTick,
      durationTicks: segment.durationTicks,
      state: scoreWindowSectionStateAt(segment.startTick, sectionPlans),
      voices: activeVoices,
      roles: activeVoices
        .map((voice) => segment.active.get(voice)?.role)
        .filter((role): role is NoteRole => role !== undefined),
      metricalHarmonyIntents: activeVoices
        .map((voice) => segment.active.get(voice)?.metricalHarmonyIntent)
        .filter((intent): intent is MetricalHarmonyIntent => intent !== undefined),
      pitches: activePitches,
      pitchClasses: activePitches.map((pitch) => positiveModulo(pitch, 12)),
      classification: suspension ? "prepared-suspension" : severe.classification,
      response: suspension ? "accepted-context" : "generator-response-required",
    });
  }

  return windows;
}

type SustainedVerticalitySegment = {
  startTick: number;
  endTick: number;
  durationTicks: number;
  active: ReadonlyMap<Voice, ActivePitch>;
};

function sustainedVerticalitySegments(
  notes: readonly NoteEvent[],
  sectionPlans: readonly HarmonicPlan[],
): SustainedVerticalitySegment[] {
  const endTick = Math.max(
    0,
    ...notes.map((note) => note.startTick + note.durationTicks),
    ...sectionPlans.map((plan) => plan.startTick + plan.durationTicks),
  );
  const boundaries = [
    ...new Set([
      0,
      endTick,
      ...notes.flatMap((note) => [note.startTick, note.startTick + note.durationTicks]),
      ...sectionPlans.flatMap((plan) => [plan.startTick, plan.startTick + plan.durationTicks]),
    ]),
  ]
    .filter((tick) => tick >= 0 && tick <= endTick)
    .sort((left, right) => left - right);
  const segments: SustainedVerticalitySegment[] = [];
  const notesByVoice = Object.fromEntries(
    VOICE_ENTRY_ORDER.map((voice) => [
      voice,
      notes.filter((note) => note.voice === voice).sort((left, right) => left.startTick - right.startTick),
    ]),
  ) as Record<Voice, NoteEvent[]>;
  const indexes = Object.fromEntries(VOICE_ENTRY_ORDER.map((voice) => [voice, 0])) as Record<Voice, number>;

  for (let index = 0; index < boundaries.length - 1; index += 1) {
    const startTick = boundaries[index]!;
    const endTick = boundaries[index + 1]!;
    if (endTick <= startTick) {
      continue;
    }
    const active = new Map<Voice, ActivePitch>();
    for (const voice of VOICE_ENTRY_ORDER) {
      const voiceNotes = notesByVoice[voice];
      while (
        indexes[voice] < voiceNotes.length &&
        voiceNotes[indexes[voice]]!.startTick + voiceNotes[indexes[voice]]!.durationTicks <= startTick
      ) {
        indexes[voice] += 1;
      }
      const note = voiceNotes[indexes[voice]];
      if (note !== undefined && note.startTick <= startTick && startTick < note.startTick + note.durationTicks) {
        active.set(voice, {
          pitch: note.pitch,
          role: note.role,
          metricalHarmonyIntent: note.metricalHarmonyIntent,
          startTick: note.startTick,
          durationTicks: note.durationTicks,
        });
      }
    }
    segments.push({
      startTick,
      endTick,
      durationTicks: endTick - startTick,
      active,
    });
  }

  return segments;
}

type SevereVerticalityClassification = {
  classification: Extract<
    DissonanceTriageWindow["classification"],
    | "sustained-semitone-stack"
    | "sustained-tritone"
    | "sustained-fourth-above-bass"
    | "sustained-severe-vertical-dissonance"
  >;
  severePairs: Array<[Voice, Voice]>;
  semitonePairCount: number;
  tritonePairCount: number;
  fourthAboveBassCount: number;
};

function classifySevereVerticality(
  active: ReadonlyMap<Voice, ActivePitch>,
): SevereVerticalityClassification | undefined {
  const voices = VOICE_ENTRY_ORDER.filter((voice) => active.has(voice));
  const severePairs: Array<[Voice, Voice]> = [];
  let semitonePairCount = 0;
  let tritonePairCount = 0;
  let fourthAboveBassCount = 0;
  const lowestVoice = [...active.entries()].sort((left, right) => left[1].pitch - right[1].pitch)[0]?.[0];

  for (const [leftVoice, rightVoice] of scoreWindowVoicePairs(voices)) {
    const left = active.get(leftVoice);
    const right = active.get(rightVoice);
    if (left === undefined || right === undefined) {
      continue;
    }
    const intervalClass = positiveModulo(left.pitch - right.pitch, 12);
    const absIntervalClass = Math.min(intervalClass, positiveModulo(right.pitch - left.pitch, 12));
    const semitone = absIntervalClass === 1;
    const tritone = absIntervalClass === 6;
    const fourthAboveBass =
      lowestVoice !== undefined &&
      ((leftVoice === lowestVoice && positiveModulo(right.pitch - left.pitch, 12) === 5) ||
        (rightVoice === lowestVoice && positiveModulo(left.pitch - right.pitch, 12) === 5));

    if (!semitone && !tritone && !fourthAboveBass) {
      continue;
    }
    severePairs.push([leftVoice, rightVoice]);
    semitonePairCount += Number(semitone);
    tritonePairCount += Number(tritone);
    fourthAboveBassCount += Number(fourthAboveBass);
  }

  if (severePairs.length === 0) {
    return undefined;
  }
  const classification =
    semitonePairCount >= 2
      ? "sustained-semitone-stack"
      : tritonePairCount > 0
        ? "sustained-tritone"
        : fourthAboveBassCount > 0
          ? "sustained-fourth-above-bass"
          : "sustained-severe-vertical-dissonance";

  return {
    classification,
    severePairs,
    semitonePairCount,
    tritonePairCount,
    fourthAboveBassCount,
  };
}

function isPreparedSuspensionWindow(input: {
  notes: readonly NoteEvent[];
  sectionPlans: readonly HarmonicPlan[];
  startTick: number;
  endTick: number;
  active: ReadonlyMap<Voice, ActivePitch>;
  severe: SevereVerticalityClassification;
  meterContext: MeterContext;
}): boolean {
  if (input.severe.severePairs.length !== 1 || input.severe.semitonePairCount >= 2) {
    return false;
  }
  const [leftVoice, rightVoice] = input.severe.severePairs[0]!;
  const heldVoices = [leftVoice, rightVoice].filter((voice) => {
    const active = input.active.get(voice);
    return active !== undefined && active.startTick < input.startTick;
  });
  if (heldVoices.length !== 1) {
    return false;
  }

  const heldVoice = heldVoices[0]!;
  const heldPitch = input.active.get(heldVoice)?.pitch;
  if (heldPitch === undefined) {
    return false;
  }
  const preparedActive =
    input.startTick > 0
      ? activePitchesAt(input.notes, Math.max(0, input.startTick - 1))
      : new Map<Voice, ActivePitch>();
  if (!preparedActive.has(heldVoice) || classifySevereVerticality(preparedActive) !== undefined) {
    return false;
  }

  const next = input.notes
    .filter(
      (note) =>
        note.voice === heldVoice &&
        note.startTick >= input.endTick &&
        note.startTick <= input.startTick + input.meterContext.weakBeatIntervalTicks,
    )
    .sort((left, right) => left.startTick - right.startTick)[0];

  return next !== undefined && Math.abs(next.pitch - heldPitch) <= 2;
}

function activePitchesAt(notes: readonly NoteEvent[], tick: number): ReadonlyMap<Voice, ActivePitch> {
  const active = new Map<Voice, ActivePitch>();
  for (const voice of VOICE_ENTRY_ORDER) {
    const note = notes.find(
      (candidate) =>
        candidate.voice === voice &&
        candidate.startTick <= tick &&
        tick < candidate.startTick + candidate.durationTicks,
    );
    if (note === undefined) {
      continue;
    }
    active.set(voice, {
      pitch: note.pitch,
      role: note.role,
      metricalHarmonyIntent: note.metricalHarmonyIntent,
      startTick: note.startTick,
      durationTicks: note.durationTicks,
    });
  }
  return active;
}

function meterContextAtTick(tick: number, sectionPlans: readonly HarmonicPlan[]): MeterContext {
  return (
    sectionPlans.find((plan) => plan.startTick <= tick && tick < plan.startTick + plan.durationTicks)?.meterContext ??
    createLegacyMeterContext()
  );
}
