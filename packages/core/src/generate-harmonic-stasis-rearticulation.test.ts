import assert from "node:assert/strict";
import test from "node:test";
import { TICKS_PER_QUARTER } from "./constants.js";
import { generateScore } from "./generate.js";

const FOCUSED_LENGTH_TICKS = TICKS_PER_QUARTER * 64;

test("harmonic stasis rearticulation exposes the reported first-episode handoff", () => {
  const { diagnostics } = generateScore({ seed: "seed-1syy921-0025pp1", lengthTicks: FOCUSED_LENGTH_TICKS });
  const firstEpisode = diagnostics.sectionPlans.find((plan) => plan.state === "episode");
  assert.ok(firstEpisode);

  const windows = diagnostics.harmonicStasisRearticulation.windows.filter(
    (window) =>
      firstEpisode.startTick <= window.startTick &&
      window.startTick < firstEpisode.startTick + firstEpisode.durationTicks,
  );

  assert.ok(windows.some((window) => window.firstEpisodeHandoff));
  assert.ok(windows.some((window) => window.allActiveVoicesFreeCounterpoint));
  assert.ok(windows.some((window) => window.classification === "generator-response"));
  assert.ok(windows.some((window) => window.sourceMotive === "answer-form" && window.preparesNextEntry));
  assert.equal(hardConstraintFailures(diagnostics), 0);
});

test("harmonic stasis rearticulation keeps focused seed evidence review-visible", () => {
  const seeds = [
    "seed-07mwf08-1te3e2o",
    "seed-1db5j19-1nhjtae",
    "fugue-smoke",
    "modal-cadence",
    "dark-episode",
    "tight-stretto",
  ] as const;
  const summaries = seeds.map((seed) => {
    const { diagnostics } = generateScore({ seed, lengthTicks: FOCUSED_LENGTH_TICKS });
    return {
      seed,
      focusedWindowCount: diagnostics.harmonicStasisRearticulation.focusedWindowCount,
      hardConstraintFailures: hardConstraintFailures(diagnostics),
    };
  });

  assert.ok(summaries.some((summary) => summary.focusedWindowCount > 0));
  assert.ok(summaries.every((summary) => summary.hardConstraintFailures === 0));
});

function hardConstraintFailures(diagnostics: ReturnType<typeof generateScore>["diagnostics"]): number {
  return (
    diagnostics.rangeViolations +
    diagnostics.voiceCrossings +
    diagnostics.subjectIdentityViolations +
    diagnostics.answerPlanViolations +
    diagnostics.keyMetadataMismatches
  );
}
