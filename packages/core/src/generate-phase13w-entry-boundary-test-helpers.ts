import {
  PHASE_5_11_ROTATION_SEEDS,
  PHASE_5_LENGTH_TICKS,
  PHASE_5_REVIEW_SEEDS,
  TICKS_PER_QUARTER,
} from "./constants.js";
import type { NoteEvent, PlannedEntry, Voice } from "./events.js";
import { generateScore } from "./generate.js";

export const PHASE_13W_FOCUSED_ENTRY_BOUNDARY_SEEDS = [
  "bach-001",
  "fugue-smoke",
  "bright-answer",
  "contrary-answer",
  "dense-modal",
] as const;

export const PHASE_13W_REVIEW_SEEDS = [...PHASE_5_REVIEW_SEEDS, ...PHASE_5_11_ROTATION_SEEDS].map(({ seed }) => seed);
export const PHASE_13W_REVIEW_BATCH_A = PHASE_13W_REVIEW_SEEDS.slice(0, 6);
export const PHASE_13W_REVIEW_BATCH_B = PHASE_13W_REVIEW_SEEDS.slice(6, 12);
export const PHASE_13W_REVIEW_BATCH_C = PHASE_13W_REVIEW_SEEDS.slice(12, 17);
export const PHASE_13W_REVIEW_BATCH_D = PHASE_13W_REVIEW_SEEDS.slice(17);

export type Phase13WEntryBoundaryWindow = {
  seed: string;
  state: PlannedEntry["state"];
  form: PlannedEntry["form"];
  entryVoice: Voice;
  startQuarter: number;
  outsideOnsetVoices: Voice[];
  carriedOutsideVoices: Voice[];
  delayedOutsideVoices: Voice[];
};

export type Phase13WEntryBoundaryMetrics = {
  seedCount: number;
  unpreparedSynchronizedResetSeedCount: number;
  continuitySupportedSeedCount: number;
  windows: Phase13WEntryBoundaryWindow[];
};

export function collectPhase13WEntryBoundaryMetrics(seeds: readonly string[]): Phase13WEntryBoundaryMetrics {
  const windows = seeds.map((seed) => {
    const output = generateScore({ seed, lengthTicks: PHASE_5_LENGTH_TICKS });
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
): Phase13WEntryBoundaryWindow {
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
