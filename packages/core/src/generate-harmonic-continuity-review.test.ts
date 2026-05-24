import assert from "node:assert/strict";
import test from "node:test";
import { TICKS_PER_QUARTER } from "./constants.js";
import type { HarmonicPlan } from "./events.js";
import { generateScore } from "./generate.js";

const HARMONIC_CONTINUITY_REVIEW_SEEDS = [
  "seed-1dxb2n8-1miapx7",
  "circle-fifths",
  "tight-stretto",
  "modal-cadence",
  "bach-001",
  "contrary-motion",
] as const;

test("reported harmonic-continuity seed keeps the short pivot episode review-addressable", () => {
  const diagnostics = generateScore({
    seed: "seed-1dxb2n8-1miapx7",
    lengthTicks: TICKS_PER_QUARTER * 80,
  }).diagnostics;
  const reportedEpisode = diagnostics.sectionPlans.find(
    (plan) => plan.state === "episode" && plan.startTick === TICKS_PER_QUARTER * 19,
  );
  const followingStretto = diagnostics.sectionPlans.find(
    (plan) => plan.state === "stretto-like" && plan.startTick === TICKS_PER_QUARTER * 27,
  );
  const harmonicWindow = diagnostics.harmonicContinuity.windows.find(
    (window) => window.startTick === TICKS_PER_QUARTER * 19,
  );
  const acceptanceWindow = diagnostics.scoreWindowAcceptance.windows.find(
    (window) => window.kind === "harmonic-continuity" && window.startTick === TICKS_PER_QUARTER * 19,
  );

  assert.ok(reportedEpisode !== undefined, "reported seed should expose the episode starting at measure 5 beat 4");
  assert.deepEqual(pivotPlanSignature(reportedEpisode), {
    localTonic: "D",
    localMode: "minor",
    targetTonic: "E",
    targetMode: "minor",
    cadenceKind: "modulatory",
    ambiguityIntent: "pivot-harmony",
    sequencePattern: "circle-fifths",
    fragmentTransform: "inversion",
  });
  assert.equal(followingStretto?.startTick, TICKS_PER_QUARTER * 27);
  assert.equal(followingStretto?.localKey.tonic, "A");
  assert.equal(followingStretto?.targetKey.tonic, "E");

  assert.equal(harmonicWindow?.classification, "audible-progression");
  assert.equal(harmonicWindow?.bassRootSupportCount, harmonicWindow?.structuralBeatCount);
  assert.equal(harmonicWindow?.chordToneSupportCount, harmonicWindow?.structuralBeatCount);
  assert.equal(harmonicWindow?.structuralBeatMismatchCount, 0);
  assert.equal(harmonicWindow?.thinStructuralBeatCount, 0);
  assert.equal(acceptanceWindow?.response, "accepted-context");
  assert.ok(diagnostics.texturePlanningReview.metricalHarmony.strongBeatBassRootSupportCount >= 12);
  assert.ok(diagnostics.harmonicFunctionMatches > 0);
});

test("focused harmonic-continuity review seeds expose repaired and remaining short-pivot evidence", () => {
  const summaries = HARMONIC_CONTINUITY_REVIEW_SEEDS.map((seed) => {
    const diagnostics = generateScore({ seed, lengthTicks: TICKS_PER_QUARTER * 80 }).diagnostics;

    return {
      seed,
      focusedWindowCount: diagnostics.harmonicContinuity.focusedWindowCount,
      reviewRequiredWindowCount: diagnostics.harmonicContinuity.reviewRequiredWindowCount,
      audibleProgressionWindowCount: diagnostics.harmonicContinuity.audibleProgressionWindowCount,
      structuralBeatMismatchCount: diagnostics.harmonicContinuity.windows.reduce(
        (sum, window) => sum + window.structuralBeatMismatchCount,
        0,
      ),
      subjectIdentityViolations: diagnostics.subjectIdentityViolations,
    };
  });

  assert.ok(
    summaries.every((summary) => summary.focusedWindowCount > 0),
    JSON.stringify(summaries, null, 2),
  );
  assert.ok(
    summaries.some((summary) => summary.audibleProgressionWindowCount > 0),
    JSON.stringify(summaries, null, 2),
  );
  assert.equal(summaries.find((summary) => summary.seed === "seed-1dxb2n8-1miapx7")?.audibleProgressionWindowCount, 1);
  assert.equal(summaries.find((summary) => summary.seed === "seed-1dxb2n8-1miapx7")?.reviewRequiredWindowCount, 2);
  assert.equal(summaries.find((summary) => summary.seed === "circle-fifths")?.reviewRequiredWindowCount, 3);
  assert.equal(summaries.find((summary) => summary.seed === "circle-fifths")?.structuralBeatMismatchCount, 8);
  assert.ok(
    summaries.every((summary) => summary.subjectIdentityViolations === 0),
    JSON.stringify(summaries, null, 2),
  );
});

function pivotPlanSignature(plan: HarmonicPlan): Record<string, string | undefined> {
  return {
    localTonic: plan.localKey.tonic,
    localMode: plan.localKey.mode,
    targetTonic: plan.targetKey.tonic,
    targetMode: plan.targetKey.mode,
    cadenceKind: plan.cadenceKind,
    ambiguityIntent: plan.ambiguityIntent,
    sequencePattern: plan.sequencePattern,
    fragmentTransform: plan.fragmentTransform,
  };
}
