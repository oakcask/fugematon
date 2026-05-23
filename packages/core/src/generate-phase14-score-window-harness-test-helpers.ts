import assert from "node:assert/strict";
import { TICKS_PER_QUARTER } from "./constants.js";
import { generateScore } from "./generate.js";

export const PHASE_14_SCORE_WINDOW_HARNESS_SEEDS = [
  "bach-001",
  "tight-stretto",
  "circle-fifths",
  "dense-modal",
  "contrary-motion",
  "random-listen-check",
  "seed-0zereox-1v729ih",
] as const;

export function assertPhase14ScoreWindowHarnessInputs(seeds: readonly string[]): void {
  const summaries = seeds.map((seed) => {
    const diagnostics = generateScore({ seed, lengthTicks: TICKS_PER_QUARTER * 288 }).diagnostics;
    const scoreWindowInputs = {
      importantEntryWindowCount: diagnostics.entryBoundaryContinuity.importantEntryWindowCount,
      dissonanceWindowCount: diagnostics.phase14DissonanceTriage.windows.length,
      activeVoicePairSpanCount: diagnostics.qualityVector.voicePairSpans.length,
      counterSubjectWindowCount: diagnostics.qualityVector.counterSubjectWindows.length,
      phraseDevelopmentWindowCount: diagnostics.phase13ZReview.windowCount,
      metricExplanationCount: diagnostics.qualityVector.metricExplanations.length,
    };

    assert.equal(
      diagnostics.phase13ZReview.windowCount,
      diagnostics.phase13ZReview.windows.length,
      `${seed} phrase-development window count should match exposed windows`,
    );
    assert.ok(
      diagnostics.qualityVector.counterSubjectWindows.every(
        (window) => window.entryStartTick >= 0 && window.entryVoice.length > 0,
      ),
      `${seed} counter-subject windows should remain score-addressable`,
    );
    assert.ok(
      diagnostics.qualityVector.voicePairSpans.every(
        (span) => span.startTick >= 0 && span.durationTicks > 0 && span.symptom.length > 0,
      ),
      `${seed} active voice-pair spans should remain score-addressable`,
    );

    return { seed, ...scoreWindowInputs };
  });

  assert.ok(
    summaries.every((summary) => summary.importantEntryWindowCount > 0),
    JSON.stringify(summaries, null, 2),
  );
  assert.ok(
    summaries.every((summary) => summary.activeVoicePairSpanCount > 0),
    JSON.stringify(summaries, null, 2),
  );
  assert.ok(
    summaries.every((summary) => summary.counterSubjectWindowCount > 0),
    JSON.stringify(summaries, null, 2),
  );
  assert.ok(
    summaries.every((summary) => summary.phraseDevelopmentWindowCount > 0),
    JSON.stringify(summaries, null, 2),
  );
  assert.ok(
    summaries.every((summary) => summary.metricExplanationCount > 0),
    JSON.stringify(summaries, null, 2),
  );
  assert.ok(
    summaries.some((summary) => summary.dissonanceWindowCount > 0),
    JSON.stringify(summaries, null, 2),
  );
}
