import { TICKS_PER_QUARTER } from "../constants.js";
import type {
  DissonanceTriageSummary,
  DissonanceTriageWindow,
  EntrySonoritySummary,
  HarmonicPlan,
  MetricalHarmonyIntent,
  NoteRole,
} from "../events.js";
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
  const weakPassingSemitoneWindows = semitoneWindows.filter(
    (window) => window.classification === "weak-passing-semitone-clash",
  );

  return {
    schemaVersion: 1,
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
    windows: [...entryWindows, ...semitoneWindows].slice(0, DISSONANCE_TRIAGE_WINDOW_LIMIT),
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
