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
      const left = active.get(leftVoice);
      const right = active.get(rightVoice);
      if (left === undefined || right === undefined || !isSemitoneClash(left, right)) {
        continue;
      }
      const intents = [left.metricalHarmonyIntent, right.metricalHarmonyIntent].filter(
        (intent): intent is MetricalHarmonyIntent => intent !== undefined,
      );
      const classification = intents.includes("weak-passing-tone")
        ? "weak-passing-semitone-clash"
        : intents.some((intent) => PASSING_NEIGHBOR_OFFBEAT_INTENTS.has(intent))
          ? "passing-neighbor-offbeat-semitone-clash"
          : undefined;
      if (classification === undefined) {
        continue;
      }
      windows.push({
        startTick: tick,
        state,
        voices: [leftVoice, rightVoice],
        roles: [left.role, right.role].filter((role): role is NoteRole => role !== undefined),
        metricalHarmonyIntents: intents,
        classification,
        response: "review-required",
      });
    }
    return windows;
  });
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
