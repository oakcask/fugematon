import assert from "node:assert/strict";
import test from "node:test";
import { REPRESENTATIVE_REVIEW_SEEDS, REVIEW_LENGTH_TICKS, ROTATION_REVIEW_SEEDS } from "./constants.js";
import type { EpisodeMotivicDevelopmentSummary, GenerationDiagnostics } from "./events.js";
import { generateScore } from "./generate.js";

const REVIEW_SEEDS = [...REPRESENTATIVE_REVIEW_SEEDS, ...ROTATION_REVIEW_SEEDS].map(({ seed }) => seed);

test("episode motivic repetition focused seeds avoid mechanical stock formula reuse", () => {
  const modalCadence = diagnosticsForSeed("modal-cadence");
  assert.ok(modalCadence.phraseDevelopmentReview.mechanicalReuseWindowCount <= 6);

  const modalAnswer = diagnosticsForSeed("modal-answer");
  assert.ok(modalAnswer.episodeMotivicDevelopment.repeatedStockFormulaCount <= 330);
  assert.ok(topRepeatedFormulaCount(modalAnswer.episodeMotivicDevelopment) <= 55);

  const angularAnswer = diagnosticsForSeed("angular-answer");
  assert.ok(repeatedFormulaCount(angularAnswer.episodeMotivicDevelopment, "uuuuu|eeeeee") <= 52);
  assert.equal(angularAnswer.episodeMotivicDevelopment.genericFreeCounterpointDurationTicks, 0);

  const darkEpisode = diagnosticsForSeed("dark-episode");
  assert.ok(darkEpisode.episodeMotivicDevelopment.transformationVariety >= 8);
  assert.ok(darkEpisode.episodeMotivicDevelopment.sourceMotiveConcentration <= 0.3);
});

test("episode motivic repetition review bundle keeps derivation coverage and texture guardrails", () => {
  const summaries = REVIEW_SEEDS.map((seed) => {
    const diagnostics = diagnosticsForSeed(seed);
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
    summaries.reduce((sum, summary) => sum + summary.repeatedStockFormulaCount, 0) <= 5400,
    JSON.stringify(summaries, null, 2),
  );
  assert.ok(
    summaries.reduce((sum, summary) => sum + summary.mechanicalReuseWindowCount, 0) <= 58,
    JSON.stringify(summaries, null, 2),
  );
});

function diagnosticsForSeed(seed: string): GenerationDiagnostics {
  return generateScore({ seed, lengthTicks: REVIEW_LENGTH_TICKS }).diagnostics;
}

function topRepeatedFormulaCount(summary: EpisodeMotivicDevelopmentSummary): number {
  return summary.repeatedFormulas[0]?.count ?? 0;
}

function repeatedFormulaCount(summary: EpisodeMotivicDevelopmentSummary, signature: string): number {
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
