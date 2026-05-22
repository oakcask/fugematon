import { TICKS_PER_QUARTER } from "../constants.js";
import type {
  EntryBoundaryContinuitySummary,
  EntryBoundaryContinuityWindow,
  NoteEvent,
  PlannedEntry,
} from "../events.js";
import { VOICE_ENTRY_ORDER } from "./shared.js";

export function analyzeEntryBoundaryContinuity(
  notes: readonly NoteEvent[],
  subjectEntries: readonly PlannedEntry[],
): EntryBoundaryContinuitySummary {
  const firstBassEntry = subjectEntries.find(isFirstBassExpositionEntry);
  const firstBassEntryWindow =
    firstBassEntry === undefined ? undefined : summarizeEntryBoundaryContinuityWindow(notes, firstBassEntry);
  const windows = summarizeEntryBoundaryContinuityWindows(notes, subjectEntries);
  const synchronizedResetCount = countWindowsByClassification(windows, "synchronized-reset");
  const continuitySupportedCount = countWindowsByClassification(windows, "continuity-supported");

  return {
    schemaVersion: 2,
    firstBassEntryWindow,
    firstBassEntrySynchronizedReset: firstBassEntryWindowHasSynchronizedReset(firstBassEntryWindow),
    bassEntryWindowCount: windows.length,
    synchronizedResetCount,
    continuitySupportedCount,
    windows,
  };
}

function summarizeEntryBoundaryContinuityWindows(
  notes: readonly NoteEvent[],
  subjectEntries: readonly PlannedEntry[],
): EntryBoundaryContinuityWindow[] {
  return subjectEntries
    .filter(isReviewedPostExpositionBassEntry)
    .map((entry) => summarizeEntryBoundaryContinuityWindow(notes, entry));
}

function isFirstBassExpositionEntry(entry: PlannedEntry): boolean {
  return entry.voice === "bass" && entry.state === "exposition";
}

function isReviewedPostExpositionBassEntry(entry: PlannedEntry): boolean {
  return entry.voice === "bass" && entry.state !== "exposition" && entry.form !== "subject-fragment";
}

function countWindowsByClassification(
  windows: readonly EntryBoundaryContinuityWindow[],
  classification: EntryBoundaryContinuityWindow["classification"],
): number {
  return windows.filter((window) => window.classification === classification).length;
}

function firstBassEntryWindowHasSynchronizedReset(window: EntryBoundaryContinuityWindow | undefined): boolean {
  return (
    window !== undefined &&
    window.outsideOnsetVoices.length >= 3 &&
    window.outsideEndedAtEntryVoices.length >= 3 &&
    window.carriedOutsideVoices.length === 0
  );
}

function summarizeEntryBoundaryContinuityWindow(
  notes: readonly NoteEvent[],
  entry: PlannedEntry,
): EntryBoundaryContinuityWindow {
  const outsideVoices = VOICE_ENTRY_ORDER.filter((voice) => voice !== entry.voice);
  const outsideOnsetVoices = outsideVoices.filter((voice) =>
    notes.some((note) => note.voice === voice && note.startTick === entry.startTick),
  );
  const outsideEndedAtEntryVoices = outsideVoices.filter((voice) =>
    notes.some((note) => note.voice === voice && note.startTick + note.durationTicks === entry.startTick),
  );
  const carriedOutsideVoices = outsideVoices.filter((voice) =>
    notes.some(
      (note) =>
        note.voice === voice &&
        note.startTick < entry.startTick &&
        entry.startTick < note.startTick + note.durationTicks,
    ),
  );
  const delayedOutsideVoices = outsideVoices.filter((voice) =>
    notes.some(
      (note) =>
        note.voice === voice &&
        entry.startTick < note.startTick &&
        note.startTick <= entry.startTick + TICKS_PER_QUARTER / 2,
    ),
  );
  const classification: "continuity-supported" | "synchronized-reset" =
    outsideOnsetVoices.length >= 3 && carriedOutsideVoices.length === 0 && delayedOutsideVoices.length === 0
      ? "synchronized-reset"
      : "continuity-supported";

  return {
    entryVoice: entry.voice,
    form: entry.form,
    state: entry.state,
    startTick: entry.startTick,
    outsideOnsetVoices,
    outsideEndedAtEntryVoices,
    carriedOutsideVoices,
    delayedOutsideVoices,
    classification,
  };
}
