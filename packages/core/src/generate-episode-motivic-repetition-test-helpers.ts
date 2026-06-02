import assert from "node:assert/strict";
import { REPRESENTATIVE_REVIEW_SEEDS, REVIEW_LENGTH_TICKS, ROTATION_REVIEW_SEEDS } from "./constants.js";
import type { EpisodeMotivicDevelopmentSummary, GenerationDiagnostics } from "./events.js";
import { generateScore } from "./generate.js";

const REVIEW_SEEDS = [...REPRESENTATIVE_REVIEW_SEEDS, ...ROTATION_REVIEW_SEEDS].map(({ seed }) => seed);

export type EpisodeMotivicRepetitionReviewBatch = {
  name: string;
  seeds: string[];
  maxRepeatedStockFormulaCount: number;
  maxMechanicalReuseWindowCount: number;
};

export const EPISODE_MOTIVIC_REPETITION_REVIEW_BATCHES = [
  {
    name: "representative opening",
    seeds: REVIEW_SEEDS.slice(0, 4),
    maxRepeatedStockFormulaCount: 400,
    maxMechanicalReuseWindowCount: 15,
  },
  {
    name: "representative middle",
    seeds: REVIEW_SEEDS.slice(4, 8),
    maxRepeatedStockFormulaCount: 400,
    maxMechanicalReuseWindowCount: 9,
  },
  {
    name: "representative cadence",
    seeds: REVIEW_SEEDS.slice(8, 12),
    maxRepeatedStockFormulaCount: 400,
    maxMechanicalReuseWindowCount: 15,
  },
  {
    name: "representative tail and rotation opening",
    seeds: REVIEW_SEEDS.slice(12, 16),
    maxRepeatedStockFormulaCount: 400,
    maxMechanicalReuseWindowCount: 12,
  },
  {
    name: "rotation answer",
    seeds: REVIEW_SEEDS.slice(16, 19),
    maxRepeatedStockFormulaCount: 260,
    maxMechanicalReuseWindowCount: 6,
  },
  {
    name: "rotation cadence and adversarial",
    seeds: REVIEW_SEEDS.slice(19),
    maxRepeatedStockFormulaCount: 250,
    maxMechanicalReuseWindowCount: 9,
  },
] as const satisfies EpisodeMotivicRepetitionReviewBatch[];

export function assertEpisodeMotivicRepetitionReviewBatch(batch: EpisodeMotivicRepetitionReviewBatch): void {
  const summaries = batch.seeds.map((seed) => {
    const diagnostics = diagnosticsForEpisodeMotivicRepetitionSeed(seed);
    return {
      seed,
      hardFailureCount: hardFailureCount(diagnostics),
      derivationCoverage: diagnostics.episodeMotivicDevelopment.derivationCoverage,
      genericFreeCounterpointDurationTicks: diagnostics.episodeMotivicDevelopment.genericFreeCounterpointDurationTicks,
      repeatedStockFormulaCount: diagnostics.episodeMotivicDevelopment.repeatedStockFormulaCount,
      mechanicalReuseWindowCount: diagnostics.phraseDevelopmentReview.mechanicalReuseWindowCount,
      unsupportedSoloWindowCount: diagnostics.exposedFreeCounterpointSolo.reviewRequiredWindowCount,
      bassAnswerTailReviewRequired: diagnostics.bassAnswerTailTexture.reviewRequired,
    };
  });

  assert.ok(
    summaries.every((summary) => summary.hardFailureCount === 0),
    JSON.stringify(summaries, null, 2),
  );
  assert.ok(
    summaries.every((summary) => summary.derivationCoverage === 1),
    JSON.stringify(summaries, null, 2),
  );
  assert.ok(
    summaries.every((summary) => summary.genericFreeCounterpointDurationTicks === 0),
    JSON.stringify(summaries, null, 2),
  );
  assert.ok(
    summaries.every((summary) => summary.unsupportedSoloWindowCount === 0 && !summary.bassAnswerTailReviewRequired),
    JSON.stringify(summaries, null, 2),
  );
  assert.ok(
    summaries.reduce((sum, summary) => sum + summary.repeatedStockFormulaCount, 0) <=
      batch.maxRepeatedStockFormulaCount,
    JSON.stringify(summaries, null, 2),
  );
  assert.ok(
    summaries.reduce((sum, summary) => sum + summary.mechanicalReuseWindowCount, 0) <=
      batch.maxMechanicalReuseWindowCount,
    JSON.stringify(summaries, null, 2),
  );
}

export function diagnosticsForEpisodeMotivicRepetitionSeed(seed: string): GenerationDiagnostics {
  return generateScore({ seed, lengthTicks: REVIEW_LENGTH_TICKS }).diagnostics;
}

export function topRepeatedFormulaCount(summary: EpisodeMotivicDevelopmentSummary): number {
  return summary.repeatedFormulas[0]?.count ?? 0;
}

export function repeatedFormulaCount(summary: EpisodeMotivicDevelopmentSummary, signature: string): number {
  return summary.repeatedFormulas.find((formula) => formula.signature === signature)?.count ?? 0;
}

function hardFailureCount(diagnostics: GenerationDiagnostics): number {
  return diagnostics.issues.filter(
    (issue) =>
      issue.code === "range-violation" ||
      issue.code === "voice-crossing" ||
      issue.code === "subject-identity-violation" ||
      issue.code === "answer-plan-violation" ||
      issue.code === "key-metadata-mismatch",
  ).length;
}
