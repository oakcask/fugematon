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
  const firstBassEntry = subjectEntries.find((entry) => entry.voice === "bass" && entry.state === "exposition");
  const firstBassEntryWindow =
    firstBassEntry === undefined ? undefined : summarizeEntryBoundaryContinuityWindow(notes, firstBassEntry);
  const windows = subjectEntries
    .filter((entry) => entry.voice === "bass" && entry.state !== "exposition" && entry.form !== "subject-fragment")
    .map((entry) => summarizeEntryBoundaryContinuityWindow(notes, entry));

  return {
    schemaVersion: 2,
    firstBassEntryWindow,
    firstBassEntrySynchronizedReset:
      firstBassEntryWindow !== undefined &&
      firstBassEntryWindow.outsideOnsetVoices.length >= 3 &&
      firstBassEntryWindow.outsideEndedAtEntryVoices.length >= 3 &&
      firstBassEntryWindow.carriedOutsideVoices.length === 0,
    bassEntryWindowCount: windows.length,
    synchronizedResetCount: windows.filter((window) => window.classification === "synchronized-reset").length,
    continuitySupportedCount: windows.filter((window) => window.classification === "continuity-supported").length,
    windows,
  };
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
