import { TICKS_PER_QUARTER } from "../constants.js";
import type {
  EntryForm,
  ImportantEntryTailTextureSummary,
  ImportantEntryTailTextureWindow,
  NoteEvent,
  PlannedEntry,
  Voice,
} from "../events.js";
import { VOICE_ENTRY_ORDER } from "./shared.js";

const HALF_BEAT_TICKS = TICKS_PER_QUARTER / 2;
const ENTRY_TAIL_EXTENSION_TICKS = TICKS_PER_QUARTER * 4;
const ENTRY_SCAN_TICKS = TICKS_PER_QUARTER * 8;

export function analyzeImportantEntryTailTexture(
  notes: readonly NoteEvent[],
  subjectEntries: readonly PlannedEntry[],
  sectionEndTick = scoreEndTick(notes),
): ImportantEntryTailTextureSummary {
  const windows = buildEntryTailTextureContexts(notes, subjectEntries)
    .filter(isReviewedImportantEntryContext)
    .map((context) => summarizeImportantEntryTailTextureWindow(notes, context, sectionEndTick))
    .filter((window) => window.windowEndTick > window.entryStartTick);

  return {
    schemaVersion: 1,
    reviewRequired: windows.some((window) => window.classification !== "supported-tail"),
    importantEntryWindowCount: windows.length,
    zeroOutsideVoiceWindowCount: windows.filter((window) => window.zeroOutsideVoiceTicks > 0).length,
    oneOutsideVoiceWindowCount: windows.filter((window) => window.oneOutsideVoiceTicks > 0).length,
    supportedTailWindowCount: windows.filter((window) => window.classification === "supported-tail").length,
    windows,
  };
}

function summarizeImportantEntryTailTextureWindow(
  notes: readonly NoteEvent[],
  context: EntryTailTextureContext,
  sectionEndTick: number,
): ImportantEntryTailTextureWindow {
  const entryEndTick = importantEntryEndTick(notes, context.entry);
  const windowEndTick = Math.min(sectionEndTick, entryEndTick + ENTRY_TAIL_EXTENSION_TICKS);
  const supportVoices = uniqueVoices([
    ...context.alreadyEnteredVoices,
    ...notes
      .filter(
        (note) =>
          note.voice !== context.entry.voice &&
          context.entry.startTick <= note.startTick &&
          note.startTick < entryEndTick,
      )
      .map((note) => note.voice),
  ]);
  let zeroOutsideVoiceTicks = 0;
  let oneOutsideVoiceTicks = 0;
  let minOutsideVoiceCount = Number.POSITIVE_INFINITY;
  const activeOutsideVoices = new Set<Voice>();

  for (let tick = context.entry.startTick; tick < windowEndTick; tick += HALF_BEAT_TICKS) {
    const segmentEndTick = Math.min(windowEndTick, tick + HALF_BEAT_TICKS);
    if (!isVoiceActiveDuring(notes, context.entry.voice, tick, segmentEndTick)) {
      continue;
    }

    const outsideVoices = activeOutsideVoicesDuring(notes, context.entry.voice, supportVoices, tick, segmentEndTick);
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
  }

  return {
    entryVoice: context.entry.voice,
    entryOrderIndex: context.entryOrderIndex,
    form: context.entry.form,
    state: context.entry.state,
    entryStartTick: context.entry.startTick,
    entryEndTick,
    windowEndTick,
    alreadyEnteredVoices: context.alreadyEnteredVoices,
    zeroOutsideVoiceTicks,
    oneOutsideVoiceTicks,
    minOutsideVoiceCount: Number.isFinite(minOutsideVoiceCount) ? minOutsideVoiceCount : 0,
    activeOutsideVoices: [...activeOutsideVoices],
    classification:
      zeroOutsideVoiceTicks > 0
        ? "zero-outside-tail"
        : oneOutsideVoiceTicks > TICKS_PER_QUARTER * 2
          ? "one-outside-tail"
          : "supported-tail",
  };
}

function activeOutsideVoicesDuring(
  notes: readonly NoteEvent[],
  entryVoice: Voice,
  alreadyEnteredVoices: readonly Voice[],
  startTick: number,
  endTick: number,
): Voice[] {
  return alreadyEnteredVoices.filter(
    (voice) =>
      voice !== entryVoice &&
      notes.some(
        (note) => note.voice === voice && note.startTick < endTick && startTick < note.startTick + note.durationTicks,
      ),
  );
}

function isVoiceActiveDuring(notes: readonly NoteEvent[], voice: Voice, startTick: number, endTick: number): boolean {
  return notes.some(
    (note) => note.voice === voice && note.startTick < endTick && startTick < note.startTick + note.durationTicks,
  );
}

function importantEntryEndTick(notes: readonly NoteEvent[], entry: PlannedEntry): number {
  const role = noteRoleForEntryForm(entry.form);
  const entryNotes = notes.filter(
    (note) =>
      note.voice === entry.voice &&
      note.role === role &&
      entry.startTick <= note.startTick &&
      note.startTick < entry.startTick + ENTRY_SCAN_TICKS,
  );
  return Math.max(entry.startTick, ...entryNotes.map((note) => note.startTick + note.durationTicks));
}

type EntryTailTextureContext = {
  entry: PlannedEntry;
  entryOrderIndex: number;
  alreadyEnteredVoices: Voice[];
};

function buildEntryTailTextureContexts(
  notes: readonly NoteEvent[],
  subjectEntries: readonly PlannedEntry[],
): EntryTailTextureContext[] {
  const importantEntries = [...subjectEntries].sort((left, right) => left.startTick - right.startTick);

  return importantEntries.map((entry, entryOrderIndex) => {
    const previousEntryVoices = importantEntries
      .slice(0, entryOrderIndex)
      .filter((candidate) => candidate.startTick < entry.startTick)
      .map((candidate) => candidate.voice);
    const previousNoteVoices = notes.filter((note) => note.startTick < entry.startTick).map((note) => note.voice);

    return {
      entry,
      entryOrderIndex,
      alreadyEnteredVoices: uniqueVoices([...previousEntryVoices, ...previousNoteVoices]).filter(
        (voice) => voice !== entry.voice,
      ),
    };
  });
}

function isReviewedImportantEntryContext(context: EntryTailTextureContext): boolean {
  return (
    context.alreadyEnteredVoices.length > 0 &&
    (context.entry.form !== "subject-fragment" || context.entry.state === "episode")
  );
}

function uniqueVoices(voices: readonly Voice[]): Voice[] {
  return VOICE_ENTRY_ORDER.filter((voice) => voices.includes(voice));
}

function scoreEndTick(notes: readonly NoteEvent[]): number {
  return Math.max(0, ...notes.map((note) => note.startTick + note.durationTicks));
}

function noteRoleForEntryForm(form: EntryForm): NoteEvent["role"] {
  if (form === "answer") {
    return "answer";
  }
  if (form === "subject-fragment") {
    return "subject-fragment";
  }
  return "subject";
}
