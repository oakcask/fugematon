import assert from "node:assert/strict";
import { TICKS_PER_QUARTER } from "./constants.js";
import { generateScore } from "./generate.js";

export const PHASE_14_REOPENED_REVIEW_SEED_GROUPS = {
  initial: ["fugue-smoke", "bach-001", "bright-answer", "dark-episode"],
  middle: ["ornament-test", "long-arc", "circle-fifths", "tight-stretto"],
  final: ["modal-cadence", "dense-modal", "seed-1dxb2n8-1miapx7"],
} as const;

export function assertPhase14ReviewSeedsImproveHarmonicContinuityEvidence(seeds: readonly string[]) {
  const summaries = seeds.map((seed) => {
    const diagnostics = generateScore({
      seed,
      lengthTicks: TICKS_PER_QUARTER * 288,
    }).diagnostics;

    return {
      seed,
      focusedWindowCount: diagnostics.harmonicContinuity.focusedWindowCount,
      generatorResponseWindowCount: diagnostics.harmonicContinuity.windows.filter(
        (window) => window.response === "generator-response-required",
      ).length,
      audibleProgressionWindowCount: diagnostics.harmonicContinuity.audibleProgressionWindowCount,
      transitionRhythmWindowCount: diagnostics.transitionRhythmReview.focusedWindowCount,
      transitionRhythmEvidenceCount: diagnostics.transitionRhythmReview.windows.filter(
        (window) =>
          window.attackCount > 0 &&
          window.shortAttackCount > 0 &&
          window.activeVoiceCount > 1 &&
          window.roleMix.includes("free-counterpoint"),
      ).length,
      earlyStrettoSonorityFailures: diagnostics.harmonicContinuity.windows
        .filter(
          (window) =>
            window.nextState === "stretto-like" &&
            window.classification === "audible-progression" &&
            window.startTick <= TICKS_PER_QUARTER * 24,
        )
        .flatMap((window) =>
          diagnostics.qualityVector.harmonicSonorities.windows.filter(
            (sonority) =>
              sonority.response === "generator-response-required" &&
              window.startTick <= sonority.startTick &&
              sonority.startTick < window.startTick + window.durationTicks,
          ),
        ),
      subjectIdentityViolations: diagnostics.subjectIdentityViolations,
    };
  });

  assert.ok(
    summaries.every((summary) => summary.focusedWindowCount > 0),
    JSON.stringify(summaries, null, 2),
  );
  assert.ok(
    summaries.every((summary) => summary.generatorResponseWindowCount <= 3),
    JSON.stringify(summaries, null, 2),
  );
  assert.ok(
    summaries.every((summary) => summary.transitionRhythmWindowCount > 0),
    JSON.stringify(summaries, null, 2),
  );
  assert.ok(
    summaries.every((summary) => summary.transitionRhythmEvidenceCount > 0),
    JSON.stringify(summaries, null, 2),
  );
  assert.ok(
    summaries.every((summary) => summary.earlyStrettoSonorityFailures.length === 0),
    JSON.stringify(summaries, null, 2),
  );
  assert.ok(
    summaries.every((summary) => summary.subjectIdentityViolations === 0),
    JSON.stringify(summaries, null, 2),
  );
}
