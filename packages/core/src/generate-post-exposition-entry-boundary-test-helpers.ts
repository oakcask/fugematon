import {
  REPRESENTATIVE_REVIEW_SEEDS,
  REVIEW_LENGTH_TICKS,
  ROTATION_REVIEW_SEEDS,
  TICKS_PER_QUARTER,
} from "./constants.js";
import type { NoteEvent, PlannedEntry, Voice } from "./events.js";
import { cachedGenerateScore as generateScore } from "./generate-test-helpers.js";

export const POST_EXPOSITION_ENTRY_BOUNDARY_FOCUSED_SEEDS = [
  "bach-001",
  "fugue-smoke",
  "bright-answer",
  "contrary-answer",
  "dense-modal",
] as const;

export const POST_EXPOSITION_ENTRY_BOUNDARY_REVIEW_SEEDS = [
  ...REPRESENTATIVE_REVIEW_SEEDS,
  ...ROTATION_REVIEW_SEEDS,
].map(({ seed }) => seed);
export const POST_EXPOSITION_ENTRY_BOUNDARY_REVIEW_BATCH_A = POST_EXPOSITION_ENTRY_BOUNDARY_REVIEW_SEEDS.slice(0, 6);
export const POST_EXPOSITION_ENTRY_BOUNDARY_REVIEW_BATCH_B = POST_EXPOSITION_ENTRY_BOUNDARY_REVIEW_SEEDS.slice(6, 12);
export const POST_EXPOSITION_ENTRY_BOUNDARY_REVIEW_BATCH_C = POST_EXPOSITION_ENTRY_BOUNDARY_REVIEW_SEEDS.slice(12, 17);
export const POST_EXPOSITION_ENTRY_BOUNDARY_REVIEW_BATCH_D = POST_EXPOSITION_ENTRY_BOUNDARY_REVIEW_SEEDS.slice(17);

export type PostExpositionEntryBoundaryWindow = {
  seed: string;
  state: PlannedEntry["state"];
  form: PlannedEntry["form"];
  entryVoice: Voice;
  startQuarter: number;
  outsideOnsetVoices: Voice[];
  carriedOutsideVoices: Voice[];
  delayedOutsideVoices: Voice[];
};

export type PostExpositionEntryBoundaryMetrics = {
  seedCount: number;
  unpreparedSynchronizedResetSeedCount: number;
  continuitySupportedSeedCount: number;
  windows: PostExpositionEntryBoundaryWindow[];
};

export function collectPostExpositionEntryBoundaryMetrics(
  seeds: readonly string[],
): PostExpositionEntryBoundaryMetrics {
  const windows = seeds.map((seed) => {
    const output = generateScore({ seed, lengthTicks: REVIEW_LENGTH_TICKS });
    const notes = output.events.filter((event): event is NoteEvent => event.kind === "note");
    const entry = findFirstBassSubjectOrAnswerEntry(output.diagnostics.subjectEntries);

    return summarizeEntryBoundaryWindow(seed, notes, entry);
  });

  return {
    seedCount: seeds.length,
    unpreparedSynchronizedResetSeedCount: windows.filter(
      (window) =>
        window.outsideOnsetVoices.length >= 3 &&
        window.carriedOutsideVoices.length === 0 &&
        window.delayedOutsideVoices.length === 0,
    ).length,
    continuitySupportedSeedCount: windows.filter(
      (window) => window.carriedOutsideVoices.length > 0 || window.delayedOutsideVoices.length > 0,
    ).length,
    windows,
  };
}

function findFirstBassSubjectOrAnswerEntry(entries: readonly PlannedEntry[]): PlannedEntry {
  const subjectOrAnswerEntry = entries.find(
    (candidate) =>
      candidate.voice === "bass" && candidate.state !== "exposition" && candidate.form !== "subject-fragment",
  );
  const entry =
    subjectOrAnswerEntry ?? entries.find((candidate) => candidate.voice === "bass" && candidate.state !== "exposition");
  if (entry === undefined) {
    throw new Error("missing post-exposition bass entry");
  }

  return entry;
}

function summarizeEntryBoundaryWindow(
  seed: string,
  notes: readonly NoteEvent[],
  entry: PlannedEntry,
): PostExpositionEntryBoundaryWindow {
  const outsideVoices = notes
    .filter((note) => note.voice !== entry.voice && note.startTick === entry.startTick)
    .map((note) => note.voice);
  const carriedOutsideVoices = notes
    .filter(
      (note) =>
        note.voice !== entry.voice &&
        note.startTick < entry.startTick &&
        entry.startTick < note.startTick + note.durationTicks,
    )
    .map((note) => note.voice);
  const delayedOutsideVoices = notes
    .filter(
      (note) =>
        note.voice !== entry.voice &&
        entry.startTick < note.startTick &&
        note.startTick <= entry.startTick + TICKS_PER_QUARTER / 2,
    )
    .map((note) => note.voice);

  return {
    seed,
    state: entry.state,
    form: entry.form,
    entryVoice: entry.voice,
    startQuarter: entry.startTick / TICKS_PER_QUARTER,
    outsideOnsetVoices: [...new Set(outsideVoices)],
    carriedOutsideVoices: [...new Set(carriedOutsideVoices)],
    delayedOutsideVoices: [...new Set(delayedOutsideVoices)],
  };
}
