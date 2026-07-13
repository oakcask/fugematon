import assert from "node:assert/strict";
import {
  collectPhraseRepetitionMetrics,
  PHRASE_REPETITION_REVIEW_BATCH_A,
} from "./generate-quality-review-test-helpers.js";
import { reviewTest } from "./test-profile.js";

reviewTest("generateScore completes phrase-repetition adoption across review seeds batch A", () => {
  const cases = [
    {
      label: "A1a",
      seeds: PHRASE_REPETITION_REVIEW_BATCH_A.slice(0, 3),
      expectedSeedCount: 3,
      maximumTopEntryPatternFamilyDelta: -3,
      maxUnsupportedThinningRunsRatio: 0.5,
      minUnsupportedThinningRuns: 1,
    },
    {
      label: "A1b",
      seeds: PHRASE_REPETITION_REVIEW_BATCH_A.slice(3, 6),
      expectedSeedCount: 3,
      maximumTopEntryPatternFamilyDelta: -3,
      maxUnsupportedThinningRunsRatio: 1,
      minUnsupportedThinningRuns: 0,
    },
    {
      label: "A2a",
      seeds: PHRASE_REPETITION_REVIEW_BATCH_A.slice(6, 9),
      expectedSeedCount: 3,
      maximumTopEntryPatternFamilyDelta: -3,
      maxUnsupportedThinningRunsRatio: 0.5,
      minUnsupportedThinningRuns: 0,
    },
    {
      label: "A2b",
      seeds: PHRASE_REPETITION_REVIEW_BATCH_A.slice(9),
      expectedSeedCount: 2,
      maximumTopEntryPatternFamilyDelta: -3,
      maxUnsupportedThinningRunsRatio: 0.5,
      minUnsupportedThinningRuns: 1,
    },
  ] as const;

  for (const testCase of cases) {
    assertPhraseRepetitionReviewBatch(testCase);
  }
});

function assertPhraseRepetitionReviewBatch(testCase: {
  label: string;
  seeds: readonly string[];
  expectedSeedCount: number;
  maximumTopEntryPatternFamilyDelta: number;
  maxUnsupportedThinningRunsRatio: number;
  minUnsupportedThinningRuns: number;
}): void {
  const {
    label,
    seeds,
    expectedSeedCount,
    maximumTopEntryPatternFamilyDelta,
    maxUnsupportedThinningRunsRatio,
    minUnsupportedThinningRuns,
  } = testCase;
  const metrics = collectPhraseRepetitionMetrics(seeds);

  assert.equal(metrics.seedCount, expectedSeedCount, label);
  assert.ok(
    metrics.variantTopEntryPatternFamilyCount <=
      metrics.baselineTopEntryPatternFamilyCount + maximumTopEntryPatternFamilyDelta,
    label,
  );
  assert.ok(
    metrics.variantUnsupportedThinningRuns <=
      Math.max(minUnsupportedThinningRuns, metrics.baselineUnsupportedThinningRuns * maxUnsupportedThinningRunsRatio),
    label,
  );
}
