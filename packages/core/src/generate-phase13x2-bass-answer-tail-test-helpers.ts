import assert from "node:assert/strict";
import {
  PHASE_5_11_ROTATION_SEEDS,
  PHASE_5_LENGTH_TICKS,
  PHASE_5_REVIEW_SEEDS,
  TICKS_PER_QUARTER,
} from "./constants.js";
import type { NoteEvent, PlannedEntry, Voice } from "./events.js";
import { generateScore } from "./generate.js";

export const PHASE_13X2_BASS_ANSWER_TAIL_REVIEW_SEEDS = [...PHASE_5_REVIEW_SEEDS, ...PHASE_5_11_ROTATION_SEEDS].map(
  ({ seed }) => seed,
);

export const PHASE_13X2_BASS_ANSWER_TAIL_REVIEW_BATCH_A = PHASE_13X2_BASS_ANSWER_TAIL_REVIEW_SEEDS.slice(0, 6);
export const PHASE_13X2_BASS_ANSWER_TAIL_REVIEW_BATCH_B = PHASE_13X2_BASS_ANSWER_TAIL_REVIEW_SEEDS.slice(6, 12);
export const PHASE_13X2_BASS_ANSWER_TAIL_REVIEW_BATCH_C = PHASE_13X2_BASS_ANSWER_TAIL_REVIEW_SEEDS.slice(12, 17);
export const PHASE_13X2_BASS_ANSWER_TAIL_REVIEW_BATCH_D = PHASE_13X2_BASS_ANSWER_TAIL_REVIEW_SEEDS.slice(17);

type BassAnswerTailWindow = {
  seed: string;
  firstBassAnswerStartTick: number;
  firstBassAnswerEndTick: number;
  windowEndTick: number;
  bassOnlyFreeCounterpointTicks: number;
  oneOrZeroOutsideVoiceTicks: number;
  minOutsideVoiceCount: number;
  outsideVoices: readonly Voice[];
};

export type Phase13X2BassAnswerTailMetrics = {
  seedCount: number;
  bassOnlyFreeCounterpointSeedCount: number;
  oneOrZeroOutsideVoiceSeedCount: number;
  windows: BassAnswerTailWindow[];
};

const TAIL_WINDOW_TICKS = TICKS_PER_QUARTER * 9;

export function collectPhase13X2BassAnswerTailMetrics(seeds: readonly string[]): Phase13X2BassAnswerTailMetrics {
  const windows = seeds.map((seed) => {
    const output = generateScore({ seed, lengthTicks: PHASE_5_LENGTH_TICKS });
    const notes = output.events.filter((event): event is NoteEvent => event.kind === "note");
    const firstBassAnswer = output.diagnostics.subjectEntries.find(isFirstBassAnswerEntry);
    assert.ok(firstBassAnswer !== undefined, `${seed} should expose the first bass answer`);

    return summarizeBassAnswerTailWindow(seed, notes, firstBassAnswer);
  });

  return {
    seedCount: seeds.length,
    bassOnlyFreeCounterpointSeedCount: windows.filter((window) => window.bassOnlyFreeCounterpointTicks > 0).length,
    oneOrZeroOutsideVoiceSeedCount: windows.filter((window) => window.oneOrZeroOutsideVoiceTicks > 0).length,
    windows,
  };
}

export function assertPhase13X2CurrentBassAnswerTailEvidence(
  seeds: readonly string[],
  expected: {
    bassOnlySeeds: readonly string[];
    oneOrZeroOutsideSeeds: readonly string[];
  },
): void {
  const metrics = collectPhase13X2BassAnswerTailMetrics(seeds);
  const bassOnlySeeds = metrics.windows
    .filter((window) => window.bassOnlyFreeCounterpointTicks > 0)
    .map((window) => window.seed);
  const oneOrZeroOutsideSeeds = metrics.windows
    .filter((window) => window.oneOrZeroOutsideVoiceTicks > 0)
    .map((window) => window.seed);

  assert.equal(metrics.seedCount, seeds.length);
  assert.deepEqual(bassOnlySeeds, expected.bassOnlySeeds);
  assert.equal(metrics.bassOnlyFreeCounterpointSeedCount, expected.bassOnlySeeds.length);
  assert.deepEqual(oneOrZeroOutsideSeeds, expected.oneOrZeroOutsideSeeds);
  assert.equal(metrics.oneOrZeroOutsideVoiceSeedCount, expected.oneOrZeroOutsideSeeds.length);
}

function isFirstBassAnswerEntry(entry: PlannedEntry): boolean {
  return entry.voice === "bass" && entry.state === "exposition" && entry.form === "answer";
}

function summarizeBassAnswerTailWindow(
  seed: string,
  notes: readonly NoteEvent[],
  firstBassAnswer: PlannedEntry,
): BassAnswerTailWindow {
  const firstBassAnswerEndTick = firstBassAnswerEnd(notes, firstBassAnswer);
  const windowEndTick = firstBassAnswerEndTick + TAIL_WINDOW_TICKS;
  let bassOnlyFreeCounterpointTicks = 0;
  let oneOrZeroOutsideVoiceTicks = 0;
  let minOutsideVoiceCount = Number.POSITIVE_INFINITY;
  const outsideVoices = new Set<Voice>();

  for (let tick = firstBassAnswerEndTick; tick < windowEndTick; tick += TICKS_PER_QUARTER / 2) {
    const segmentEndTick = Math.min(windowEndTick, tick + TICKS_PER_QUARTER / 2);
    const activeNotes = notes.filter(
      (note) => note.startTick < segmentEndTick && tick < note.startTick + note.durationTicks,
    );
    const activeVoices = new Set(activeNotes.map((note) => note.voice));
    const activeOutsideVoices = [...activeVoices].filter((voice) => voice !== "bass");
    const segmentTicks = segmentEndTick - tick;

    for (const voice of activeOutsideVoices) {
      outsideVoices.add(voice);
    }
    minOutsideVoiceCount = Math.min(minOutsideVoiceCount, activeOutsideVoices.length);

    if (
      activeVoices.size === 1 &&
      activeVoices.has("bass") &&
      activeNotes.some((note) => note.voice === "bass" && note.role === "free-counterpoint")
    ) {
      bassOnlyFreeCounterpointTicks += segmentTicks;
    }
    if (activeOutsideVoices.length <= 1) {
      oneOrZeroOutsideVoiceTicks += segmentTicks;
    }
  }

  return {
    seed,
    firstBassAnswerStartTick: firstBassAnswer.startTick,
    firstBassAnswerEndTick,
    windowEndTick,
    bassOnlyFreeCounterpointTicks,
    oneOrZeroOutsideVoiceTicks,
    minOutsideVoiceCount: Number.isFinite(minOutsideVoiceCount) ? minOutsideVoiceCount : 0,
    outsideVoices: [...outsideVoices],
  };
}

function firstBassAnswerEnd(notes: readonly NoteEvent[], firstBassAnswer: PlannedEntry): number {
  const answerNotes = notes.filter(
    (note) =>
      note.voice === "bass" &&
      note.role === "answer" &&
      firstBassAnswer.startTick <= note.startTick &&
      note.startTick < firstBassAnswer.startTick + TICKS_PER_QUARTER * 8,
  );
  assert.ok(answerNotes.length > 0, "first bass answer should have answer notes");

  return Math.max(...answerNotes.map((note) => note.startTick + note.durationTicks));
}
