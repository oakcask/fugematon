import { TICKS_PER_QUARTER } from "../constants.js";
import type {
  EntryFormulaRecurrenceSummary,
  EntrySevereIntervalDurationSummary,
  EntrySonorityKind,
  EntrySonoritySummary,
  NoteEvent,
  PlannedEntry,
} from "../events.js";
import { positiveModulo } from "./shared.js";

export function summarizeEntrySevereIntervalDurations(
  notes: readonly NoteEvent[],
  subjectEntries: readonly PlannedEntry[],
): EntrySevereIntervalDurationSummary[] {
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
      const resolvesBeforeDeadline =
        checkpoints.some(
          (candidateTick) =>
            candidateTick > startTick &&
            candidateTick <= resolutionDeadlineTick &&
            !hasSevereEntryIntervalAt(notes, entry, candidateTick),
        ) || entryLineResolvesByStep(notes, entry, startTick);
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

export function summarizeEntrySonorities(
  notes: readonly NoteEvent[],
  subjectEntries: readonly PlannedEntry[],
): EntrySonoritySummary[] {
  return subjectEntries.map((entry) => summarizeEntrySonority(notes, entry));
}

export function summarizeEntryFormulaRecurrences(
  entrySonorities: readonly EntrySonoritySummary[],
): EntryFormulaRecurrenceSummary[] {
  const formulas = new Map<
    string,
    {
      summary: EntryFormulaRecurrenceSummary;
      unresolvedCount: number;
      justifiedCount: number;
    }
  >();

  for (const sonority of entrySonorities.filter((entry) => !entry.kinds.includes("open-consonance"))) {
    const formulaKey = entryFormulaKey(sonority);
    const existing = formulas.get(formulaKey);
    const unresolved = Number(sonority.unresolvedAccentedClashCount > 0);
    const justified = Number(sonority.preparedOrPassingCount > 0);
    if (existing === undefined) {
      formulas.set(formulaKey, {
        summary: {
          formulaKey,
          recurrenceCount: 1,
          representativeTick: sonority.representativeTick,
          entryVoice: sonority.voice,
          state: sonority.state,
          beatStrength: sonority.beatStrength,
          supportVoices: sonority.supportVoices,
          kinds: sonority.kinds,
          resolutionDirection: sonority.resolutionDirection,
          judgement: "reduced",
        },
        unresolvedCount: unresolved,
        justifiedCount: justified,
      });
    } else {
      existing.summary.recurrenceCount += 1;
      existing.unresolvedCount += unresolved;
      existing.justifiedCount += justified;
    }
  }

  return [...formulas.values()]
    .map(({ summary, unresolvedCount, justifiedCount }) => ({
      ...summary,
      judgement: entryFormulaJudgement(summary.recurrenceCount, unresolvedCount, justifiedCount),
    }))
    .filter((summary) => summary.recurrenceCount >= 2 || summary.judgement === "review-required")
    .sort(
      (left, right) => right.recurrenceCount - left.recurrenceCount || left.formulaKey.localeCompare(right.formulaKey),
    )
    .slice(0, 12);
}

function entryFormulaJudgement(
  recurrenceCount: number,
  unresolvedCount: number,
  justifiedCount: number,
): EntryFormulaRecurrenceSummary["judgement"] {
  if (recurrenceCount < 2) {
    return "reduced";
  }
  if (unresolvedCount > 0) {
    return "review-required";
  }
  if (justifiedCount > 0) {
    return "functionally-justified";
  }
  return "review-required";
}

function summarizeEntrySonority(notes: readonly NoteEvent[], entry: PlannedEntry): EntrySonoritySummary {
  const checkpoints = entrySupportCheckpoints(notes, entry);
  let representativeTick = entry.startTick;
  let pitchClassUnisonStackCount = 0;
  let adjacentSecondFrictionCount = 0;
  let exposedSeventhCount = 0;
  let tritoneExposureCount = 0;
  let preparedOrPassingCount = 0;
  let unresolvedAccentedClashCount = 0;
  const supportVoices = new Set<NoteEvent["voice"]>();
  const kinds = new Set<EntrySonorityKind>();

  for (let index = 0; index < checkpoints.length; index += 1) {
    const tick = checkpoints[index]!;
    const entryNote = entryNoteAt(notes, entry, tick);
    if (entryNote === undefined) {
      continue;
    }

    const supportNotes = entrySupportNotesAt(notes, entry, tick);
    for (const supportNote of supportNotes) {
      supportVoices.add(supportNote.voice);
    }

    const pitchClasses = new Map<number, number>();
    for (const note of [entryNote, ...supportNotes]) {
      const pitchClass = positiveModulo(note.pitch, 12);
      pitchClasses.set(pitchClass, (pitchClasses.get(pitchClass) ?? 0) + 1);
    }
    if ([...pitchClasses.values()].some((count) => count >= 2)) {
      pitchClassUnisonStackCount += 1;
      kinds.add("pitch-class-unison-stack");
      representativeTick = tick;
    }

    for (const supportNote of supportNotes) {
      const intervalClass = entrySupportIntervalClass(entryNote, supportNote);
      const resolves = entrySupportPairResolvesByStep(notes, entry, entryNote, supportNote, tick);
      if (isAdjacentSecondFriction(intervalClass)) {
        adjacentSecondFrictionCount += 1;
        kinds.add("adjacent-second-friction");
        if (resolves) {
          preparedOrPassingCount += 1;
          kinds.add(preparedOrPassingEntryKind(index));
        } else if (isUnresolvedAccentedEntryClash(intervalClass, resolves, tick)) {
          unresolvedAccentedClashCount += 1;
          kinds.add("unresolved-accented-clash");
        }
        representativeTick = tick;
      } else if (isExposedSeventh(intervalClass)) {
        exposedSeventhCount += 1;
        kinds.add("exposed-seventh");
        if (isUnresolvedAccentedEntryClash(intervalClass, resolves, tick)) {
          unresolvedAccentedClashCount += 1;
          kinds.add("unresolved-accented-clash");
        }
        representativeTick = tick;
      } else if (isTritoneExposure(intervalClass)) {
        tritoneExposureCount += 1;
        kinds.add("tritone-exposure");
        representativeTick = tick;
      }
    }
  }

  if (kinds.size === 0) {
    kinds.add("open-consonance");
  }

  return {
    voice: entry.voice,
    form: entry.form,
    state: entry.state,
    startTick: entry.startTick,
    representativeTick,
    beatStrength: isStrongBeat(representativeTick) ? "strong" : "weak",
    supportVoices: [...supportVoices].sort(),
    kinds: [...kinds].sort(),
    pitchClassUnisonStackCount,
    adjacentSecondFrictionCount,
    exposedSeventhCount,
    tritoneExposureCount,
    preparedOrPassingCount,
    unresolvedAccentedClashCount,
    resolutionDirection: resolutionDirection(notes, entry, representativeTick),
    resolutionDeadlineTicks: TICKS_PER_QUARTER,
  };
}

function entryFormulaKey(sonority: EntrySonoritySummary): string {
  return [
    sonority.voice,
    sonority.state,
    sonority.beatStrength,
    sonority.supportVoices.join("+"),
    sonority.kinds.join("+"),
    sonority.resolutionDirection,
  ].join(":");
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
  const entryNote = entryNoteAt(notes, entry, tick);
  if (entryNote === undefined) {
    return false;
  }

  return entrySupportNotesAt(notes, entry, tick).some((supportNote) => {
    const intervalClass = entrySupportIntervalClass(entryNote, supportNote);
    return isAdjacentSecondFriction(intervalClass) || isExposedSeventh(intervalClass);
  });
}

function entrySupportIntervalClass(entryNote: NoteEvent, supportNote: NoteEvent): number {
  return Math.abs(entryNote.pitch - supportNote.pitch) % 12;
}

function isAdjacentSecondFriction(intervalClass: number): boolean {
  return intervalClass === 1 || intervalClass === 2;
}

function isExposedSeventh(intervalClass: number): boolean {
  return intervalClass === 10 || intervalClass === 11;
}

function isTritoneExposure(intervalClass: number): boolean {
  return intervalClass === 6;
}

function isUnresolvedAccentedEntryClash(intervalClass: number, resolves: boolean, tick: number): boolean {
  return (
    (isAdjacentSecondFriction(intervalClass) || isExposedSeventh(intervalClass)) && !resolves && isStrongBeat(tick)
  );
}

function preparedOrPassingEntryKind(index: number): EntrySonorityKind {
  return index === 0 ? "prepared-suspension" : "passing-neighbor-motion";
}

function entryNoteAt(notes: readonly NoteEvent[], entry: PlannedEntry, tick: number): NoteEvent | undefined {
  return notes.find(
    (note) =>
      note.voice === entry.voice &&
      note.startTick <= tick &&
      tick < note.startTick + note.durationTicks &&
      isEntryRole(note.role),
  );
}

function entrySupportNotesAt(notes: readonly NoteEvent[], entry: PlannedEntry, tick: number): NoteEvent[] {
  return notes.filter(
    (note) =>
      note.voice !== entry.voice &&
      note.startTick <= tick &&
      tick < note.startTick + note.durationTicks &&
      (note.role === "counter-subject" || note.role === "free-counterpoint"),
  );
}

function entrySupportPairResolvesByStep(
  notes: readonly NoteEvent[],
  entry: PlannedEntry,
  entryNote: NoteEvent,
  supportNote: NoteEvent,
  tick: number,
): boolean {
  return (
    entryLineResolvesByStep(notes, entry, tick) ||
    noteResolvesByStep(notes, entryNote, tick) ||
    noteResolvesByStep(notes, supportNote, tick)
  );
}

function entryLineResolvesByStep(notes: readonly NoteEvent[], entry: PlannedEntry, tick: number): boolean {
  const current = entryNoteAt(notes, entry, tick);
  return current !== undefined && noteResolvesByStep(notes, current, tick);
}

function noteResolvesByStep(notes: readonly NoteEvent[], current: NoteEvent, tick: number): boolean {
  const next = notes
    .filter((note) => note.voice === current.voice && note.startTick > tick)
    .sort((left, right) => left.startTick - right.startTick)[0];
  return next !== undefined && next.startTick <= tick + TICKS_PER_QUARTER && Math.abs(next.pitch - current.pitch) <= 2;
}

function resolutionDirection(
  notes: readonly NoteEvent[],
  entry: PlannedEntry,
  tick: number,
): EntrySonoritySummary["resolutionDirection"] {
  const current = entryNoteAt(notes, entry, tick);
  const next = notes
    .filter((note) => note.voice === entry.voice && note.startTick > tick)
    .sort((left, right) => left.startTick - right.startTick)[0];
  if (current === undefined || next === undefined) {
    return "none";
  }
  if (next.pitch > current.pitch) {
    return "up";
  }
  if (next.pitch < current.pitch) {
    return "down";
  }
  return "none";
}

function isStrongBeat(tick: number): boolean {
  return tick % (TICKS_PER_QUARTER * 2) === 0;
}

function isEntryRole(role: NoteEvent["role"]): boolean {
  return role === "subject" || role === "answer" || role === "subject-fragment";
}
