import { VOICES } from "../constants.js";
import type { DissonanceTriageWindow, HarmonicPlan, NoteEvent, NoteRole } from "../events.js";
import {
  isPitchAllowedByWritingProfile,
  nearestWritingProfilePitchForPitchClass,
  type WritingProfile,
} from "../writing-profile.js";
import { analyzeDissonanceTriage } from "./dissonance-triage.js";
import { chordTonePitchClasses, nearestHarmonicAnchor } from "./harmony.js";
import { positiveModulo } from "./shared.js";

const REPAIR_ROLE_PRIORITY: readonly NoteRole[] = [
  "free-counterpoint",
  "fallback",
  "subject-fragment",
  "counter-subject",
];
const MULTI_NOTE_REPAIR_CANDIDATE_LIMIT = 6;

type RepairTarget = {
  note: NoteEvent;
  rolePriority: number;
  pitches: readonly number[];
};

type RepairMutation = {
  note: NoteEvent;
  pitch: number;
};

type SustainedDissonanceRepairOptions = {
  canAcceptMutation?: (notes: readonly NoteEvent[]) => boolean;
};

export function repairSustainedSevereVerticalDissonance(
  notes: NoteEvent[],
  sectionPlans: readonly HarmonicPlan[],
  writingProfile: WritingProfile,
  options: SustainedDissonanceRepairOptions = {},
): void {
  let summary = analyzeDissonanceTriage(notes, sectionPlans, []);
  if (summary.sustainedSevereVerticalDissonanceCount === 0) {
    return;
  }

  for (const window of sustainedGeneratorResponseWindows(summary.windows)) {
    const beforeCount = summary.sustainedSevereVerticalDissonanceCount;
    const repaired = repairSustainedWindow(notes, sectionPlans, writingProfile, window, beforeCount, options);
    if (!repaired) {
      continue;
    }
    summary = analyzeDissonanceTriage(notes, sectionPlans, []);
  }
}

function repairSustainedWindow(
  notes: NoteEvent[],
  sectionPlans: readonly HarmonicPlan[],
  writingProfile: WritingProfile,
  window: DissonanceTriageWindow,
  beforeCount: number,
  options: SustainedDissonanceRepairOptions,
): boolean {
  const active = activeNotesAt(notes, window.startTick);
  const repairTargets = REPAIR_ROLE_PRIORITY.flatMap((role, rolePriority) =>
    active
      .filter((note) => note.role === role)
      .map((note) => ({
        note,
        rolePriority,
        pitches: repairPitchCandidates(note, window.startTick, sectionPlans, writingProfile),
      })),
  );

  for (const role of REPAIR_ROLE_PRIORITY) {
    const activeRoleNotes = active.filter((note) => note.role === role);
    for (const note of activeRoleNotes) {
      for (const pitch of repairPitchCandidates(note, window.startTick, sectionPlans, writingProfile)) {
        if (pitch === note.pitch || !preservesVoiceOrderAt(notes, note, pitch, window.startTick)) {
          continue;
        }
        if (tryRepairMutations(notes, sectionPlans, window.startTick, beforeCount, [{ note, pitch }], options)) {
          return true;
        }
      }
    }
  }

  for (let leftIndex = 0; leftIndex < repairTargets.length; leftIndex += 1) {
    const left = repairTargets[leftIndex]!;
    const leftPitches = left.pitches.slice(0, MULTI_NOTE_REPAIR_CANDIDATE_LIMIT);
    for (let rightIndex = leftIndex + 1; rightIndex < repairTargets.length; rightIndex += 1) {
      const right = repairTargets[rightIndex]!;
      const rightPitches = right.pitches.slice(0, MULTI_NOTE_REPAIR_CANDIDATE_LIMIT);
      for (const leftPitch of leftPitches) {
        if (leftPitch === left.note.pitch) {
          continue;
        }
        for (const rightPitch of rightPitches) {
          if (rightPitch === right.note.pitch) {
            continue;
          }
          const mutations = prioritizedMutationOrder(left, right, leftPitch, rightPitch);
          if (tryRepairMutations(notes, sectionPlans, window.startTick, beforeCount, mutations, options)) {
            return true;
          }
        }
      }
    }
  }

  return false;
}

function prioritizedMutationOrder(
  left: RepairTarget,
  right: RepairTarget,
  leftPitch: number,
  rightPitch: number,
): RepairMutation[] {
  const mutations = [
    { target: left, mutation: { note: left.note, pitch: leftPitch } },
    { target: right, mutation: { note: right.note, pitch: rightPitch } },
  ].sort((leftMutation, rightMutation) => leftMutation.target.rolePriority - rightMutation.target.rolePriority);
  return mutations.map(({ mutation }) => mutation);
}

function tryRepairMutations(
  notes: NoteEvent[],
  sectionPlans: readonly HarmonicPlan[],
  startTick: number,
  beforeCount: number,
  mutations: readonly RepairMutation[],
  options: SustainedDissonanceRepairOptions,
): boolean {
  const originals = mutations.map((mutation) => mutation.note.pitch);
  for (const mutation of mutations) {
    mutation.note.pitch = mutation.pitch;
  }
  const accepted =
    preservesAllVoiceOrderThroughMutationSpans(notes, mutations, startTick) &&
    (() => {
      const after = analyzeDissonanceTriage(notes, sectionPlans, []);
      return (
        after.sustainedSevereVerticalDissonanceCount < beforeCount &&
        !hasGeneratorResponseWindowAt(after.windows, startTick) &&
        (options.canAcceptMutation?.(notes) ?? true)
      );
    })();
  if (accepted) {
    return true;
  }
  mutations.forEach((mutation, index) => {
    mutation.note.pitch = originals[index]!;
  });
  return false;
}

function repairPitchCandidates(
  note: NoteEvent,
  tick: number,
  sectionPlans: readonly HarmonicPlan[],
  writingProfile: WritingProfile,
): number[] {
  const range = writingProfile.voiceRanges[note.voice];
  const anchor = nearestHarmonicAnchor(tick, sectionPlans);
  const chordTonePitchClassesForAnchor =
    anchor === undefined ? [] : chordTonePitchClasses(anchor.localKey, anchor.function);
  const chordTonePitches = chordTonePitchClassesForAnchor.map((pitchClass) =>
    nearestWritingProfilePitchForPitchClass(pitchClass, note.pitch, note.voice, writingProfile),
  );
  const stepTargets = [-2, -1, 1, 2]
    .map((offset) => note.pitch + offset)
    .filter(
      (pitch) => pitch >= range.min && pitch <= range.max && isPitchAllowedByWritingProfile(writingProfile, pitch),
    );
  const fallbackProfilePitches = writingProfile.absolutePitchSet
    .filter((pitch) => pitch >= range.min && pitch <= range.max)
    .sort((left, right) => Math.abs(left - note.pitch) - Math.abs(right - note.pitch) || left - right)
    .slice(0, 8);

  return [...new Set([...chordTonePitches, ...stepTargets, ...fallbackProfilePitches])]
    .filter(
      (pitch) => pitch >= range.min && pitch <= range.max && isPitchAllowedByWritingProfile(writingProfile, pitch),
    )
    .sort((left, right) => {
      const leftChord = chordTonePitchClassesForAnchor.includes(positiveModulo(left, 12)) ? 0 : 1;
      const rightChord = chordTonePitchClassesForAnchor.includes(positiveModulo(right, 12)) ? 0 : 1;
      return leftChord - rightChord || Math.abs(left - note.pitch) - Math.abs(right - note.pitch) || left - right;
    });
}

function preservesVoiceOrderAt(
  notes: readonly NoteEvent[],
  target: NoteEvent,
  candidatePitch: number,
  tick: number,
): boolean {
  const active = activeNotesAt(notes, tick).filter((note) => note !== target);
  const targetOrder = VOICES.indexOf(target.voice);
  for (const note of active) {
    const order = VOICES.indexOf(note.voice);
    if (order < targetOrder && note.pitch < candidatePitch) {
      return false;
    }
    if (order > targetOrder && candidatePitch < note.pitch) {
      return false;
    }
  }
  return true;
}

function preservesAllVoiceOrderAt(notes: readonly NoteEvent[], tick: number): boolean {
  const active = activeNotesAt(notes, tick).sort(
    (left, right) => VOICES.indexOf(left.voice) - VOICES.indexOf(right.voice),
  );
  for (let index = 0; index < active.length - 1; index += 1) {
    const upper = active[index]!;
    const lower = active[index + 1]!;
    if (upper.pitch < lower.pitch) {
      return false;
    }
  }
  return true;
}

function preservesAllVoiceOrderThroughMutationSpans(
  notes: readonly NoteEvent[],
  mutations: readonly RepairMutation[],
  fallbackTick: number,
): boolean {
  const minTick = Math.min(fallbackTick, ...mutations.map((mutation) => mutation.note.startTick));
  const maxTick = Math.max(
    fallbackTick + 1,
    ...mutations.map((mutation) => mutation.note.startTick + mutation.note.durationTicks),
  );
  const ticks = [
    ...new Set([
      fallbackTick,
      ...mutations.map((mutation) => mutation.note.startTick),
      ...notes
        .flatMap((note) => [note.startTick, note.startTick + note.durationTicks])
        .filter((tick) => minTick <= tick && tick < maxTick),
    ]),
  ];
  return ticks.every((tick) => preservesAllVoiceOrderAt(notes, tick));
}

function activeNotesAt(notes: readonly NoteEvent[], tick: number): NoteEvent[] {
  return notes.filter((note) => note.startTick <= tick && tick < note.startTick + note.durationTicks);
}

function sustainedGeneratorResponseWindows(windows: readonly DissonanceTriageWindow[]): DissonanceTriageWindow[] {
  return windows.filter(
    (window) => window.response === "generator-response-required" && window.classification.startsWith("sustained-"),
  );
}

function hasGeneratorResponseWindowAt(windows: readonly DissonanceTriageWindow[], startTick: number): boolean {
  return sustainedGeneratorResponseWindows(windows).some((window) => window.startTick === startTick);
}
