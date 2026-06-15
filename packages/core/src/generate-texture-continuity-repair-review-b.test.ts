import assert from "node:assert/strict";
import test from "node:test";
import { TICKS_PER_QUARTER } from "./constants.js";
import type { GenerationOutput } from "./events.js";
import { cachedGenerateScore as generateScore } from "./generate-test-helpers.js";

const TEXTURE_CONTINUITY_REPAIR_REVIEW_SEEDS = ["modal-cadence", "dense-modal", "random-listen-check"] as const;

const REPAIR_REVIEW_LENGTH_TICKS = TICKS_PER_QUARTER * 288;
const scoreCache = new Map<string, GenerationOutput>();

test("texture-continuity repair review batch B keeps bass-answer tail thinning bounded and review-visible", () => {
  const summaries = TEXTURE_CONTINUITY_REPAIR_REVIEW_SEEDS.map((seed) => {
    const output = scoreForSeed(seed);
    const tailWindow = output.diagnostics.bassAnswerTailTexture.windows[0];
    assert.ok(tailWindow !== undefined, `${seed} should expose the first bass-answer tail window`);

    return {
      seed,
      reviewRequired: output.diagnostics.bassAnswerTailTexture.reviewRequired,
      zeroOutsideVoiceTicks: tailWindow.zeroOutsideVoiceTicks,
      minOutsideVoiceCount: tailWindow.minOutsideVoiceCount,
    };
  });

  assert.ok(
    summaries.every(
      (summary) =>
        summary.minOutsideVoiceCount === 0 &&
        summary.reviewRequired &&
        summary.zeroOutsideVoiceTicks <= TICKS_PER_QUARTER * 3,
    ),
    JSON.stringify(summaries, null, 2),
  );
});

test("texture-continuity repair review batch B resolves exposed free-counterpoint solo windows", () => {
  const summaries = TEXTURE_CONTINUITY_REPAIR_REVIEW_SEEDS.map((seed) => {
    const summary = scoreForSeed(seed).diagnostics.exposedFreeCounterpointSolo;
    return {
      seed,
      reviewRequired: summary.reviewRequired,
      reviewRequiredWindowCount: summary.reviewRequiredWindowCount,
      functionExplainedWindowCount: summary.functionExplainedWindowCount,
      windows: summary.windows,
    };
  });

  assert.ok(
    summaries.every((summary) => summary.reviewRequiredWindowCount === 0),
    JSON.stringify(summaries, null, 2),
  );
});

function scoreForSeed(seed: string): GenerationOutput {
  const cached = scoreCache.get(seed);
  if (cached !== undefined) {
    return cached;
  }
  const output = generateScore({ seed, lengthTicks: REPAIR_REVIEW_LENGTH_TICKS });
  scoreCache.set(seed, output);
  return output;
}
