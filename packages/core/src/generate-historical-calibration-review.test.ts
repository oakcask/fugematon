import assert from "node:assert/strict";
import test from "node:test";
import { REVIEW_LENGTH_TICKS, TICKS_PER_QUARTER } from "./constants.js";
import { generateScore } from "./generate.js";
import { evaluateReviewGatePolicy } from "./review-gate.js";

const HISTORICAL_CALIBRATION_FOCUSED_SEEDS = [
  "circle-fifths",
  "contrary-motion",
  "modal-cadence",
  "tight-stretto",
] as const;

test("historical calibration focused seeds keep score-window repair evidence observable", () => {
  let unresolvedEntrySevereIntervalQuarters = 0;
  let unresolvedEntrySentinelCount = 0;
  let mechanicalCouplingQuarters = 0;
  let pitchClassColorDoublingQuarters = 0;
  let functionalLockstepSeedCount = 0;
  let classifiedEntrySonorityCount = 0;
  let exposedSoloRunCount = 0;

  for (const seed of HISTORICAL_CALIBRATION_FOCUSED_SEEDS) {
    const output = generateScore({ seed, lengthTicks: REVIEW_LENGTH_TICKS });
    const gate = evaluateReviewGatePolicy(seed, output.diagnostics);

    assert.equal(gate.adoptionReady, true);
    assert.equal(gate.hardConstraintPassed, true);
    assert.deepEqual(gate.hardFailures, []);
    assert.equal(output.diagnostics.subjectIdentityViolations, 0);
    assert.equal(output.diagnostics.answerPlanViolations, 0);
    assert.equal(output.diagnostics.unresolvedDissonanceCount, 0);

    unresolvedEntrySevereIntervalQuarters += output.diagnostics.qualityVector.entrySevereIntervals.reduce(
      (sum, entry) => sum + entry.unresolvedDurationTicks / TICKS_PER_QUARTER,
      0,
    );
    unresolvedEntrySentinelCount += output.diagnostics.qualityVector.localSentinels.filter(
      (sentinel) => sentinel.kind === "unresolved-entry-severe-interval",
    ).length;
    classifiedEntrySonorityCount += output.diagnostics.qualityVector.entrySonorities.filter(
      (sonority) => !sonority.kinds.includes("open-consonance"),
    ).length;
    exposedSoloRunCount += output.diagnostics.soloTexture.unsupportedSoloRunCount;

    const functionTotals = output.diagnostics.qualityVector.voicePairFunctions.reduce(
      (totals, summary) => ({
        mechanicalCouplingTicks: totals.mechanicalCouplingTicks + summary.mechanicalCouplingTicks,
        pitchClassColorDoublingTicks: totals.pitchClassColorDoublingTicks + summary.pitchClassColorDoublingTicks,
        functionalLockstepTicks:
          totals.functionalLockstepTicks +
          summary.subjectSupportLockstepTicks +
          summary.cadenceSupportLockstepTicks +
          summary.sequencePatternLockstepTicks +
          summary.pedalLikeSupportLockstepTicks,
      }),
      {
        mechanicalCouplingTicks: 0,
        pitchClassColorDoublingTicks: 0,
        functionalLockstepTicks: 0,
      },
    );

    mechanicalCouplingQuarters += functionTotals.mechanicalCouplingTicks / TICKS_PER_QUARTER;
    pitchClassColorDoublingQuarters += functionTotals.pitchClassColorDoublingTicks / TICKS_PER_QUARTER;
    functionalLockstepSeedCount += Number(functionTotals.functionalLockstepTicks > 0);
  }

  assert.ok(unresolvedEntrySevereIntervalQuarters > 0);
  assert.ok(unresolvedEntrySentinelCount > 0);
  assert.ok(classifiedEntrySonorityCount >= HISTORICAL_CALIBRATION_FOCUSED_SEEDS.length * 20);
  assert.ok(mechanicalCouplingQuarters > 0);
  assert.ok(pitchClassColorDoublingQuarters > 0);
  assert.ok(functionalLockstepSeedCount >= HISTORICAL_CALIBRATION_FOCUSED_SEEDS.length);
  assert.ok(exposedSoloRunCount <= HISTORICAL_CALIBRATION_FOCUSED_SEEDS.length * 2);
});
