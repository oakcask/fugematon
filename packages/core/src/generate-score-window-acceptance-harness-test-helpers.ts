import assert from "node:assert/strict";
import { TICKS_PER_QUARTER } from "./constants.js";
import { generateScore } from "./generate.js";

export const SCORE_WINDOW_ACCEPTANCE_HARNESS_SEEDS = [
  "bach-001",
  "tight-stretto",
  "circle-fifths",
  "dense-modal",
  "contrary-motion",
  "random-listen-check",
  "seed-0zereox-1v729ih",
] as const;

export function assertScoreWindowAcceptanceHarnessInputs(seeds: readonly string[]): void {
  const summaries = seeds.map((seed) => {
    const diagnostics = generateScore({ seed, lengthTicks: TICKS_PER_QUARTER * 288 }).diagnostics;
    const scoreWindowInputs = {
      importantEntryWindowCount: diagnostics.entryBoundaryContinuity.importantEntryWindowCount,
      freeCounterpointSoloWindowCount: diagnostics.exposedFreeCounterpointSolo.windows.length,
      harmonicContinuityWindowCount: diagnostics.harmonicContinuity.windows.length,
      harmonicStasisRearticulationWindowCount: diagnostics.harmonicStasisRearticulation.windows.length,
      harmonicSonorityWindowCount: diagnostics.qualityVector.harmonicSonorities.windows.length,
      dissonanceWindowCount: diagnostics.dissonanceTriage.windows.length,
      activeVoicePairSpanCount: diagnostics.qualityVector.voicePairSpans.length,
      counterSubjectWindowCount: diagnostics.qualityVector.counterSubjectWindows.length,
      phraseDevelopmentWindowCount: diagnostics.phraseDevelopmentReview.windowCount,
      metricExplanationCount: diagnostics.qualityVector.metricExplanations.length,
    };
    const acceptance = diagnostics.scoreWindowAcceptance;

    assert.equal(
      diagnostics.phraseDevelopmentReview.windowCount,
      diagnostics.phraseDevelopmentReview.windows.length,
      `${seed} phrase-development window count should match exposed windows`,
    );
    assert.equal(acceptance.importantEntryWindowCount, scoreWindowInputs.importantEntryWindowCount);
    if (scoreWindowInputs.freeCounterpointSoloWindowCount > 0) {
      assert.ok(
        acceptance.windows.some((window) => window.kind === "free-counterpoint-solo"),
        `${seed} exposed free-counterpoint solo windows should be structurally classified`,
      );
    }
    if (diagnostics.entryBoundaryContinuity.windows.some((window) => window.form === "subject-fragment")) {
      assert.ok(
        acceptance.windows.some((window) => window.kind === "subject-fragment-entry-support"),
        `${seed} subject-fragment episode entries should be structurally classified`,
      );
    }
    assert.equal(acceptance.harmonicContinuityWindowCount, scoreWindowInputs.harmonicContinuityWindowCount);
    assert.equal(
      acceptance.harmonicStasisRearticulationWindowCount,
      scoreWindowInputs.harmonicStasisRearticulationWindowCount,
    );
    assert.equal(acceptance.harmonicSonorityWindowCount, scoreWindowInputs.harmonicSonorityWindowCount);
    assert.equal(acceptance.dissonanceWindowCount, scoreWindowInputs.dissonanceWindowCount);
    assert.equal(acceptance.activeVoicePairSpanCount, scoreWindowInputs.activeVoicePairSpanCount);
    assert.equal(acceptance.counterSubjectWindowCount, scoreWindowInputs.counterSubjectWindowCount);
    assert.equal(acceptance.phraseDevelopmentWindowCount, scoreWindowInputs.phraseDevelopmentWindowCount);
    assert.equal(acceptance.metricExplanationCount, scoreWindowInputs.metricExplanationCount);
    assert.ok(
      acceptance.windows.every(
        (window) => window.startTick >= 0 && window.classification.length > 0 && window.symptom.length > 0,
      ),
      `${seed} acceptance windows should remain score-addressable`,
    );
    assert.ok(
      acceptance.windows.every(
        (window) =>
          window.theoryBasis === "counterpoint" ||
          window.theoryBasis === "harmony" ||
          window.theoryBasis === "fugue-form" ||
          window.theoryBasis === "diagnostic-truthfulness",
      ),
      `${seed} acceptance windows should identify their theory basis`,
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
