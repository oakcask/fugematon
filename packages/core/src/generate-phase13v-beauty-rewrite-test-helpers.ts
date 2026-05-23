import assert from "node:assert/strict";
import { REPRESENTATIVE_REVIEW_SEEDS, ROTATION_REVIEW_SEEDS, TICKS_PER_QUARTER } from "./constants.js";
import { generateScore } from "./generate.js";
import { evaluateReviewGatePolicy } from "./review-gate.js";

export const PHASE_13V_REVIEW_SEEDS = [...REPRESENTATIVE_REVIEW_SEEDS, ...ROTATION_REVIEW_SEEDS].map(
  ({ seed }) => seed,
);

export const PHASE_13V_FOCUSED_REVIEW_SEEDS = ["bach-001", "modal-cadence"] as const;

const PHASE_13V_SMOKE_LENGTH_TICKS = TICKS_PER_QUARTER * 96;

export type Phase13VBeautyReviewMetrics = {
  seedCount: number;
  entryFormulaSummaryCount: number;
  reviewRequiredEntryFormulaCount: number;
  justifiedEntryFormulaCount: number;
  pitchClassUnisonReviewSeedCount: number;
  durationBasedLockstepReviewSeedCount: number;
  voicePairSpanCount: number;
  counterSubjectWindowCount: number;
  preservedCounterSubjectWindowCount: number;
  tradeoffCounterSubjectWindowCount: number;
  fragmentTransformationClaimCount: number;
  topFragmentFunctionShareTotal: number;
};

export function collectPhase13VBeautyReviewMetrics(seeds: readonly string[]): Phase13VBeautyReviewMetrics {
  const metrics: Phase13VBeautyReviewMetrics = {
    seedCount: seeds.length,
    entryFormulaSummaryCount: 0,
    reviewRequiredEntryFormulaCount: 0,
    justifiedEntryFormulaCount: 0,
    pitchClassUnisonReviewSeedCount: 0,
    durationBasedLockstepReviewSeedCount: 0,
    voicePairSpanCount: 0,
    counterSubjectWindowCount: 0,
    preservedCounterSubjectWindowCount: 0,
    tradeoffCounterSubjectWindowCount: 0,
    fragmentTransformationClaimCount: 0,
    topFragmentFunctionShareTotal: 0,
  };

  for (const seed of seeds) {
    const output = generateScore({ seed, lengthTicks: PHASE_13V_SMOKE_LENGTH_TICKS });
    const gate = evaluateReviewGatePolicy(seed, output.diagnostics);
    const vector = output.diagnostics.qualityVector;
    const axes = new Map(vector.axes.map((axis) => [axis.axis, axis]));

    assert.equal(gate.adoptionReady, true);
    assert.equal(gate.hardConstraintPassed, true);
    assert.deepEqual(gate.hardFailures, []);
    assert.equal(output.diagnostics.unresolvedDissonanceCount, 0);
    assert.equal(output.diagnostics.allVoiceSilenceGapCount, 0);

    metrics.entryFormulaSummaryCount += vector.entryFormulaRecurrences.length;
    metrics.reviewRequiredEntryFormulaCount += vector.entryFormulaRecurrences.filter(
      (summary) => summary.judgement === "review-required",
    ).length;
    metrics.justifiedEntryFormulaCount += vector.entryFormulaRecurrences.filter(
      (summary) => summary.judgement === "functionally-justified",
    ).length;
    metrics.pitchClassUnisonReviewSeedCount += Number(
      axes.get("pitchClassUnisonDuration")?.status === "review-required",
    );
    metrics.durationBasedLockstepReviewSeedCount += Number(
      axes.get("durationBasedLockstep")?.status === "review-required",
    );
    metrics.voicePairSpanCount += vector.voicePairSpans.length;
    metrics.counterSubjectWindowCount += vector.counterSubjectWindows.length;
    metrics.preservedCounterSubjectWindowCount += vector.counterSubjectWindows.filter(
      (window) => window.preservationJudgement === "preserved",
    ).length;
    metrics.tradeoffCounterSubjectWindowCount += vector.counterSubjectWindows.filter(
      (window) => window.preservationJudgement === "tradeoff",
    ).length;
    metrics.fragmentTransformationClaimCount += vector.fragmentFunctionEvidence.transformationClaims.length;
    metrics.topFragmentFunctionShareTotal += vector.fragmentFunctionEvidence.topFunctionShare;

    assert.ok(
      vector.localSentinels.every(
        (sentinel) => sentinel.durationTicks >= TICKS_PER_QUARTER || sentinel.voice !== undefined,
      ),
    );
  }

  return metrics;
}
