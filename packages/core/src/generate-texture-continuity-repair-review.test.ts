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
  "modal-cadence",
  "dense-modal",
  "random-listen-check",
] as const;

const REPAIR_REVIEW_LENGTH_TICKS = TICKS_PER_QUARTER * 288;
const scoreCache = new Map<string, GenerationOutput>();

test("texture-continuity repair seeds no longer rely on sustained one-outside bass-answer tails", () => {
  const summaries = TEXTURE_CONTINUITY_REPAIR_REVIEW_SEEDS.map((seed) => {
    const output = scoreForSeed(seed);
    const tailWindow = output.diagnostics.bassAnswerTailTexture.windows[0];
    assert.ok(tailWindow !== undefined, `${seed} should expose the first bass-answer tail window`);

    return {
      seed,
      reviewRequired: output.diagnostics.bassAnswerTailTexture.reviewRequired,
      classification: tailWindow.classification,
      oneOutsideVoiceTicks: tailWindow.oneOutsideVoiceTicks,
      minOutsideVoiceCount: tailWindow.minOutsideVoiceCount,
    };
  });

  const reportedSeed = summaries.find((summary) => summary.seed === "seed-0i335vx-1n54a1x");
  assert.ok(reportedSeed !== undefined);
  assert.ok(reportedSeed.oneOutsideVoiceTicks < TICKS_PER_QUARTER * 2, JSON.stringify(summaries, null, 2));
  assert.equal(reportedSeed.classification, "supported-tail");
  assert.ok(
    summaries.every((summary) => summary.minOutsideVoiceCount >= 1 && !summary.reviewRequired),
    JSON.stringify(summaries, null, 2),
  );
});

test("texture-continuity repair seeds keep exposed free-counterpoint solo windows review-visible", () => {
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
    summaries.every((summary) => !summary.reviewRequired && summary.reviewRequiredWindowCount === 0),
    JSON.stringify(summaries, null, 2),
  );
  assert.ok(
    summaries.some((summary) => summary.functionExplainedWindowCount > 0),
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
