import assert from "node:assert/strict";
import test from "node:test";
import { TICKS_PER_QUARTER } from "./constants.js";
import type { GenerationOutput, NoteEvent, PlannedEntry } from "./events.js";
import { generateScore } from "./generate.js";

const PHASE_14_POST_ENTRY_PHRASE_REVIEW_SEEDS = [
  "angular-answer",
  "modal-dorian",
  "random-listen-check",
  "seed-0zereox-1v729ih",
] as const;

const scoreCache = new Map<string, GenerationOutput>();

test("Phase 14 post-entry review seeds stay clear of long thin support windows after repair", () => {
  const summaries = PHASE_14_POST_ENTRY_PHRASE_REVIEW_SEEDS.map((seed) => ({
    seed,
    windows: collectThinPostEntrySupportWindows(scoreForSeed(seed)),
  }));
  assert.ok(
    summaries.every((summary) => summary.windows.length === 0),
    JSON.stringify(summaries, null, 2),
  );
});

test("Phase 14 free-counterpoint review seeds keep repeated surface phrase signatures below the repaired ceiling", () => {
  const signatureCounts = new Map<string, number>();
  const signatureSeeds = new Map<string, Set<string>>();

  for (const seed of PHASE_14_POST_ENTRY_PHRASE_REVIEW_SEEDS) {
    const seedSignatures = freeCounterpointPhraseSignatures(scoreForSeed(seed));
    for (const signature of seedSignatures) {
      signatureCounts.set(signature, (signatureCounts.get(signature) ?? 0) + 1);
      const seeds = signatureSeeds.get(signature) ?? new Set<string>();
      seeds.add(seed);
      signatureSeeds.set(signature, seeds);
    }
  }

  const repeatedSignatures = [...signatureSeeds.entries()]
    .map(([signature, seeds]) => ({ signature, seedCount: seeds.size, count: signatureCounts.get(signature) ?? 0 }))
    .filter((summary) => summary.seedCount === PHASE_14_POST_ENTRY_PHRASE_REVIEW_SEEDS.length)
    .sort((left, right) => right.count - left.count);

  assert.ok(repeatedSignatures.length >= 5, JSON.stringify(repeatedSignatures.slice(0, 10), null, 2));
  assert.ok(repeatedSignatures[0]?.count !== undefined && repeatedSignatures[0].count <= 55);
});

function scoreForSeed(seed: string): GenerationOutput {
  const cached = scoreCache.get(seed);
  if (cached !== undefined) {
    return cached;
  }
  const output = generateScore({ seed, lengthTicks: TICKS_PER_QUARTER * 288 });
  scoreCache.set(seed, output);
  return output;
}

function collectThinPostEntrySupportWindows(output: GenerationOutput): {
  entryStartTick: number;
  entryVoice: PlannedEntry["voice"];
  form: PlannedEntry["form"];
  state: PlannedEntry["state"];
  maxThinSupportTicks: number;
}[] {
  const notes = output.events.filter((event): event is NoteEvent => event.kind === "note");
  const windows = [];

  for (const entry of output.diagnostics.subjectEntries) {
    if (entry.form !== "answer" && entry.state !== "stretto-like") {
      continue;
    }

    const maxThinSupportTicks = longestThinSupportRunTicks(notes, entry);
    if (maxThinSupportTicks >= TICKS_PER_QUARTER * 4) {
      windows.push({
        entryStartTick: entry.startTick,
        entryVoice: entry.voice,
        form: entry.form,
        state: entry.state,
        maxThinSupportTicks,
      });
    }
  }

  return windows;
}

function longestThinSupportRunTicks(notes: readonly NoteEvent[], entry: PlannedEntry): number {
  const scanStartTick = entry.startTick + TICKS_PER_QUARTER * 2;
  const scanEndTick = scanStartTick + TICKS_PER_QUARTER * 8;
  const stepTicks = TICKS_PER_QUARTER / 2;
  let currentRunTicks = 0;
  let maxRunTicks = 0;

  for (let tick = scanStartTick; tick < scanEndTick; tick += stepTicks) {
    const activeNotes = notes.filter((note) => note.startTick <= tick && tick < note.startTick + note.durationTicks);
    const entryVoiceActive = activeNotes.some((note) => note.voice === entry.voice);
    const outsideVoiceCount = new Set(
      activeNotes.filter((note) => note.voice !== entry.voice).map((note) => note.voice),
    ).size;

    if (entryVoiceActive && outsideVoiceCount <= 1) {
      currentRunTicks += stepTicks;
      maxRunTicks = Math.max(maxRunTicks, currentRunTicks);
    } else {
      currentRunTicks = 0;
    }
  }

  return maxRunTicks;
}

function freeCounterpointPhraseSignatures(output: GenerationOutput): string[] {
  const notesByVoice = new Map<NoteEvent["voice"], NoteEvent[]>();
  const freeCounterpointNotes = output.events
    .filter((event): event is NoteEvent => event.kind === "note" && event.role === "free-counterpoint")
    .sort((left, right) => left.voice.localeCompare(right.voice) || left.startTick - right.startTick);

  for (const note of freeCounterpointNotes) {
    const notes = notesByVoice.get(note.voice) ?? [];
    notes.push(note);
    notesByVoice.set(note.voice, notes);
  }

  return [...notesByVoice.values()].flatMap((voiceNotes) => sixNotePhraseSignatures(voiceNotes));
}

function sixNotePhraseSignatures(notes: readonly NoteEvent[]): string[] {
  const signatures: string[] = [];
  for (let index = 0; index + 5 < notes.length; index += 1) {
    const phrase = notes.slice(index, index + 6);
    const contour = phrase
      .slice(1)
      .map((note, offset) => contourStep(note.pitch, phrase[offset]?.pitch ?? note.pitch))
      .join("");
    const durations = phrase.map((note) => durationClass(note.durationTicks)).join("");
    signatures.push(`${contour}|${durations}`);
  }
  return signatures;
}

function contourStep(currentPitch: number, previousPitch: number): "u" | "d" | "r" {
  if (currentPitch > previousPitch) {
    return "u";
  }
  if (currentPitch < previousPitch) {
    return "d";
  }
  return "r";
}

function durationClass(durationTicks: number): "e" | "q" | "l" {
  if (durationTicks <= TICKS_PER_QUARTER / 2) {
    return "e";
  }
  if (durationTicks <= TICKS_PER_QUARTER) {
    return "q";
  }
  return "l";
}
