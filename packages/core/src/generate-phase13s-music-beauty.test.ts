import assert from "node:assert/strict";
import test from "node:test";
import {
  PHASE_5_11_ROTATION_SEEDS,
  PHASE_5_LENGTH_TICKS,
  PHASE_5_REVIEW_SEEDS,
  TICKS_PER_QUARTER,
} from "./constants.js";
import type { GenerationOutput, NoteEvent, Voice } from "./events.js";
import { generateScore } from "./generate.js";

const PHASE_13S_REVIEW_SEEDS = [...PHASE_5_REVIEW_SEEDS, ...PHASE_5_11_ROTATION_SEEDS].map(({ seed }) => seed);

test("generateScore improves Phase 13S subject rhetoric and entry-friction evidence", () => {
  const metrics = collectPhase13SMusicBeautyMetrics();

  assert.equal(metrics.seedCount, 22);
  assert.ok(metrics.uniqueInitialSubjectRhythmPatternCount > 1);
  assert.ok(metrics.uniqueInitialSubjectClimaxIndexCount > 1);
  assert.ok(metrics.topSubjectFragmentFamilyShare <= 0.55);
  assert.ok(metrics.unresolvedEntrySevereIntervalQuarters <= 151);
  assert.ok(metrics.counterSubjectIdentityRetentionTotal >= 18.19);
});

type Phase13SMusicBeautyMetrics = {
  seedCount: number;
  uniqueInitialSubjectRhythmPatternCount: number;
  uniqueInitialSubjectClimaxIndexCount: number;
  topSubjectFragmentFamilyShare: number;
  unresolvedEntrySevereIntervalQuarters: number;
  counterSubjectIdentityRetentionTotal: number;
};

function collectPhase13SMusicBeautyMetrics(): Phase13SMusicBeautyMetrics {
  const rhythmPatterns = new Set<string>();
  const climaxIndexes = new Set<number>();
  const topSubjectFragments = new Map<string, number>();
  let unresolvedEntrySevereIntervalQuarters = 0;
  let counterSubjectIdentityRetentionTotal = 0;

  for (const seed of PHASE_13S_REVIEW_SEEDS) {
    const output = generateScore({ seed, lengthTicks: PHASE_5_LENGTH_TICKS });
    const initialSubject = output.diagnostics.subjectEntries.find((entry) => entry.form === "subject");
    assert.ok(initialSubject);

    rhythmPatterns.add(initialSubjectRhythmPattern(output, initialSubject.voice, initialSubject.startTick));
    climaxIndexes.add(localClimaxIndex(initialSubject.expectedDegreePattern));
    const topSubjectFragment = output.diagnostics.phase12Review.subjectStemFamilies.find(
      (family) => family.form === "subject-fragment",
    );
    if (topSubjectFragment !== undefined) {
      const key = topSubjectFragment.pattern.join("-");
      topSubjectFragments.set(key, (topSubjectFragments.get(key) ?? 0) + 1);
    }
    unresolvedEntrySevereIntervalQuarters += output.diagnostics.qualityVector.entrySevereIntervals.reduce(
      (sum, entry) => sum + entry.unresolvedDurationTicks / TICKS_PER_QUARTER,
      0,
    );
    counterSubjectIdentityRetentionTotal += output.diagnostics.counterSubjectIdentityRetention;
  }

  return {
    seedCount: PHASE_13S_REVIEW_SEEDS.length,
    uniqueInitialSubjectRhythmPatternCount: rhythmPatterns.size,
    uniqueInitialSubjectClimaxIndexCount: climaxIndexes.size,
    topSubjectFragmentFamilyShare: Math.max(...topSubjectFragments.values()) / PHASE_13S_REVIEW_SEEDS.length,
    unresolvedEntrySevereIntervalQuarters,
    counterSubjectIdentityRetentionTotal,
  };
}

function initialSubjectRhythmPattern(output: GenerationOutput, voice: Voice, startTick: number): string {
  const subjectLength = output.diagnostics.subjectEntries.find(
    (entry) => entry.voice === voice && entry.startTick === startTick,
  )?.expectedDegreePattern.length;
  return output.events
    .filter(
      (event): event is NoteEvent =>
        event.kind === "note" && event.role === "subject" && event.voice === voice && event.startTick >= startTick,
    )
    .sort((left, right) => left.startTick - right.startTick || left.pitch - right.pitch)
    .slice(0, subjectLength)
    .map((note) => Math.round(note.durationTicks / TICKS_PER_QUARTER))
    .join("-");
}

function localClimaxIndex(pattern: readonly number[]): number {
  let index = 0;
  let value = pattern[0] ?? 0;
  for (let candidateIndex = 1; candidateIndex < pattern.length; candidateIndex += 1) {
    const candidate = pattern[candidateIndex]!;
    if (candidate > value) {
      index = candidateIndex;
      value = candidate;
    }
  }
  return index;
}
