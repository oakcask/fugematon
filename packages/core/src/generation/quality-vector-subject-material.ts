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
    transformationClaims: topFunctions.map((summary) => {
      const transformationKinds = fragmentTransformationKinds(summary.functionKey);
      return {
        functionKey: summary.functionKey,
        count: summary.count,
        transformationKinds,
        judgement: transformationClaimJudgement(transformationKinds.length, summary.share),
      };
    }),
  };
}

function transformationClaimJudgement(
  transformationKindCount: number,
  share: number,
): Phase13TFragmentFunctionEvidence["transformationClaims"][number]["judgement"] {
  if (transformationKindCount >= 3) {
    return "developed";
  }
  return share >= 0.35 ? "review-required" : "underdeveloped";
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
      (count, counterSubject) => count + counterSubjectSupportCollisionCount(notes, counterSubject),
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
      preservationJudgement: counterSubjectPreservationJudgement(
        counterSubjectRetentionKind(counterSubjectNotes),
        supportCollisionCount,
      ),
    };
  });
}

function counterSubjectSupportCollisionCount(notes: readonly NoteEvent[], counterSubject: NoteEvent): number {
  return notes.filter((note) => isCounterSubjectSupportCollision(note, counterSubject)).length;
}

function isCounterSubjectSupportCollision(note: NoteEvent, counterSubject: NoteEvent): boolean {
  return (
    note.role === "free-counterpoint" &&
    note.voice !== counterSubject.voice &&
    notesOverlap(note, counterSubject) &&
    isNearPitchClassCollision(note.pitch, counterSubject.pitch)
  );
}

function notesOverlap(left: NoteEvent, right: NoteEvent): boolean {
  return (
    left.startTick < right.startTick + right.durationTicks && right.startTick < left.startTick + left.durationTicks
  );
}

function isNearPitchClassCollision(leftPitch: number, rightPitch: number): boolean {
  return Math.abs(leftPitch - rightPitch) % 12 <= 2;
}

function fragmentTransformationKinds(functionKey: string): string[] {
  const [transform, sequencePattern, cadenceKind, mode] = functionKey.split(":");
  const kinds = new Set<string>();
  if (transform !== undefined && transform !== "none") {
    kinds.add(`transform:${transform}`);
  }
  if (sequencePattern !== undefined && sequencePattern !== "no-sequence") {
    kinds.add(`sequence:${sequencePattern}`);
  }
  if (cadenceKind !== undefined) {
    kinds.add(`cadence:${cadenceKind}`);
  }
  if (mode !== undefined) {
    kinds.add(`mode:${mode}`);
  }
  return [...kinds].sort();
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

function counterSubjectPreservationJudgement(
  retentionKind: Phase13TCounterSubjectWindowSummary["retentionKind"],
  supportCollisionCount: number,
): Phase13TCounterSubjectWindowSummary["preservationJudgement"] {
  if (retentionKind === "recognizable" && supportCollisionCount <= 4) {
    return "preserved";
  }
  if (retentionKind === "weak") {
    return "weak";
  }
  return "tradeoff";
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
