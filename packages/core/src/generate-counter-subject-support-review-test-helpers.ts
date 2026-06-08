import assert from "node:assert/strict";
import { TICKS_PER_QUARTER } from "./constants.js";
import { cachedGenerateScore as generateScore } from "./generate-test-helpers.js";

export const COUNTER_SUBJECT_HIGH_COLLISION_REVIEW_SEEDS = [
  "bach-001",
  "tight-stretto",
  "contrary-motion",
  "seed-0zereox-1v729ih",
] as const;

export const COUNTER_SUBJECT_MODAL_REVIEW_SEEDS = [
  "dense-modal",
  "modal-answer",
  "angular-answer",
  "random-listen-check",
] as const;

export function assertCounterSubjectReviewSeedsExposePressure(
  seeds: readonly string[],
  expectation: {
    minWindowCount: number;
    minPreservedWindowCount?: number;
    minTradeoffWindowCount: number;
    minWeakWindowCount: number;
    minSupportCollisionCount?: number;
    maxSupportCollisionCount?: number;
    maxPreservedWindowCount?: number;
  },
): void {
  const summaries = seeds.map((seed) => {
    const diagnostics = generateScore({ seed, lengthTicks: TICKS_PER_QUARTER * 288 }).diagnostics;
    const counterSubjectWindows = diagnostics.qualityVector.counterSubjectWindows;
    const preservedWindowCount = counterSubjectWindows.filter(
      (window) => window.preservationJudgement === "preserved",
    ).length;
    const tradeoffWindowCount = counterSubjectWindows.filter(
      (window) => window.preservationJudgement === "tradeoff",
    ).length;
    const weakWindowCount = counterSubjectWindows.filter((window) => window.preservationJudgement === "weak").length;
    const supportCollisionCount = counterSubjectWindows.reduce((sum, window) => sum + window.supportCollisionCount, 0);

    return {
      seed,
      windowCount: counterSubjectWindows.length,
      preservedWindowCount,
      tradeoffWindowCount,
      weakWindowCount,
      supportCollisionCount,
      counterSubjectIdentityRetention: diagnostics.counterSubjectIdentityRetention,
      generatorResponseWindowCount: diagnostics.scoreWindowAcceptance.generatorResponseWindowCount,
      reviewRequiredWindowCount: diagnostics.scoreWindowAcceptance.reviewRequiredWindowCount,
    };
  });

  assert.ok(
    summaries.every(
      (summary) => summary.windowCount > 0 && summary.tradeoffWindowCount > 0 && summary.reviewRequiredWindowCount > 0,
    ),
    JSON.stringify(summaries, null, 2),
  );

  const totals = summaries.reduce(
    (total, summary) => ({
      windowCount: total.windowCount + summary.windowCount,
      preservedWindowCount: total.preservedWindowCount + summary.preservedWindowCount,
      tradeoffWindowCount: total.tradeoffWindowCount + summary.tradeoffWindowCount,
      weakWindowCount: total.weakWindowCount + summary.weakWindowCount,
      supportCollisionCount: total.supportCollisionCount + summary.supportCollisionCount,
    }),
    {
      windowCount: 0,
      preservedWindowCount: 0,
      tradeoffWindowCount: 0,
      weakWindowCount: 0,
      supportCollisionCount: 0,
    },
  );

  assert.ok(totals.windowCount >= expectation.minWindowCount, JSON.stringify(summaries, null, 2));
  if (expectation.minPreservedWindowCount !== undefined) {
    assert.ok(totals.preservedWindowCount >= expectation.minPreservedWindowCount, JSON.stringify(summaries, null, 2));
  }
  assert.ok(totals.tradeoffWindowCount >= expectation.minTradeoffWindowCount, JSON.stringify(summaries, null, 2));
  assert.ok(totals.weakWindowCount >= expectation.minWeakWindowCount, JSON.stringify(summaries, null, 2));
  if (expectation.minSupportCollisionCount !== undefined) {
    assert.ok(totals.supportCollisionCount >= expectation.minSupportCollisionCount, JSON.stringify(summaries, null, 2));
  }
  if (expectation.maxSupportCollisionCount !== undefined) {
    assert.ok(totals.supportCollisionCount <= expectation.maxSupportCollisionCount, JSON.stringify(summaries, null, 2));
  }
  if (expectation.maxPreservedWindowCount !== undefined) {
    assert.ok(totals.preservedWindowCount <= expectation.maxPreservedWindowCount, JSON.stringify(summaries, null, 2));
  }
}
