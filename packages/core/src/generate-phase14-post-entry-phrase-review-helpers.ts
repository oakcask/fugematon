import assert from "node:assert/strict";
import { PHASE_5_11_ROTATION_SEEDS, PHASE_5_REVIEW_SEEDS, TICKS_PER_QUARTER } from "./constants.js";
import type { EntryForm, NoteEvent, PlannedEntry, Voice } from "./events.js";
import { generateScore } from "./generate.js";

export const PHASE_14_POST_ENTRY_PHRASE_REVIEW_SEEDS = [
  ...PHASE_5_REVIEW_SEEDS,
  ...PHASE_5_11_ROTATION_SEEDS,
  { seed: "random-listen-check", category: "ad-hoc-listening" },
  { seed: "seed-0zereox-1v729ih", category: "user-reported" },
] as const;

export const PHASE_14_POST_ENTRY_PHRASE_REVIEW_BATCH_A = PHASE_14_POST_ENTRY_PHRASE_REVIEW_SEEDS.slice(0, 8).map(
  ({ seed }) => seed,
);
export const PHASE_14_POST_ENTRY_PHRASE_REVIEW_BATCH_B = PHASE_14_POST_ENTRY_PHRASE_REVIEW_SEEDS.slice(8, 16).map(
  ({ seed }) => seed,
);
export const PHASE_14_POST_ENTRY_PHRASE_REVIEW_BATCH_C = PHASE_14_POST_ENTRY_PHRASE_REVIEW_SEEDS.slice(16).map(
  ({ seed }) => seed,
);

type PostEntrySupportWindow = {
  seed: string;
  entryVoice: Voice;
  form: EntryForm;
  state: PlannedEntry["state"];
  entryStartTick: number;
  reviewStartTick: number;
  longestThinSupportTicks: number;
  thinSupportTicks: number;
  minOutsideSupportVoiceCount: number;
};

type PhraseSignatureSummary = {
  signature: string;
  seedCount: number;
  occurrenceCount: number;
  seeds: readonly string[];
};

export type Phase14PostEntryPhrasePressure = {
  seedCount: number;
  reviewedPostEntryWindowCount: number;
  fourQuarterThinSupportWindowCount: number;
  topFreeCounterpointPhraseSignature: PhraseSignatureSummary | undefined;
  postEntryWindows: readonly PostEntrySupportWindow[];
};

const PHASE_14_REVIEW_LENGTH_TICKS = TICKS_PER_QUARTER * 288;
const POST_ENTRY_REVIEW_WINDOW_TICKS = TICKS_PER_QUARTER * 7;
const THIN_SUPPORT_SEGMENT_TICKS = TICKS_PER_QUARTER / 2;
const THIN_SUPPORT_REVIEW_THRESHOLD_TICKS = TICKS_PER_QUARTER * 4;
const PHRASE_SIGNATURE_NOTE_COUNT = 6;

export function collectPhase14PostEntryPhrasePressure(seeds: readonly string[]): Phase14PostEntryPhrasePressure {
  const postEntryWindows: PostEntrySupportWindow[] = [];
  const signatureSeeds = new Map<string, Set<string>>();
  const signatureCounts = new Map<string, number>();

  for (const seed of seeds) {
    const output = generateScore({ seed, lengthTicks: PHASE_14_REVIEW_LENGTH_TICKS });
    const notes = output.events.filter((event): event is NoteEvent => event.kind === "note");
    postEntryWindows.push(...collectPostEntrySupportWindows(seed, notes, output.diagnostics.subjectEntries));
    for (const signature of collectFreeCounterpointPhraseSignatures(notes)) {
      signatureSeeds.set(signature, (signatureSeeds.get(signature) ?? new Set()).add(seed));
      signatureCounts.set(signature, (signatureCounts.get(signature) ?? 0) + 1);
    }
  }

  const phraseSignatures = [...signatureSeeds.entries()]
    .map(([signature, seedSet]) => ({
      signature,
      seedCount: seedSet.size,
      occurrenceCount: signatureCounts.get(signature) ?? 0,
      seeds: [...seedSet].sort(),
    }))
    .sort(
      (left, right) =>
        right.seedCount - left.seedCount ||
        right.occurrenceCount - left.occurrenceCount ||
        left.signature.localeCompare(right.signature),
    );

  return {
    seedCount: seeds.length,
    reviewedPostEntryWindowCount: postEntryWindows.length,
    fourQuarterThinSupportWindowCount: postEntryWindows.filter(
      (window) => window.longestThinSupportTicks >= THIN_SUPPORT_REVIEW_THRESHOLD_TICKS,
    ).length,
    topFreeCounterpointPhraseSignature: phraseSignatures[0],
    postEntryWindows,
  };
}

export function assertPhase14PostEntryPhrasePressureIsObservable(
  seeds: readonly string[],
  expectation: {
    minReviewedPostEntryWindowCount: number;
    minFourQuarterThinSupportWindowCount: number;
    minTopPhraseSignatureSeedCount: number;
  },
): void {
  const pressure = collectPhase14PostEntryPhrasePressure(seeds);

  assert.equal(pressure.seedCount, seeds.length);
  assert.ok(
    pressure.reviewedPostEntryWindowCount >= expectation.minReviewedPostEntryWindowCount,
    JSON.stringify(pressure, null, 2),
  );
  assert.ok(
    pressure.fourQuarterThinSupportWindowCount >= expectation.minFourQuarterThinSupportWindowCount,
    JSON.stringify(pressure, null, 2),
  );
  assert.ok(pressure.topFreeCounterpointPhraseSignature !== undefined, JSON.stringify(pressure, null, 2));
  assert.ok(
    pressure.topFreeCounterpointPhraseSignature.seedCount >= expectation.minTopPhraseSignatureSeedCount,
    JSON.stringify(pressure, null, 2),
  );
  assert.ok(
    pressure.postEntryWindows.every(
      (window) =>
        window.seed.length > 0 &&
        window.reviewStartTick > window.entryStartTick &&
        window.minOutsideSupportVoiceCount >= 0,
    ),
    JSON.stringify(pressure, null, 2),
  );
}

function collectPostEntrySupportWindows(
  seed: string,
  notes: readonly NoteEvent[],
  entries: readonly PlannedEntry[],
): PostEntrySupportWindow[] {
  return entries
    .filter(isPhase14PostEntrySupportReviewEntry)
    .map((entry) => summarizePostEntrySupportWindow(seed, notes, entry))
    .filter((window) => window.reviewStartTick > window.entryStartTick);
}

function isPhase14PostEntrySupportReviewEntry(entry: PlannedEntry): boolean {
  return entry.state !== "exposition" && (entry.form === "answer" || entry.state === "stretto-like");
}

function summarizePostEntrySupportWindow(
  seed: string,
  notes: readonly NoteEvent[],
  entry: PlannedEntry,
): PostEntrySupportWindow {
  const reviewStartTick = entryLineEndTick(notes, entry);
  const reviewEndTick = reviewStartTick + POST_ENTRY_REVIEW_WINDOW_TICKS;
  let thinSupportTicks = 0;
  let currentThinSupportTicks = 0;
  let longestThinSupportTicks = 0;
  let minOutsideSupportVoiceCount = Number.POSITIVE_INFINITY;

  for (let tick = reviewStartTick; tick < reviewEndTick; tick += THIN_SUPPORT_SEGMENT_TICKS) {
    const segmentEndTick = Math.min(reviewEndTick, tick + THIN_SUPPORT_SEGMENT_TICKS);
    const outsideSupportVoiceCount = outsideSupportVoicesDuring(notes, entry.voice, tick, segmentEndTick).length;
    minOutsideSupportVoiceCount = Math.min(minOutsideSupportVoiceCount, outsideSupportVoiceCount);
    if (outsideSupportVoiceCount <= 1) {
      const segmentTicks = segmentEndTick - tick;
      thinSupportTicks += segmentTicks;
      currentThinSupportTicks += segmentTicks;
      longestThinSupportTicks = Math.max(longestThinSupportTicks, currentThinSupportTicks);
    } else {
      currentThinSupportTicks = 0;
    }
  }

  return {
    seed,
    entryVoice: entry.voice,
    form: entry.form,
    state: entry.state,
    entryStartTick: entry.startTick,
    reviewStartTick,
    longestThinSupportTicks,
    thinSupportTicks,
    minOutsideSupportVoiceCount: Number.isFinite(minOutsideSupportVoiceCount) ? minOutsideSupportVoiceCount : 0,
  };
}

function entryLineEndTick(notes: readonly NoteEvent[], entry: PlannedEntry): number {
  const entryNotes = notes.filter(
    (note) =>
      note.voice === entry.voice &&
      note.role === entry.form &&
      entry.startTick <= note.startTick &&
      note.startTick < entry.startTick + TICKS_PER_QUARTER * 8,
  );
  if (entryNotes.length === 0) {
    return entry.startTick;
  }
  return Math.max(...entryNotes.map((note) => note.startTick + note.durationTicks));
}

function outsideSupportVoicesDuring(
  notes: readonly NoteEvent[],
  entryVoice: Voice,
  startTick: number,
  endTick: number,
): Voice[] {
  return [
    ...new Set(
      notes
        .filter((note) => note.voice !== entryVoice)
        .filter((note) => note.role === "counter-subject" || note.role === "free-counterpoint")
        .filter((note) => note.startTick < endTick && startTick < note.startTick + note.durationTicks)
        .map((note) => note.voice),
    ),
  ];
}

function collectFreeCounterpointPhraseSignatures(notes: readonly NoteEvent[]): string[] {
  const signatures: string[] = [];
  const freeCounterpointByVoice = new Map<Voice, NoteEvent[]>();
  for (const note of notes) {
    if (note.role !== "free-counterpoint") {
      continue;
    }
    const voiceNotes = freeCounterpointByVoice.get(note.voice) ?? [];
    voiceNotes.push(note);
    freeCounterpointByVoice.set(note.voice, voiceNotes);
  }

  for (const [voice, voiceNotes] of freeCounterpointByVoice.entries()) {
    const sortedNotes = [...voiceNotes].sort((left, right) => left.startTick - right.startTick);
    for (let index = 0; index + PHRASE_SIGNATURE_NOTE_COUNT <= sortedNotes.length; index += 1) {
      const phraseNotes = sortedNotes.slice(index, index + PHRASE_SIGNATURE_NOTE_COUNT);
      if (!isCompactPhraseSignatureWindow(phraseNotes)) {
        continue;
      }
      signatures.push(`${voice}:${phraseSignature(phraseNotes)}`);
    }
  }

  return signatures;
}

function isCompactPhraseSignatureWindow(notes: readonly NoteEvent[]): boolean {
  for (let index = 1; index < notes.length; index += 1) {
    const previous = notes[index - 1]!;
    const current = notes[index]!;
    if (current.startTick !== previous.startTick + previous.durationTicks) {
      return false;
    }
  }
  return notes.every((note) => note.durationTicks <= TICKS_PER_QUARTER);
}

function phraseSignature(notes: readonly NoteEvent[]): string {
  const contour = notes
    .slice(1)
    .map((note, index) => contourStep(notes[index]!.pitch, note.pitch))
    .join("");
  const durations = notes.map((note) => note.durationTicks).join(".");
  const intents = notes.map((note) => note.metricalHarmonyIntent ?? "none").join(".");
  return `${contour}|${durations}|${intents}`;
}

function contourStep(previousPitch: number, pitch: number): string {
  if (pitch > previousPitch) {
    return "u";
  }
  if (pitch < previousPitch) {
    return "d";
  }
  return "r";
}
