import { TICKS_PER_QUARTER } from "../constants.js";
import type {
  ContinuousBoundaryCarrySummary,
  HarmonicPlan,
  NoteEvent,
  NoteRole,
  PlannedEntry,
  Voice,
} from "../events.js";
import type { SegmentSnapshot } from "../infinite-playback.js";
import { compareNoteEvents, VOICE_ENTRY_ORDER } from "./shared.js";

const BOUNDARY_PREPARATION_WINDOW_TICKS = TICKS_PER_QUARTER * 2;
const BOUNDARY_STAGGER_TICKS = TICKS_PER_QUARTER / 2;
const BOUNDARY_CARRY_TICKS = TICKS_PER_QUARTER;

export function applyContinuousBoundaryCarryRepair(input: {
  notes: NoteEvent[];
  subjectEntries: readonly PlannedEntry[];
  sectionPlans: readonly HarmonicPlan[];
  previousSnapshot?: SegmentSnapshot;
}): void {
  const summary = buildContinuousBoundaryCarrySummary({
    segmentIndex: (input.previousSnapshot?.segmentIndex ?? -1) + 1,
    previousSnapshot: input.previousSnapshot,
    notes: input.notes,
    sectionPlans: input.sectionPlans,
  });
  if (
    summary.classification !== "generator-response-required-hard-restart" &&
    summary.classification !== "review-required-thin-boundary"
  ) {
    return;
  }

  const firstPlan = input.sectionPlans[0];
  if (firstPlan === undefined || (firstPlan.state !== "subject-return" && firstPlan.state !== "stretto-like")) {
    return;
  }

  const previousNotes = previousNotesFromSnapshot(input.previousSnapshot);
  const carrySource = chooseBoundaryCarrySource(previousNotes, input.notes, input.subjectEntries);
  if (carrySource === undefined) {
    return;
  }

  const carryDurationTicks = Math.min(BOUNDARY_CARRY_TICKS, firstPlan.meterContext.beatTicks, BOUNDARY_STAGGER_TICKS);
  if (!makeRoomForBoundaryCarry(input.notes, carrySource.voice, carryDurationTicks)) {
    return;
  }

  input.notes.push({
    kind: "note",
    voice: carrySource.voice,
    startTick: 0,
    durationTicks: carryDurationTicks,
    pitch: carrySource.pitch,
    velocity: Math.max(42, Math.min(58, carrySource.velocity - 8)),
    role: "free-counterpoint",
    metricalHarmonyIntent: carrySource.voice === "bass" ? "structural-root-support" : "structural-chord-tone",
  });
  staggerBoundarySupportOnsets(input.notes, input.subjectEntries, carrySource.voice, carryDurationTicks);
  input.notes.sort(compareNoteEvents);
}

export function buildContinuousBoundaryCarrySummary(input: {
  segmentIndex: number;
  previousSnapshot?: SegmentSnapshot;
  notes: readonly NoteEvent[];
  sectionPlans: readonly HarmonicPlan[];
}): ContinuousBoundaryCarrySummary {
  const previousNotes = previousNotesFromSnapshot(input.previousSnapshot);
  const previousByVoice = new Map(VOICE_ENTRY_ORDER.map((voice) => [voice, latestPreviousNote(previousNotes, voice)]));
  const firstByVoice = new Map(VOICE_ENTRY_ORDER.map((voice) => [voice, firstCurrentNote(input.notes, voice)]));
  const previousSoundingVoiceCountNearBoundary = VOICE_ENTRY_ORDER.filter((voice) =>
    previousNotes.some(
      (note) =>
        note.voice === voice &&
        note.startTick < 0 &&
        note.startTick + note.durationTicks > -BOUNDARY_PREPARATION_WINDOW_TICKS,
    ),
  ).length;
  const previousTailEndTick = Math.max(
    Number.NEGATIVE_INFINITY,
    ...previousNotes.map((note) => note.startTick + note.durationTicks),
  );
  const nextFirstAttackTick = Math.min(Number.POSITIVE_INFINITY, ...input.notes.map((note) => note.startTick));
  const allVoiceGapTicks =
    previousTailEndTick === Number.NEGATIVE_INFINITY || nextFirstAttackTick === Number.POSITIVE_INFINITY
      ? 0
      : Math.max(0, nextFirstAttackTick - previousTailEndTick);
  const firstAttackNotes = input.notes.filter((note) => note.startTick === nextFirstAttackTick);
  const nextFirstAttackDensity = new Set(firstAttackNotes.map((note) => note.voice)).size;
  const nextFirstAttackRoleMix = uniqueRoles(firstAttackNotes.map((note) => note.role).filter(isNoteRole));
  const carriedVoices = VOICE_ENTRY_ORDER.filter((voice) =>
    hasBoundaryCarry(previousByVoice.get(voice), firstByVoice.get(voice)),
  );
  const suspendedOrResolvingVoices = VOICE_ENTRY_ORDER.filter((voice) =>
    hasSuspensionOrResolution(previousByVoice.get(voice), firstByVoice.get(voice)),
  );
  const pedalVoices = VOICE_ENTRY_ORDER.filter((voice) =>
    hasPedalSupport(voice, previousByVoice.get(voice), firstByVoice.get(voice)),
  );
  const staggeredVoices = VOICE_ENTRY_ORDER.filter((voice) => {
    const first = firstByVoice.get(voice);
    return first !== undefined && first.startTick > 0 && first.startTick <= BOUNDARY_STAGGER_TICKS * 2;
  });
  const restartedVoices = VOICE_ENTRY_ORDER.filter((voice) =>
    hasHardRestart(previousByVoice.get(voice), firstByVoice.get(voice), nextFirstAttackTick),
  );
  const priorTailHarmonicContinuity = classifyPriorTailHarmonicContinuity(input.previousSnapshot);
  const thinBoundary =
    previousSoundingVoiceCountNearBoundary <= 1 ||
    allVoiceGapTicks >= BOUNDARY_STAGGER_TICKS ||
    priorTailHarmonicContinuity === "unresolved-cadence-preparation";
  const hasAudibleCarry =
    carriedVoices.length > 0 ||
    suspendedOrResolvingVoices.length > 0 ||
    pedalVoices.length > 0 ||
    staggeredVoices.length > 0;
  const hardRestart = thinBoundary && nextFirstAttackDensity >= 3 && !hasAudibleCarry && restartedVoices.length >= 3;
  const classification =
    input.segmentIndex === 0 || input.previousSnapshot === undefined
      ? "not-required"
      : carriedVoices.length > 0
        ? "carried-line-continuation"
        : hasAudibleCarry
          ? "prepared-reentry"
          : hardRestart
            ? "generator-response-required-hard-restart"
            : thinBoundary && nextFirstAttackDensity >= 3
              ? "review-required-thin-boundary"
              : "prepared-reentry";

  return {
    schemaVersion: 1,
    segmentIndex: input.segmentIndex,
    boundaryTick: input.previousSnapshot?.tick ?? 0,
    previousSoundingVoiceCountNearBoundary,
    allVoiceGapTicks,
    voiceTimings: VOICE_ENTRY_ORDER.map((voice) => {
      const previous = previousByVoice.get(voice);
      return {
        voice,
        lastEndBeforeBoundary: previous === undefined ? undefined : previous.startTick + previous.durationTicks,
        firstStartAfterBoundary: firstByVoice.get(voice)?.startTick,
      };
    }),
    carriedVoices,
    suspendedOrResolvingVoices,
    pedalVoices,
    staggeredVoices,
    restartedVoices,
    priorTailHarmonicContinuity,
    nextFirstAttackDensity,
    nextFirstAttackRoleMix,
    classification,
    reasons: boundaryCarryReasons({
      classification,
      previousSoundingVoiceCountNearBoundary,
      allVoiceGapTicks,
      nextFirstAttackDensity,
      priorTailHarmonicContinuity,
      hasAudibleCarry,
    }),
  };
}

function previousNotesFromSnapshot(snapshot: SegmentSnapshot | undefined): NoteEvent[] {
  return snapshot?.boundedPastEventContext.events.filter((event): event is NoteEvent => event.kind === "note") ?? [];
}

function latestPreviousNote(notes: readonly NoteEvent[], voice: Voice): NoteEvent | undefined {
  return notes
    .filter((note) => note.voice === voice && note.startTick < 0 && note.startTick + note.durationTicks <= 0)
    .sort(compareNoteEvents)
    .at(-1);
}

function firstCurrentNote(notes: readonly NoteEvent[], voice: Voice): NoteEvent | undefined {
  return notes
    .filter((note) => note.voice === voice && note.startTick >= 0)
    .sort(compareNoteEvents)
    .at(0);
}

function hasBoundaryCarry(previous: NoteEvent | undefined, first: NoteEvent | undefined): boolean {
  if (previous === undefined || first === undefined || first.startTick > BOUNDARY_STAGGER_TICKS) {
    return false;
  }
  return (
    previous.startTick + previous.durationTicks === 0 &&
    first.startTick === 0 &&
    Math.abs(first.pitch - previous.pitch) <= 2
  );
}

function hasSuspensionOrResolution(previous: NoteEvent | undefined, first: NoteEvent | undefined): boolean {
  if (previous === undefined || first === undefined) {
    return false;
  }
  const gapTicks = first.startTick - (previous.startTick + previous.durationTicks);
  return gapTicks >= 0 && gapTicks <= BOUNDARY_STAGGER_TICKS && Math.abs(first.pitch - previous.pitch) <= 2;
}

function hasPedalSupport(voice: Voice, previous: NoteEvent | undefined, first: NoteEvent | undefined): boolean {
  if (voice !== "bass" || previous === undefined || first === undefined || first.startTick > BOUNDARY_STAGGER_TICKS) {
    return false;
  }
  return first.pitch === previous.pitch || first.metricalHarmonyIntent === "structural-root-support";
}

function hasHardRestart(
  previous: NoteEvent | undefined,
  first: NoteEvent | undefined,
  nextFirstAttackTick: number,
): boolean {
  if (first === undefined || first.startTick !== nextFirstAttackTick) {
    return false;
  }
  if (previous === undefined) {
    return true;
  }
  return first.startTick - (previous.startTick + previous.durationTicks) >= BOUNDARY_STAGGER_TICKS;
}

function classifyPriorTailHarmonicContinuity(
  snapshot: SegmentSnapshot | undefined,
): ContinuousBoundaryCarrySummary["priorTailHarmonicContinuity"] {
  if (snapshot === undefined) {
    return "not-required";
  }
  if (snapshot.cadencePreparation.unresolved) {
    return "unresolved-cadence-preparation";
  }
  const lastFunction = snapshot.boundedPastEventContext.sectionFunctions.at(-1)?.state;
  if (lastFunction === "episode" || lastFunction === "stretto-like") {
    return "harmonic-continuity-tail";
  }
  return "clear-break";
}

function chooseBoundaryCarrySource(
  previousNotes: readonly NoteEvent[],
  currentNotes: readonly NoteEvent[],
  subjectEntries: readonly PlannedEntry[],
): NoteEvent | undefined {
  const entryVoiceAtBoundary = subjectEntries.find((entry) => entry.startTick === 0)?.voice;
  const latestByVoice = VOICE_ENTRY_ORDER.flatMap((voice) => {
    const note = latestPreviousNote(previousNotes, voice);
    return note === undefined ? [] : [note];
  }).sort((left, right) => left.startTick + left.durationTicks - (right.startTick + right.durationTicks));
  const candidates = [...latestByVoice].reverse();

  return (
    candidates.find(
      (note) => note.voice !== entryVoiceAtBoundary && canCarryVoiceAtBoundary(currentNotes, note.voice),
    ) ?? candidates.find((note) => canCarryVoiceAtBoundary(currentNotes, note.voice))
  );
}

function canCarryVoiceAtBoundary(notes: readonly NoteEvent[], voice: Voice): boolean {
  const first = firstCurrentNote(notes, voice);
  return first === undefined || first.startTick > 0 || (first.role !== "subject" && first.role !== "answer");
}

function makeRoomForBoundaryCarry(notes: NoteEvent[], voice: Voice, carryDurationTicks: number): boolean {
  const first = firstCurrentNote(notes, voice);
  if (first === undefined || first.startTick >= carryDurationTicks) {
    return true;
  }
  if (first.role === "subject" || first.role === "answer") {
    return false;
  }
  if (first.durationTicks <= carryDurationTicks) {
    notes.splice(notes.indexOf(first), 1);
    return true;
  }
  first.startTick = carryDurationTicks;
  first.durationTicks -= carryDurationTicks;
  return true;
}

function staggerBoundarySupportOnsets(
  notes: NoteEvent[],
  subjectEntries: readonly PlannedEntry[],
  carryVoice: Voice,
  carryDurationTicks: number,
): void {
  const entryVoiceAtBoundary = subjectEntries.find((entry) => entry.startTick === 0)?.voice;
  let delayed = 0;
  for (const note of notes.filter((candidate) => candidate.startTick === 0).sort(compareNoteEvents)) {
    if (
      delayed >= 2 ||
      note.voice === carryVoice ||
      note.voice === entryVoiceAtBoundary ||
      note.role === "subject" ||
      note.role === "answer" ||
      note.durationTicks <= BOUNDARY_STAGGER_TICKS
    ) {
      continue;
    }
    const delayTicks = Math.min(BOUNDARY_STAGGER_TICKS * (delayed + 1), carryDurationTicks);
    note.startTick += delayTicks;
    note.durationTicks -= delayTicks;
    delayed += 1;
  }
}

function uniqueRoles(roles: readonly NoteRole[]): NoteRole[] {
  return [...new Set(roles)];
}

function isNoteRole(role: NoteEvent["role"]): role is NoteRole {
  return role !== undefined;
}

function boundaryCarryReasons(input: {
  classification: ContinuousBoundaryCarrySummary["classification"];
  previousSoundingVoiceCountNearBoundary: number;
  allVoiceGapTicks: number;
  nextFirstAttackDensity: number;
  priorTailHarmonicContinuity: ContinuousBoundaryCarrySummary["priorTailHarmonicContinuity"];
  hasAudibleCarry: boolean;
}): string[] {
  return [
    `previous sounding voice count near boundary is ${input.previousSoundingVoiceCountNearBoundary}`,
    `all-voice boundary gap is ${input.allVoiceGapTicks} ticks`,
    `next first attack density is ${input.nextFirstAttackDensity}`,
    `prior tail harmonic continuity is ${input.priorTailHarmonicContinuity}`,
    input.hasAudibleCarry
      ? "boundary has carried, resolving, pedal, or staggered audible support"
      : "boundary has no carried, resolving, pedal, or staggered audible support",
    `classification is ${input.classification}`,
  ];
}
