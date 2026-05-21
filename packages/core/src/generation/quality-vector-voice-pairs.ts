import { TICKS_PER_QUARTER } from "../constants.js";
import type {
  FugueState,
  HarmonicPlan,
  NoteEvent,
  Phase13TVoicePairFunctionSummary,
  Phase13UVoicePairSpanClassification,
  Phase13UVoicePairSpanSummary,
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

export function summarizeVoicePairSpans(
  notes: readonly NoteEvent[],
  sectionPlans: readonly HarmonicPlan[],
): Phase13UVoicePairSpanSummary[] {
  const checkpoints = noteCheckpoints(notes);
  const spans: Phase13UVoicePairSpanSummary[] = [];

  for (const [leftVoice, rightVoice] of PHASE_13_VOICE_PAIRS) {
    let currentSpan: Phase13UVoicePairSpanSummary | undefined;

    for (let index = 0; index < checkpoints.length - 1; index += 1) {
      const startTick = checkpoints[index]!;
      const endTick = checkpoints[index + 1]!;
      const durationTicks = endTick - startTick;
      const left = activeNoteForVoiceAt(notes, leftVoice, startTick);
      const right = activeNoteForVoiceAt(notes, rightVoice, startTick);
      const classification =
        left === undefined || right === undefined
          ? undefined
          : classifyVoicePairSpan(left, right, sectionPlanAt(sectionPlans, startTick), startTick);

      if (durationTicks <= 0 || classification === undefined) {
        if (currentSpan !== undefined) {
          spans.push(currentSpan);
          currentSpan = undefined;
        }
        continue;
      }

      const sectionRole = sectionPlanAt(sectionPlans, startTick)?.state ?? "mixed";
      if (
        currentSpan !== undefined &&
        currentSpan.startTick + currentSpan.durationTicks === startTick &&
        currentSpan.classification === classification &&
        currentSpan.sectionRole === sectionRole
      ) {
        currentSpan.durationTicks += durationTicks;
      } else {
        if (currentSpan !== undefined) {
          spans.push(currentSpan);
        }
        currentSpan = {
          leftVoice,
          rightVoice,
          startTick,
          durationTicks,
          sectionRole,
          classification,
          symptom: voicePairSpanSymptom(classification),
        };
      }
    }

    if (currentSpan !== undefined) {
      spans.push(currentSpan);
    }
  }

  return spans
    .filter((span) => span.durationTicks >= TICKS_PER_QUARTER)
    .sort(
      (left, right) =>
        right.durationTicks - left.durationTicks ||
        left.startTick - right.startTick ||
        voicePairLabel(left).localeCompare(voicePairLabel(right)),
    )
    .slice(0, 18);
}

function isEntryRole(role: NoteEvent["role"]): boolean {
  return role === "subject" || role === "answer" || role === "subject-fragment";
}

function classifyVoicePairSpan(
  left: Pick<NoteEvent, "pitch" | "role" | "startTick" | "durationTicks">,
  right: Pick<NoteEvent, "pitch" | "role" | "startTick" | "durationTicks">,
  section: HarmonicPlan | undefined,
  tick: number,
): Phase13UVoicePairSpanClassification | undefined {
  const pitchClassUnison = positiveModulo(left.pitch, 12) === positiveModulo(right.pitch, 12);
  const durationLockstep = left.startTick === right.startTick && left.durationTicks === right.durationTicks;
  if (left.pitch === right.pitch) {
    return "exact-collision";
  }
  if (pitchClassUnison && isFunctionalReinforcement(left.role, right.role, section)) {
    return "pitch-class-reinforcement";
  }
  if (pitchClassUnison) {
    return "color-doubling";
  }
  if (!durationLockstep) {
    return undefined;
  }
  if (isEntryRole(left.role) || isEntryRole(right.role)) {
    return "subject-support";
  }
  if (isCadenceSupport(section, tick)) {
    return "cadence-support";
  }
  if (isSequenceSupport(section)) {
    return "sequence-support";
  }
  return "mechanical-coupling";
}

function voicePairSpanSymptom(classification: Phase13UVoicePairSpanClassification): string {
  if (classification === "mechanical-coupling") {
    return "voices share duration grids without a local contrapuntal role";
  }
  if (classification === "pitch-class-reinforcement") {
    return "same-timbre voices reinforce the same pitch class around active material";
  }
  if (classification === "exact-collision") {
    return "voices collide on the exact same pitch";
  }
  if (classification === "color-doubling") {
    return "voices double the same pitch class as color rather than independent counterpoint";
  }
  return "voice-pair support has an identifiable local function";
}

function voicePairLabel(span: Pick<Phase13UVoicePairSpanSummary, "leftVoice" | "rightVoice">): string {
  return `${span.leftVoice}-${span.rightVoice}`;
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
