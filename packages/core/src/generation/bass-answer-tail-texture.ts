import { TICKS_PER_QUARTER } from "../constants.js";
import type {
  BassAnswerTailTextureSummary,
  BassAnswerTailTextureWindow,
  NoteEvent,
  PlannedEntry,
  Voice,
} from "../events.js";

const TAIL_WINDOW_TICKS = TICKS_PER_QUARTER * 9;

export function analyzeBassAnswerTailTexture(
  notes: readonly NoteEvent[],
  subjectEntries: readonly PlannedEntry[],
  seed?: string,
): BassAnswerTailTextureSummary {
  const firstBassAnswer = subjectEntries.find(isFirstBassAnswerEntry);
  const window =
    firstBassAnswer === undefined ? undefined : summarizeBassAnswerTailTextureWindow(notes, firstBassAnswer, seed);
  const windows = window === undefined ? [] : [window];

  return {
    schemaVersion: 2,
    reviewRequired: windows.some((candidate) => candidate.classification === "review-required"),
    bassOnlyFreeCounterpointWindowCount: windows.filter((candidate) => candidate.bassOnlyFreeCounterpointTicks > 0)
      .length,
    zeroOutsideVoiceWindowCount: windows.filter((candidate) => candidate.zeroOutsideVoiceTicks > 0).length,
    oneOutsideVoiceWindowCount: windows.filter((candidate) => candidate.oneOutsideVoiceTicks > 0).length,
    windows,
  };
}

function isFirstBassAnswerEntry(entry: PlannedEntry): boolean {
  return entry.voice === "bass" && entry.state === "exposition" && entry.form === "answer";
}

function summarizeBassAnswerTailTextureWindow(
  notes: readonly NoteEvent[],
  firstBassAnswer: PlannedEntry,
  seed: string | undefined,
): BassAnswerTailTextureWindow {
  const firstBassAnswerEndTick = firstBassAnswerEnd(notes, firstBassAnswer);
  const firstBassAnswerTailStartTick = firstBassAnswerTailStart(notes, firstBassAnswer);
  const windowEndTick = firstBassAnswerEndTick + TAIL_WINDOW_TICKS;
  let zeroOutsideVoiceTicks = 0;
  let bassOnlyFreeCounterpointTicks = 0;
  let oneOutsideVoiceTicks = 0;
  let minOutsideVoiceCount = Number.POSITIVE_INFINITY;
  const activeOutsideVoices = new Set<Voice>();

  for (let tick = firstBassAnswerTailStartTick; tick < windowEndTick; tick += TICKS_PER_QUARTER / 2) {
    const segmentEndTick = Math.min(windowEndTick, tick + TICKS_PER_QUARTER / 2);
    const activeNotes = notes.filter(
      (note) => note.startTick < segmentEndTick && tick < note.startTick + note.durationTicks,
    );
    const activeVoices = new Set(activeNotes.map((note) => note.voice));
    const outsideVoices = [...activeVoices].filter((voice) => voice !== "bass");
    const segmentTicks = segmentEndTick - tick;

    for (const voice of outsideVoices) {
      activeOutsideVoices.add(voice);
    }
    minOutsideVoiceCount = Math.min(minOutsideVoiceCount, outsideVoices.length);

    if (outsideVoices.length === 0) {
      zeroOutsideVoiceTicks += segmentTicks;
    } else if (outsideVoices.length === 1) {
      oneOutsideVoiceTicks += segmentTicks;
    }
    if (
      activeVoices.size === 1 &&
      activeVoices.has("bass") &&
      activeNotes.some((note) => note.voice === "bass" && note.role === "free-counterpoint")
    ) {
      bassOnlyFreeCounterpointTicks += segmentTicks;
    }
  }

  return {
    seed,
    firstBassAnswerStartTick: firstBassAnswer.startTick,
    firstBassAnswerTailStartTick,
    firstBassAnswerEndTick,
    windowEndTick,
    zeroOutsideVoiceTicks,
    bassOnlyFreeCounterpointTicks,
    oneOutsideVoiceTicks,
    minOutsideVoiceCount: Number.isFinite(minOutsideVoiceCount) ? minOutsideVoiceCount : 0,
    activeOutsideVoices: [...activeOutsideVoices],
    classification:
      zeroOutsideVoiceTicks > 0 || bassOnlyFreeCounterpointTicks > 0 || oneOutsideVoiceTicks >= TICKS_PER_QUARTER * 2
        ? "review-required"
        : "supported-tail",
  };
}

function firstBassAnswerTailStart(notes: readonly NoteEvent[], firstBassAnswer: PlannedEntry): number {
  return Math.min(firstBassAnswerEnd(notes, firstBassAnswer), firstBassAnswer.startTick + TICKS_PER_QUARTER * 4);
}

function firstBassAnswerEnd(notes: readonly NoteEvent[], firstBassAnswer: PlannedEntry): number {
  const answerNotes = notes.filter(
    (note) =>
      note.voice === "bass" &&
      note.role === "answer" &&
      firstBassAnswer.startTick <= note.startTick &&
      note.startTick < firstBassAnswer.startTick + TICKS_PER_QUARTER * 8,
  );
  return Math.max(firstBassAnswer.startTick, ...answerNotes.map((note) => note.startTick + note.durationTicks));
}
