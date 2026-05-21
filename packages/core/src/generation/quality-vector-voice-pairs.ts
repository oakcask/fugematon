import type {
  FugueState,
  HarmonicPlan,
  NoteEvent,
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
