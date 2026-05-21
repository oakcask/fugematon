import { TICKS_PER_QUARTER } from "../constants.js";
import type {
  HarmonicPlan,
  NoteEvent,
  Phase13TCounterSubjectWindowSummary,
  Phase13TFragmentFunctionEvidence,
  PlannedEntry,
} from "../events.js";

export function summarizeFragmentFunctionEvidence(
  sectionPlans: readonly HarmonicPlan[],
): Phase13TFragmentFunctionEvidence {
  const fragmentPlans = sectionPlans.filter((plan) => plan.state === "episode" && plan.fragmentTransform !== undefined);
  const counts = new Map<string, number>();

  for (const plan of fragmentPlans) {
    const key = [
      plan.fragmentTransform ?? "none",
      plan.sequencePattern ?? "no-sequence",
      plan.cadenceKind,
      plan.targetKey.mode,
    ].join(":");
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const topFunctions = [...counts.entries()]
    .map(([functionKey, count]) => ({
      functionKey,
      count,
      share: roundRatio(count / Math.max(1, fragmentPlans.length)),
    }))
    .sort((left, right) => right.count - left.count || left.functionKey.localeCompare(right.functionKey))
    .slice(0, 5);

  return {
    fragmentSectionCount: fragmentPlans.length,
    uniqueFunctionCount: counts.size,
    topFunctionShare: topFunctions[0]?.share ?? 0,
    topFunctions,
  };
}

export function summarizeCounterSubjectWindows(
  notes: readonly NoteEvent[],
  subjectEntries: readonly PlannedEntry[],
): Phase13TCounterSubjectWindowSummary[] {
  return subjectEntries.map((entry) => {
    const windowEndTick = entry.startTick + TICKS_PER_QUARTER * 8;
    const counterSubjectNotes = notes
      .filter(
        (note) =>
          note.role === "counter-subject" &&
          note.startTick < windowEndTick &&
          entry.startTick < note.startTick + note.durationTicks,
      )
      .sort(compareNotes);
    const supportCollisionCount = counterSubjectNotes.reduce(
      (count, counterSubject) =>
        count +
        notes.filter(
          (note) =>
            note.role === "free-counterpoint" &&
            note.voice !== counterSubject.voice &&
            note.startTick < counterSubject.startTick + counterSubject.durationTicks &&
            counterSubject.startTick < note.startTick + note.durationTicks &&
            Math.abs(note.pitch - counterSubject.pitch) % 12 <= 2,
        ).length,
      0,
    );

    return {
      entryStartTick: entry.startTick,
      entryVoice: entry.voice,
      counterSubjectVoice: counterSubjectNotes[0]?.voice,
      retentionKind: counterSubjectRetentionKind(counterSubjectNotes),
      rhythmPattern: counterSubjectNotes.slice(0, 8).map((note) => Math.round(note.durationTicks / TICKS_PER_QUARTER)),
      contourClass: contourClass(counterSubjectNotes),
      supportCollisionCount,
    };
  });
}

function counterSubjectRetentionKind(
  notes: readonly NoteEvent[],
): Phase13TCounterSubjectWindowSummary["retentionKind"] {
  const uniqueDurations = new Set(notes.slice(0, 8).map((note) => note.durationTicks));
  const contour = contourClass(notes);
  if (notes.length >= 6 && uniqueDurations.size >= 2 && contour.includes("u") && contour.includes("d")) {
    return "recognizable";
  }
  if (notes.length >= 4 && contour.length > 0) {
    return "altered";
  }
  return "weak";
}

function contourClass(notes: readonly NoteEvent[]): string {
  return notes
    .slice(1, 8)
    .map((note, index) => {
      const previous = notes[index]!;
      if (note.pitch > previous.pitch) {
        return "u";
      }
      if (note.pitch < previous.pitch) {
        return "d";
      }
      return "r";
    })
    .join("");
}

function compareNotes(left: NoteEvent, right: NoteEvent): number {
  return left.startTick - right.startTick || left.durationTicks - right.durationTicks || left.pitch - right.pitch;
}

function roundRatio(value: number): number {
  return Math.round(value * 1000) / 1000;
}
