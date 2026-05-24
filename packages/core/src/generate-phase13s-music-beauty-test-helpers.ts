import assert from "node:assert/strict";
import {
  REPRESENTATIVE_REVIEW_SEEDS,
  REVIEW_LENGTH_TICKS,
  ROTATION_REVIEW_SEEDS,
  TICKS_PER_QUARTER,
} from "./constants.js";
import type { GenerationOutput, NoteEvent, Voice } from "./events.js";
import { generateScore } from "./generate.js";

const SCORE_BEAUTY_REVIEW_SEEDS = [...REPRESENTATIVE_REVIEW_SEEDS, ...ROTATION_REVIEW_SEEDS].map(({ seed }) => seed);

export const SCORE_BEAUTY_REVIEW_BATCHES = {
  first: SCORE_BEAUTY_REVIEW_SEEDS.slice(0, 4),
  second: SCORE_BEAUTY_REVIEW_SEEDS.slice(4, 8),
  third: SCORE_BEAUTY_REVIEW_SEEDS.slice(8, 12),
  fourth: SCORE_BEAUTY_REVIEW_SEEDS.slice(12, 16),
  fifth: SCORE_BEAUTY_REVIEW_SEEDS.slice(16, 19),
  sixth: SCORE_BEAUTY_REVIEW_SEEDS.slice(19),
} as const;

export type ScoreBeautyReviewMetrics = {
  seedCount: number;
  uniqueInitialSubjectRhythmPatternCount: number;
  uniqueInitialSubjectClimaxIndexCount: number;
  topSubjectFragmentFamilyShare: number;
  unresolvedEntrySevereIntervalQuarters: number;
  counterSubjectIdentityRetentionTotal: number;
};

export type CurrentBeautyBlockerMetrics = {
  seedCount: number;
  durationBasedLockstepReviewSeedCount: number;
  pitchClassUnisonReviewSeedCount: number;
  unresolvedEntrySevereIntervalSentinelCount: number;
  classifiedEntrySonorityCount: number;
  fragmentFunctionEvidenceTotal: number;
  recognizableOrAlteredCounterSubjectWindowCount: number;
  functionAwareLockstepSeedCount: number;
  topSubjectFragmentFamilyShare: number;
  lowModalCounterSubjectIdentitySeedCount: number;
};

export function collectScoreBeautyReviewMetrics(seeds: readonly string[]): ScoreBeautyReviewMetrics {
  const rhythmPatterns = new Set<string>();
  const climaxIndexes = new Set<number>();
  const topSubjectFragments = new Map<string, number>();
  let unresolvedEntrySevereIntervalQuarters = 0;
  let counterSubjectIdentityRetentionTotal = 0;

  for (const seed of seeds) {
    const output = generateScore({ seed, lengthTicks: REVIEW_LENGTH_TICKS });
    const initialSubject = output.diagnostics.subjectEntries.find((entry) => entry.form === "subject");
    assert.ok(initialSubject);

    rhythmPatterns.add(initialSubjectRhythmPattern(output, initialSubject.voice, initialSubject.startTick));
    climaxIndexes.add(localClimaxIndex(initialSubject.expectedDegreePattern));
    const topSubjectFragment = output.diagnostics.phraseRepetitionReview.subjectStemFamilies.find(
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
    seedCount: seeds.length,
    uniqueInitialSubjectRhythmPatternCount: rhythmPatterns.size,
    uniqueInitialSubjectClimaxIndexCount: climaxIndexes.size,
    topSubjectFragmentFamilyShare: Math.max(0, ...topSubjectFragments.values()) / seeds.length,
    unresolvedEntrySevereIntervalQuarters,
    counterSubjectIdentityRetentionTotal,
  };
}

export function collectCurrentBeautyBlockerMetrics(seeds: readonly string[]): CurrentBeautyBlockerMetrics {
  const topSubjectFragments = new Map<string, number>();
  let durationBasedLockstepReviewSeedCount = 0;
  let pitchClassUnisonReviewSeedCount = 0;
  let unresolvedEntrySevereIntervalSentinelCount = 0;
  let classifiedEntrySonorityCount = 0;
  let fragmentFunctionEvidenceTotal = 0;
  let recognizableOrAlteredCounterSubjectWindowCount = 0;
  let functionAwareLockstepSeedCount = 0;
  let lowModalCounterSubjectIdentitySeedCount = 0;

  for (const seed of seeds) {
    const output = generateScore({ seed, lengthTicks: REVIEW_LENGTH_TICKS });
    const axes = new Map(output.diagnostics.qualityVector.axes.map((axis) => [axis.axis, axis]));
    if (axes.get("durationBasedLockstep")?.status === "review-required") {
      durationBasedLockstepReviewSeedCount += 1;
    }
    if (axes.get("pitchClassUnisonDuration")?.status === "review-required") {
      pitchClassUnisonReviewSeedCount += 1;
    }
    unresolvedEntrySevereIntervalSentinelCount += output.diagnostics.qualityVector.localSentinels.filter(
      (sentinel) => sentinel.kind === "unresolved-entry-severe-interval",
    ).length;
    classifiedEntrySonorityCount += output.diagnostics.qualityVector.entrySonorities.filter(
      (sonority) => sonority.kinds.length > 0,
    ).length;
    fragmentFunctionEvidenceTotal += output.diagnostics.qualityVector.fragmentFunctionEvidence.uniqueFunctionCount;
    recognizableOrAlteredCounterSubjectWindowCount += output.diagnostics.qualityVector.counterSubjectWindows.filter(
      (window) => window.retentionKind === "recognizable" || window.retentionKind === "altered",
    ).length;
    if (
      output.diagnostics.qualityVector.voicePairFunctions.some(
        (summary) =>
          summary.subjectSupportLockstepTicks +
            summary.cadenceSupportLockstepTicks +
            summary.sequencePatternLockstepTicks +
            summary.pedalLikeSupportLockstepTicks >
          0,
      )
    ) {
      functionAwareLockstepSeedCount += 1;
    }

    const topSubjectFragment = output.diagnostics.phraseRepetitionReview.subjectStemFamilies.find(
      (family) => family.form === "subject-fragment",
    );
    if (topSubjectFragment !== undefined) {
      const key = topSubjectFragment.pattern.join("-");
      topSubjectFragments.set(key, (topSubjectFragments.get(key) ?? 0) + 1);
    }

    if (isModalCounterSubjectRiskSeed(seed) && output.diagnostics.counterSubjectIdentityRetention < 0.65) {
      lowModalCounterSubjectIdentitySeedCount += 1;
    }
  }

  return {
    seedCount: seeds.length,
    durationBasedLockstepReviewSeedCount,
    pitchClassUnisonReviewSeedCount,
    unresolvedEntrySevereIntervalSentinelCount,
    classifiedEntrySonorityCount,
    fragmentFunctionEvidenceTotal,
    recognizableOrAlteredCounterSubjectWindowCount,
    functionAwareLockstepSeedCount,
    topSubjectFragmentFamilyShare: Math.max(0, ...topSubjectFragments.values()) / seeds.length,
    lowModalCounterSubjectIdentitySeedCount,
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

function isModalCounterSubjectRiskSeed(seed: string): boolean {
  return (
    seed === "modal-answer" ||
    seed === "dense-modal" ||
    seed === "modal-cadence" ||
    seed === "angular-answer" ||
    seed === "modal-dorian"
  );
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
