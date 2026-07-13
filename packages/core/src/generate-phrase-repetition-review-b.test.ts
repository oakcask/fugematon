import assert from "node:assert/strict";
import {
  collectPhraseRepetitionMetrics,
  PHRASE_REPETITION_REVIEW_BATCH_B,
} from "./generate-quality-review-test-helpers.js";
import { reviewTest } from "./test-profile.js";

reviewTest("generateScore completes phrase-repetition adoption across review seeds batch B", () => {
  const cases = [
    {
      label: "B1a",
      seeds: PHRASE_REPETITION_REVIEW_BATCH_B.slice(0, 3),
      expectedSeedCount: 3,
      maximumTopEntryPatternFamilyDelta: -7,
    },
    {
      label: "B1b",
      seeds: PHRASE_REPETITION_REVIEW_BATCH_B.slice(3, 6),
      expectedSeedCount: 3,
      maximumTopEntryPatternFamilyDelta: 1,
    },
    {
      label: "B2a",
      seeds: PHRASE_REPETITION_REVIEW_BATCH_B.slice(6, 9),
      expectedSeedCount: 3,
      maximumTopEntryPatternFamilyDelta: -1,
    },
    {
      label: "B2b",
      seeds: PHRASE_REPETITION_REVIEW_BATCH_B.slice(9),
      expectedSeedCount: 2,
      maximumTopEntryPatternFamilyDelta: -1,
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
}): void {
  const { label, seeds, expectedSeedCount, maximumTopEntryPatternFamilyDelta } = testCase;
  const metrics = collectPhraseRepetitionMetrics(seeds);

  assert.equal(metrics.seedCount, expectedSeedCount, label);
  assert.ok(
    metrics.variantTopEntryPatternFamilyCount <=
      metrics.baselineTopEntryPatternFamilyCount + maximumTopEntryPatternFamilyDelta,
    label,
  );
  assert.ok(metrics.variantUnsupportedThinningRuns <= metrics.baselineUnsupportedThinningRuns / 2, label);
}
