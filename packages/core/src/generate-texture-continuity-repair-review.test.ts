import assert from "node:assert/strict";
import test from "node:test";
import { TICKS_PER_QUARTER } from "./constants.js";
import type { GenerationOutput } from "./events.js";
import { generateScore } from "./generate.js";

const TEXTURE_CONTINUITY_REPAIR_REVIEW_SEEDS = [
  "seed-0i335vx-1n54a1x",
  "bach-001",
  "fugue-smoke",
  "minor-entry",
] as const;

const EXPECTS_REPORTED_SEED = true;

const REPAIR_REVIEW_LENGTH_TICKS = TICKS_PER_QUARTER * 288;
const scoreCache = new Map<string, GenerationOutput>();

test("texture-continuity repair seeds keep bass-answer tail thinning bounded and review-visible", () => {
  assertBassAnswerTailRepair(TEXTURE_CONTINUITY_REPAIR_REVIEW_SEEDS, EXPECTS_REPORTED_SEED);
});

test("texture-continuity repair seeds keep exposed free-counterpoint solo windows bounded and review-visible", () => {
  assertExposedFreeCounterpointSoloRepair(TEXTURE_CONTINUITY_REPAIR_REVIEW_SEEDS);
});

function assertBassAnswerTailRepair(seeds: readonly string[], expectsReportedSeed: boolean): void {
  const summaries = seeds.map((seed) => {
    const output = scoreForSeed(seed);
    const tailWindow = output.diagnostics.bassAnswerTailTexture.windows[0];
    assert.ok(tailWindow !== undefined, `${seed} should expose the first bass-answer tail window`);

    return {
      seed,
      reviewRequired: output.diagnostics.bassAnswerTailTexture.reviewRequired,
      classification: tailWindow.classification,
      zeroOutsideVoiceTicks: tailWindow.zeroOutsideVoiceTicks,
      oneOutsideVoiceTicks: tailWindow.oneOutsideVoiceTicks,
      minOutsideVoiceCount: tailWindow.minOutsideVoiceCount,
    };
  });

  if (expectsReportedSeed) {
    const reportedSeed = summaries.find((summary) => summary.seed === "seed-0i335vx-1n54a1x");
    assert.ok(reportedSeed !== undefined);
    assert.ok(reportedSeed.oneOutsideVoiceTicks < TICKS_PER_QUARTER * 2, JSON.stringify(summaries, null, 2));
    assert.equal(reportedSeed.classification, "review-required");
  }
  assert.ok(
    summaries.every(
      (summary) =>
        summary.minOutsideVoiceCount === 0 &&
        summary.reviewRequired &&
        summary.zeroOutsideVoiceTicks <= TICKS_PER_QUARTER * 3,
    ),
    JSON.stringify(summaries, null, 2),
  );
}

function assertExposedFreeCounterpointSoloRepair(seeds: readonly string[]): void {
  const summaries = seeds.map((seed) => {
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
    summaries.every((summary) => summary.reviewRequiredWindowCount <= 5),
    JSON.stringify(summaries, null, 2),
  );
  assert.ok(
    summaries.some((summary) => summary.functionExplainedWindowCount > 0),
    JSON.stringify(summaries, null, 2),
  );
}

function scoreForSeed(seed: string): GenerationOutput {
  const cached = scoreCache.get(seed);
  if (cached !== undefined) {
    return cached;
  }
  const output = generateScore({ seed, lengthTicks: REPAIR_REVIEW_LENGTH_TICKS });
  scoreCache.set(seed, output);
  return output;
}
