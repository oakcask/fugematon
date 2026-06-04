import { TICKS_PER_QUARTER } from "../constants.js";
import type {
  EntryBoundaryContinuitySummary,
  EntryBoundaryContinuityWindow,
  NoteEvent,
  PlannedEntry,
  Voice,
} from "../events.js";
import { VOICE_ENTRY_ORDER } from "./shared.js";

export function analyzeEntryBoundaryContinuity(
  notes: readonly NoteEvent[],
  subjectEntries: readonly PlannedEntry[],
): EntryBoundaryContinuitySummary {
  const entryContexts = buildEntryContinuityContexts(notes, subjectEntries);
  const firstBassEntry = entryContexts.find(({ entry }) => isFirstBassExpositionEntry(entry));
  const firstBassEntryWindow =
    firstBassEntry === undefined ? undefined : summarizeEntryBoundaryContinuityWindow(notes, firstBassEntry);
  const windows = summarizeEntryBoundaryContinuityWindows(notes, entryContexts);
  const synchronizedResetCount = countWindowsByClassification(windows, "synchronized-reset");
  const continuitySupportedCount = countWindowsByClassification(windows, "continuity-supported");

  return {
    schemaVersion: 4,
    firstBassEntryWindow,
    firstBassEntrySynchronizedReset: firstBassEntryWindowHasSynchronizedReset(firstBassEntryWindow),
    bassEntryWindowCount: windows.filter(isPostExpositionBassWindow).length,
    importantEntryWindowCount: windows.length,
    nonBassEntryWindowCount: windows.filter((window) => window.entryVoice !== "bass").length,
    synchronizedResetCount,
    continuitySupportedCount,
    oneVoiceCarryWithOutsideResetCount: countWindowsByClassification(windows, "one-voice-carry-with-outside-reset"),
    preparedCollectiveArticulationCount: countWindowsByClassification(windows, "prepared-collective-articulation"),
    unsupportedEntryLocalThinningCount: countWindowsByClassification(windows, "unsupported-entry-local-thinning"),
    windows,
  };
}

function summarizeEntryBoundaryContinuityWindows(
  notes: readonly NoteEvent[],
  entryContexts: readonly EntryContinuityContext[],
): EntryBoundaryContinuityWindow[] {
  return entryContexts
    .filter(isReviewedImportantEntryContext)
    .map((context) => summarizeEntryBoundaryContinuityWindow(notes, context));
}

function isFirstBassExpositionEntry(entry: PlannedEntry): boolean {
  return entry.voice === "bass" && entry.state === "exposition";
}

function isReviewedImportantEntryContext(context: EntryContinuityContext): boolean {
  return (
    context.alreadyEnteredVoices.length > 0 &&
    (context.entry.form !== "subject-fragment" || context.entry.state === "episode")
  );
}

function isPostExpositionBassWindow(window: EntryBoundaryContinuityWindow): boolean {
  return window.entryVoice === "bass" && window.state !== "exposition" && window.form !== "subject-fragment";
}

function countWindowsByClassification(
  windows: readonly EntryBoundaryContinuityWindow[],
  classification: EntryBoundaryContinuityWindow["classification"],
): number {
  return windows.filter((window) => window.classification === classification).length;
}

function firstBassEntryWindowHasSynchronizedReset(window: EntryBoundaryContinuityWindow | undefined): boolean {
  return window?.classification === "synchronized-reset";
}

function summarizeEntryBoundaryContinuityWindow(
  notes: readonly NoteEvent[],
  context: EntryContinuityContext,
): EntryBoundaryContinuityWindow {
  const { entry } = context;
  const outsideVoices = VOICE_ENTRY_ORDER.filter((voice) => voice !== entry.voice);
  const reviewVoices = context.alreadyEnteredVoices.filter((voice) => voice !== entry.voice);
  const outsideVoiceEvidence = summarizeOutsideVoiceEvidence(notes, entry.startTick, outsideVoices);
  const {
    outsideOnsetVoices,
    outsideEndedAtEntryVoices,
    carriedOutsideVoices,
    suspendedOrResolvingOutsideVoices,
    delayedOutsideVoices,
    staggeredContinuationVoices,
  } = outsideVoiceEvidence;
  const preparedCollectiveArticulation =
    reviewVoices.length > 0 &&
    reviewVoices.every((voice) => outsideOnsetVoices.includes(voice)) &&
    !reviewVoices.every((voice) => outsideEndedAtEntryVoices.includes(voice));
  const unsupportedEntryLocalThinning =
    reviewVoices.length > 0 &&
    reviewVoices.every(
      (voice) =>
        !carriedOutsideVoices.includes(voice) &&
        !delayedOutsideVoices.includes(voice) &&
        !staggeredContinuationVoices.includes(voice) &&
        !outsideOnsetVoices.includes(voice),
    );
  const classification = classifyEntryContinuityWindow({
    reviewVoices,
    outsideOnsetVoices,
    outsideEndedAtEntryVoices,
    carriedOutsideVoices,
    delayedOutsideVoices,
    staggeredContinuationVoices,
    preparedCollectiveArticulation,
    unsupportedEntryLocalThinning,
  });

  return {
    entryVoice: entry.voice,
    entryOrderIndex: context.entryOrderIndex,
    form: entry.form,
    state: entry.state,
    startTick: entry.startTick,
    alreadyEnteredVoices: context.alreadyEnteredVoices,
    outsideOnsetVoices,
    outsideEndedAtEntryVoices,
    carriedOutsideVoices,
    suspendedOrResolvingOutsideVoices,
    delayedOutsideVoices,
    staggeredContinuationVoices,
    preparedCollectiveArticulation,
    unsupportedEntryLocalThinning,
    classification,
  };
}

type OutsideVoiceEvidence = {
  outsideOnsetVoices: Voice[];
  outsideEndedAtEntryVoices: Voice[];
  carriedOutsideVoices: Voice[];
  suspendedOrResolvingOutsideVoices: Voice[];
  delayedOutsideVoices: Voice[];
  staggeredContinuationVoices: Voice[];
};

function summarizeOutsideVoiceEvidence(
  notes: readonly NoteEvent[],
  entryStartTick: number,
  outsideVoices: readonly Voice[],
): OutsideVoiceEvidence {
  const outsideOnsetVoices = outsideVoices.filter((voice) =>
    notes.some((note) => note.voice === voice && note.startTick === entryStartTick),
  );
  const outsideEndedAtEntryVoices = outsideVoices.filter((voice) =>
    notes.some((note) => note.voice === voice && note.startTick + note.durationTicks === entryStartTick),
  );
  const carriedOutsideVoices = outsideVoices.filter((voice) =>
    notes.some(
      (note) =>
        note.voice === voice && note.startTick < entryStartTick && entryStartTick < note.startTick + note.durationTicks,
    ),
  );
  const suspendedOrResolvingOutsideVoices = carriedOutsideVoices.filter((voice) =>
    notes.some(
      (note) =>
        note.voice === voice &&
        note.startTick < entryStartTick &&
        entryStartTick < note.startTick + note.durationTicks &&
        note.startTick + note.durationTicks <= entryStartTick + TICKS_PER_QUARTER,
    ),
  );
  const delayedOutsideVoices = outsideVoices.filter((voice) =>
    notes.some(
      (note) =>
        note.voice === voice &&
        entryStartTick < note.startTick &&
        note.startTick <= entryStartTick + TICKS_PER_QUARTER / 2,
    ),
  );
  const staggeredContinuationVoices = outsideVoices.filter((voice) =>
    notes.some(
      (note) =>
        note.voice === voice &&
        entryStartTick + TICKS_PER_QUARTER / 2 < note.startTick &&
        note.startTick <= entryStartTick + TICKS_PER_QUARTER,
    ),
  );

  return {
    outsideOnsetVoices,
    outsideEndedAtEntryVoices,
    carriedOutsideVoices,
    suspendedOrResolvingOutsideVoices,
    delayedOutsideVoices,
    staggeredContinuationVoices,
  };
}

type EntryContinuityContext = {
  entry: PlannedEntry;
  entryOrderIndex: number;
  alreadyEnteredVoices: Voice[];
};

function buildEntryContinuityContexts(
  notes: readonly NoteEvent[],
  subjectEntries: readonly PlannedEntry[],
): EntryContinuityContext[] {
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

function uniqueVoices(voices: readonly Voice[]): Voice[] {
  return VOICE_ENTRY_ORDER.filter((voice) => voices.includes(voice));
}

function classifyEntryContinuityWindow(input: {
  reviewVoices: readonly Voice[];
  outsideOnsetVoices: readonly Voice[];
  outsideEndedAtEntryVoices: readonly Voice[];
  carriedOutsideVoices: readonly Voice[];
  delayedOutsideVoices: readonly Voice[];
  staggeredContinuationVoices: readonly Voice[];
  preparedCollectiveArticulation: boolean;
  unsupportedEntryLocalThinning: boolean;
}): EntryBoundaryContinuityWindow["classification"] {
  if (
    input.reviewVoices.length >= 2 &&
    input.reviewVoices.every((voice) => input.outsideOnsetVoices.includes(voice)) &&
    input.reviewVoices.every((voice) => input.outsideEndedAtEntryVoices.includes(voice)) &&
    input.carriedOutsideVoices.length === 0 &&
    input.delayedOutsideVoices.length === 0 &&
    input.staggeredContinuationVoices.length === 0
  ) {
    return "synchronized-reset";
  }
  if (
    input.reviewVoices.length >= 2 &&
    input.carriedOutsideVoices.length === 1 &&
    input.reviewVoices.filter((voice) => input.outsideOnsetVoices.includes(voice)).length >= 2 &&
    input.reviewVoices.filter((voice) => input.outsideEndedAtEntryVoices.includes(voice)).length >= 2
  ) {
    return "one-voice-carry-with-outside-reset";
  }
  if (input.preparedCollectiveArticulation) {
    return "prepared-collective-articulation";
  }
  if (input.unsupportedEntryLocalThinning) {
    return "unsupported-entry-local-thinning";
  }
  return "continuity-supported";
}
