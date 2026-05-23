import { TICKS_PER_QUARTER } from "../constants.js";
import type {
  HarmonicPlan,
  MetricalHarmonyIntent,
  NoteRole,
  Phase13TEntrySonoritySummary,
  Phase14DissonanceTriageSummary,
  Phase14DissonanceTriageWindow,
} from "../events.js";
import { phase14SectionStateAt, phase14VoicePairs } from "./phase14-score-window-shared.js";
import { positiveModulo, VOICE_ENTRY_ORDER } from "./shared.js";
import type { ActivePitch } from "./types.js";
import { halfBeatVerticalities } from "./verticality.js";

const PHASE_14_TRIAGE_WINDOW_LIMIT = 48;
const PASSING_NEIGHBOR_OFFBEAT_INTENTS = new Set<MetricalHarmonyIntent>([
  "weak-passing-tone",
  "weak-neighbor-tone",
  "offbeat-motion",
]);
type Phase14SemitoneClashClassification = Extract<
  Phase14DissonanceTriageWindow["classification"],
  "weak-passing-semitone-clash" | "passing-neighbor-offbeat-semitone-clash"
>;

export function analyzePhase14DissonanceTriage(
  notes: Parameters<typeof halfBeatVerticalities>[0],
  sectionPlans: readonly HarmonicPlan[],
  entrySonorities: readonly Phase13TEntrySonoritySummary[],
): Phase14DissonanceTriageSummary {
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
    windows: [...entryWindows, ...semitoneWindows].slice(0, PHASE_14_TRIAGE_WINDOW_LIMIT),
  };
}

function summarizeSemitoneClashWindows(
  notes: Parameters<typeof halfBeatVerticalities>[0],
  sectionPlans: readonly HarmonicPlan[],
): Phase14DissonanceTriageWindow[] {
  return halfBeatVerticalities(notes).flatMap(({ tick, active }) => {
    if (tick % TICKS_PER_QUARTER === 0 || active.size < 2) {
      return [];
    }

    const state = phase14SectionStateAt(tick, sectionPlans);
    const windows: Phase14DissonanceTriageWindow[] = [];
    const activeVoices = VOICE_ENTRY_ORDER.filter((voice) => active.has(voice));
    for (const [leftVoice, rightVoice] of phase14VoicePairs(activeVoices)) {
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
  state: Phase14DissonanceTriageWindow["state"],
  active: ReadonlyMap<Phase14DissonanceTriageWindow["voices"][number], ActivePitch>,
  leftVoice: Phase14DissonanceTriageWindow["voices"][number],
  rightVoice: Phase14DissonanceTriageWindow["voices"][number],
): Phase14DissonanceTriageWindow | undefined {
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
): Phase14SemitoneClashClassification | undefined {
  if (intents.includes("weak-passing-tone")) {
    return "weak-passing-semitone-clash";
  }
  if (intents.some((intent) => PASSING_NEIGHBOR_OFFBEAT_INTENTS.has(intent))) {
    return "passing-neighbor-offbeat-semitone-clash";
  }
  return undefined;
}

function summarizeEntrySonorityWindows(
  entrySonorities: readonly Phase13TEntrySonoritySummary[],
): Phase14DissonanceTriageWindow[] {
  return entrySonorities.flatMap((sonority) => {
    const windows: Phase14DissonanceTriageWindow[] = [];
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
