import { TICKS_PER_QUARTER } from "../constants.js";
import type {
  FugueState,
  HarmonicPlan,
  NoteEvent,
  Phase13TVoicePairFunctionSummary,
  Phase13VoicePairUnisonSummary,
  StyleProfile,
  Voice,
} from "../events.js";
import { activeNoteForVoiceAt, dominantMapKey, noteCheckpoints, sectionPlanAt } from "./quality-vector-shared.js";
import { positiveModulo } from "./shared.js";

const PHASE_13_VOICE_PAIRS: readonly [Voice, Voice][] = [
  ["soprano", "alto"],
  ["soprano", "tenor"],
  ["soprano", "bass"],
  ["alto", "tenor"],
  ["alto", "bass"],
  ["tenor", "bass"],
];

export function summarizeVoicePairUnisons(
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

export function summarizeVoicePairFunctions(
  notes: readonly NoteEvent[],
  sectionPlans: readonly HarmonicPlan[],
): Phase13TVoicePairFunctionSummary[] {
  const checkpoints = noteCheckpoints(notes);

  return PHASE_13_VOICE_PAIRS.map(([leftVoice, rightVoice]) => {
    const summary: Phase13TVoicePairFunctionSummary = {
      leftVoice,
      rightVoice,
      subjectSupportLockstepTicks: 0,
      cadenceSupportLockstepTicks: 0,
      sequencePatternLockstepTicks: 0,
      pedalLikeSupportLockstepTicks: 0,
      mechanicalCouplingTicks: 0,
      exactCollisionTicks: 0,
      pitchClassColorDoublingTicks: 0,
      functionalReinforcementTicks: 0,
    };

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
        continue;
      }

      const section = sectionPlanAt(sectionPlans, startTick);
      const pitchClassUnison = positiveModulo(left.pitch, 12) === positiveModulo(right.pitch, 12);
      const durationLockstep = left.startTick === right.startTick && left.durationTicks === right.durationTicks;

      if (left.pitch === right.pitch) {
        summary.exactCollisionTicks += durationTicks;
      }
      if (pitchClassUnison && left.pitch !== right.pitch) {
        if (isFunctionalReinforcement(left.role, right.role, section)) {
          summary.functionalReinforcementTicks += durationTicks;
        } else {
          summary.pitchClassColorDoublingTicks += durationTicks;
        }
      }
      if (!durationLockstep) {
        continue;
      }

      if (isEntryRole(left.role) || isEntryRole(right.role)) {
        summary.subjectSupportLockstepTicks += durationTicks;
      } else if (isCadenceSupport(section, startTick)) {
        summary.cadenceSupportLockstepTicks += durationTicks;
      } else if (isSequenceSupport(section)) {
        summary.sequencePatternLockstepTicks += durationTicks;
      } else if (isPedalLikeSupport(left, right)) {
        summary.pedalLikeSupportLockstepTicks += durationTicks;
      } else {
        summary.mechanicalCouplingTicks += durationTicks;
      }
    }

    return summary;
  });
}

function isEntryRole(role: NoteEvent["role"]): boolean {
  return role === "subject" || role === "answer" || role === "subject-fragment";
}

function isFunctionalReinforcement(
  leftRole: NoteEvent["role"],
  rightRole: NoteEvent["role"],
  section: HarmonicPlan | undefined,
): boolean {
  return (
    section !== undefined &&
    (isEntryRole(leftRole) ||
      isEntryRole(rightRole) ||
      leftRole === "counter-subject" ||
      rightRole === "counter-subject" ||
      section.state === "subject-return")
  );
}

function isCadenceSupport(section: HarmonicPlan | undefined, tick: number): boolean {
  return (
    section?.anchors.some((anchor) => anchor.cadenceTarget && Math.abs(anchor.tick - tick) <= TICKS_PER_QUARTER * 2) ??
    false
  );
}

function isSequenceSupport(section: HarmonicPlan | undefined): boolean {
  return section?.sequencePattern !== undefined || section?.fragmentTransform !== undefined;
}

function isPedalLikeSupport(
  left: Pick<NoteEvent, "pitch" | "role" | "durationTicks">,
  right: Pick<NoteEvent, "pitch" | "role" | "durationTicks">,
): boolean {
  return (
    (left.role === "free-counterpoint" || right.role === "free-counterpoint") &&
    (left.durationTicks >= TICKS_PER_QUARTER * 2 || right.durationTicks >= TICKS_PER_QUARTER * 2) &&
    Math.abs(left.pitch - right.pitch) % 12 === 0
  );
}
