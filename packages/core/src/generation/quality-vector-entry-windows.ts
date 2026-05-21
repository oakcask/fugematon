import { TICKS_PER_QUARTER } from "../constants.js";
import type { NoteEvent, Phase13EntrySevereIntervalDurationSummary, PlannedEntry } from "../events.js";

export function summarizeEntrySevereIntervalDurations(
  notes: readonly NoteEvent[],
  subjectEntries: readonly PlannedEntry[],
): Phase13EntrySevereIntervalDurationSummary[] {
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
      const resolvesBeforeDeadline = checkpoints.some(
        (candidateTick) =>
          candidateTick > startTick &&
          candidateTick <= resolutionDeadlineTick &&
          !hasSevereEntryIntervalAt(notes, entry, candidateTick),
      );
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
  const entryNote = notes.find(
    (note) =>
      note.voice === entry.voice &&
      note.startTick <= tick &&
      tick < note.startTick + note.durationTicks &&
      isEntryRole(note.role),
  );
  if (entryNote === undefined) {
    return false;
  }

  return notes
    .filter(
      (note) =>
        note.voice !== entry.voice &&
        note.startTick <= tick &&
        tick < note.startTick + note.durationTicks &&
        (note.role === "counter-subject" || note.role === "free-counterpoint"),
    )
    .some((supportNote) => {
      const intervalClass = Math.abs(entryNote.pitch - supportNote.pitch) % 12;
      return intervalClass === 1 || intervalClass === 2 || intervalClass === 10 || intervalClass === 11;
    });
}

function isEntryRole(role: NoteEvent["role"]): boolean {
  return role === "subject" || role === "answer" || role === "subject-fragment";
}
