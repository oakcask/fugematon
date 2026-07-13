import assert from "node:assert/strict";
import { TICKS_PER_QUARTER } from "./constants.js";
import { cachedGenerateScore as generateScore } from "./generate-test-helpers.js";
import { reviewTest } from "./test-profile.js";

const FOCUSED_LENGTH_TICKS = TICKS_PER_QUARTER * 64;
const HIGH_RISK_SEEDS = ["long-arc", "dark-episode", "ornament-test", "bach-001"] as const;

reviewTest("stretto entry harmony repair keeps the reported handoff window at the repaired ceiling", () => {
  const metrics = strettoEntryHarmonyMetrics("seed-1db5j19-1nhjtae");

  assert.ok(metrics.firstStrettoUnresolvedAccentedEntryClashes <= 1);
  assert.ok(
    metrics.handoffHarmonicSonorityWindows <= 6,
    `test.stretto-entry-harmony.handoff-ceiling: actual=${metrics.handoffHarmonicSonorityWindows}; why=the reported stretto handoff should remain within its harmonic-sonority review ceiling; action=inspect the handoff window or recalibrate the documented review baseline`,
  );
  assert.equal(metrics.hardConstraintFailures, 0);
});

reviewTest("stretto entry harmony repair improves high-risk first-stretto windows without hard failures", () => {
  const metrics = HIGH_RISK_SEEDS.map(strettoEntryHarmonyMetrics);

  assert.ok(
    sum(metrics.map((seed) => seed.firstStrettoDissonanceWindows)) <= 14,
    "high-risk first-stretto dissonance windows should stay below the focused repair ceiling",
  );
  assert.ok(
    sum(metrics.map((seed) => seed.firstStrettoUnresolvedAccentedEntryClashes)) <= 3,
    "high-risk first-stretto unresolved accented clashes should stay below the focused repair ceiling",
  );
  assert.ok(
    sum(metrics.map((seed) => seed.handoffHarmonicSonorityWindows)) <= 17,
    "high-risk handoff harmonic sonority windows should stay review-visible without becoming hard failures",
  );
  assert.equal(sum(metrics.map((seed) => seed.hardConstraintFailures)), 0);
});

reviewTest("stretto entry harmony repair preserves lower-risk stretto tension", () => {
  const tightStretto = strettoEntryHarmonyMetrics("tight-stretto");
  const modalDorian = strettoEntryHarmonyMetrics("modal-dorian");

  assert.ok(tightStretto.firstStrettoUnresolvedAccentedEntryClashes <= 1);
  assert.ok(tightStretto.firstStrettoDissonanceWindows > 0);
  assert.ok(modalDorian.firstStrettoUnresolvedAccentedEntryClashes <= 1);
  assert.equal(tightStretto.hardConstraintFailures + modalDorian.hardConstraintFailures, 0);
});

function strettoEntryHarmonyMetrics(seed: string) {
  const { diagnostics } = generateScore({ seed, lengthTicks: FOCUSED_LENGTH_TICKS });
  const firstStretto = diagnostics.sectionPlans.find((plan) => plan.state === "stretto-like");
  const hardConstraintFailures =
    diagnostics.rangeViolations +
    diagnostics.voiceCrossings +
    diagnostics.subjectIdentityViolations +
    diagnostics.answerPlanViolations +
    diagnostics.keyMetadataMismatches;

  if (firstStretto === undefined) {
    return {
      firstStrettoDissonanceWindows: 0,
      firstStrettoUnresolvedAccentedEntryClashes: 0,
      handoffHarmonicSonorityWindows: 0,
      hardConstraintFailures,
    };
  }

  const startTick = firstStretto.startTick;
  const endTick = firstStretto.startTick + firstStretto.durationTicks;
  const firstStrettoDissonanceWindows = diagnostics.dissonanceTriage.windows.filter(
    (window) => window.state === "stretto-like" && startTick <= window.startTick && window.startTick < endTick,
  );
  const handoffHarmonicSonorityWindows = diagnostics.qualityVector.harmonicSonorities.windows.filter(
    (window) =>
      startTick - diagnostics.sectionPlans[0]!.meterContext.measureTicks <= window.startTick &&
      window.startTick < endTick,
  );

  return {
    firstStrettoDissonanceWindows: firstStrettoDissonanceWindows.length,
    firstStrettoUnresolvedAccentedEntryClashes: firstStrettoDissonanceWindows.filter(
      (window) => window.classification === "unresolved-accented-entry-clash",
    ).length,
    handoffHarmonicSonorityWindows: handoffHarmonicSonorityWindows.length,
    hardConstraintFailures,
  };
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
