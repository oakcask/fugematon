import assert from "node:assert/strict";
import test from "node:test";
import { TICKS_PER_QUARTER } from "./constants.js";
import type { CandidateEvaluation, HarmonicPlan } from "./events.js";
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
  const selectedEpisode = selectedSectionAt(diagnostics.selectedCandidateEvaluations, TICKS_PER_QUARTER * 19);
  const selectedStretto = selectedSectionAt(diagnostics.selectedCandidateEvaluations, TICKS_PER_QUARTER * 27);

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

  assert.equal(selectedEpisode?.dimensions.harmony.features.strongBeatBassRootSupportCount, 0);
  assert.equal(selectedEpisode?.dimensions.harmony.features.strongBeatBassRootUnsupportedCount, 4);
  assert.equal(selectedEpisode?.dimensions.harmony.features.harmonicFunctionMismatches, 11);
  assert.equal(selectedStretto?.dimensions.harmony.features.strongBeatBassRootSupportCount, 0);
  assert.equal(selectedStretto?.dimensions.harmony.features.strongBeatBassRootUnsupportedCount, 5);
  assert.equal(selectedStretto?.dimensions.harmony.features.unresolvedSevereEntryIntervalCount, 3);
});

test("focused harmonic-continuity review seeds expose short-pivot bass-root pressure", () => {
  const summaries = HARMONIC_CONTINUITY_REVIEW_SEEDS.map((seed) => {
    const diagnostics = generateScore({ seed, lengthTicks: TICKS_PER_QUARTER * 80 }).diagnostics;
    const selectedEpisodeOrStretto = diagnostics.selectedCandidateEvaluations.filter((evaluation) =>
      sectionStateIsEpisodeOrStretto(evaluation),
    );

    return {
      seed,
      shortPivotEpisodeCount: diagnostics.sectionPlans.filter(
        (plan) =>
          plan.state === "episode" &&
          plan.ambiguityIntent === "pivot-harmony" &&
          plan.durationTicks <= TICKS_PER_QUARTER * 10,
      ).length,
      zeroBassRootSectionCount: selectedEpisodeOrStretto.filter(
        (evaluation) => evaluation.dimensions.harmony.features.strongBeatBassRootSupportCount === 0,
      ).length,
      bassRootUnsupportedTotal: selectedEpisodeOrStretto.reduce(
        (sum, evaluation) => sum + evaluation.dimensions.harmony.features.strongBeatBassRootUnsupportedCount,
        0,
      ),
      harmonicFunctionMismatchTotal: selectedEpisodeOrStretto.reduce(
        (sum, evaluation) => sum + evaluation.dimensions.harmony.features.harmonicFunctionMismatches,
        0,
      ),
    };
  });

  assert.ok(
    summaries.every((summary) => summary.shortPivotEpisodeCount > 0),
    JSON.stringify(summaries, null, 2),
  );
  assert.ok(
    summaries.every((summary) => summary.zeroBassRootSectionCount > 0),
    JSON.stringify(summaries, null, 2),
  );
  assert.ok(
    summaries.every((summary) => summary.bassRootUnsupportedTotal >= 9),
    JSON.stringify(summaries, null, 2),
  );
  assert.ok(
    summaries.every((summary) => summary.harmonicFunctionMismatchTotal >= 24),
    JSON.stringify(summaries, null, 2),
  );
});

function selectedSectionAt(
  evaluations: readonly CandidateEvaluation[],
  startTick: number,
): CandidateEvaluation | undefined {
  return evaluations.find((evaluation) => evaluation.explanations.sections[0]?.startTick === startTick);
}

function sectionStateIsEpisodeOrStretto(evaluation: CandidateEvaluation): boolean {
  const state = evaluation.explanations.sections[0]?.state;
  return state === "episode" || state === "stretto-like";
}

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
