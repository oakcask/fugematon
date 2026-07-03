import assert from "node:assert/strict";
import { TICKS_PER_QUARTER } from "./constants.js";
import type { GenerationOutput } from "./events.js";
import { cachedGenerateScore as generateScore } from "./generate-test-helpers.js";
import { reviewTest } from "./test-profile.js";

const TEXTURE_CONTINUITY_REPAIR_REVIEW_SEEDS = [
  "seed-0i335vx-1n54a1x",
  "bach-001",
  "fugue-smoke",
  "minor-entry",
] as const;

const EXPECTS_REPORTED_SEED = true;

const REPAIR_REVIEW_LENGTH_TICKS = TICKS_PER_QUARTER * 288;
const scoreCache = new Map<string, GenerationOutput>();

reviewTest("texture-continuity repair seeds keep bass-answer tail thinning bounded and review-visible", () => {
  assertBassAnswerTailRepair(TEXTURE_CONTINUITY_REPAIR_REVIEW_SEEDS, EXPECTS_REPORTED_SEED);
});

reviewTest(
  "texture-continuity repair seeds keep exposed free-counterpoint solo windows bounded and review-visible",
  () => {
    assertExposedFreeCounterpointSoloRepair(TEXTURE_CONTINUITY_REPAIR_REVIEW_SEEDS);
  },
);

reviewTest("reported collective-rest seed keeps continuation density through the exposed measures", () => {
  const output = generateScore({ seed: "seed-14ghpmk-0gt2zr6", lengthTicks: TICKS_PER_QUARTER * 64 });

  const allowedDensityFailuresByMeasure = new Map<number, number>([
    [5, 1],
    [10, 2],
    [13, 4],
  ]);

  for (const measure of [5, 7, 10, 13]) {
    const startTick = (measure - 1) * TICKS_PER_QUARTER * 4;
    const endTick = startTick + TICKS_PER_QUARTER * 4;
    const windows = output.diagnostics.constraintSatisfactionReview.windows.filter(
      (window) => window.startTick < endTick && startTick < window.endTick,
    );
    const densityFailures = windows.reduce((sum, window) => {
      const counts = window.infeasibleConstraintCounts;
      return (
        sum +
        counts.minActiveVoiceViolation +
        counts.unsupportedSolo +
        counts.allVoiceSilence +
        counts.longUnplannedSilentRun
      );
    }, 0);

    assert.ok(
      densityFailures <= (allowedDensityFailuresByMeasure.get(measure) ?? 0),
      `measure ${measure} should not expose collective-rest density failures`,
    );
    assert.ok(
      longRestingVoiceCount(output, startTick, endTick) <= 1,
      `measure ${measure} should not leave multiple voices in long simultaneous rests`,
    );
  }
});

function assertBassAnswerTailRepair(seeds: readonly string[], expectsReportedSeed: boolean): void {
  const summaries = seeds.map((seed) => {
    const output = scoreForSeed(seed);
    const tailWindow = output.diagnostics.bassAnswerTailTexture.windows[0];
    assert.ok(tailWindow !== undefined, `${seed} should expose the first bass-answer tail window`);

    return {
      seed,
      reviewRequired: output.diagnostics.bassAnswerTailTexture.reviewRequired,
      classification: tailWindow.classification,
      zeroOutsideVoiceTicks: tailWindow.zeroOutsideVoiceTicks,
      oneOutsideVoiceTicks: tailWindow.oneOutsideVoiceTicks,
      minOutsideVoiceCount: tailWindow.minOutsideVoiceCount,
    };
  });

  if (expectsReportedSeed) {
    const reportedSeed = summaries.find((summary) => summary.seed === "seed-0i335vx-1n54a1x");
    assert.ok(reportedSeed !== undefined);
    assert.ok(reportedSeed.oneOutsideVoiceTicks < TICKS_PER_QUARTER * 2, JSON.stringify(summaries, null, 2));
    assert.equal(reportedSeed.classification, "review-required");
  }
  assert.ok(
    summaries.every(
      (summary) =>
        summary.minOutsideVoiceCount === 0 &&
        summary.reviewRequired &&
        summary.zeroOutsideVoiceTicks <= TICKS_PER_QUARTER * 3,
    ),
    JSON.stringify(summaries, null, 2),
  );
}

function assertExposedFreeCounterpointSoloRepair(seeds: readonly string[]): void {
  const summaries = seeds.map((seed) => {
    const summary = scoreForSeed(seed).diagnostics.exposedFreeCounterpointSolo;
    return {
      seed,
      reviewRequired: summary.reviewRequired,
      reviewRequiredWindowCount: summary.reviewRequiredWindowCount,
      functionExplainedWindowCount: summary.functionExplainedWindowCount,
      windows: summary.windows,
    };
  });

  assert.ok(
    summaries.every((summary) => summary.reviewRequiredWindowCount <= 5),
    JSON.stringify(summaries, null, 2),
  );
  assert.ok(
    summaries.some((summary) => summary.functionExplainedWindowCount > 0) ||
      summaries.every((summary) => summary.reviewRequiredWindowCount === 0),
    JSON.stringify(summaries, null, 2),
  );
}

function longRestingVoiceCount(output: GenerationOutput, startTick: number, endTick: number): number {
  const notes = output.events.filter((event) => event.kind === "note");
  const longRestSpans = (["soprano", "alto", "tenor", "bass"] as const).flatMap((voice) => {
    const voiceNotes = notes
      .filter((note) => note.voice === voice)
      .sort((left, right) => left.startTick - right.startTick);
    return voiceNotes.flatMap((note, index) => {
      const next = voiceNotes[index + 1];
      if (next === undefined) {
        return [];
      }
      const restStartTick = note.startTick + note.durationTicks;
      const restEndTick = next.startTick;
      if (restStartTick < endTick && startTick < restEndTick && restEndTick - restStartTick >= TICKS_PER_QUARTER) {
        return [{ voice, startTick: restStartTick, endTick: restEndTick }];
      }
      return [];
    });
  });

  return Math.max(
    0,
    ...longRestSpans.map(
      (span) =>
        new Set(
          longRestSpans
            .filter((other) => span.startTick < other.endTick && other.startTick < span.endTick)
            .filter(
              (other) =>
                Math.min(span.endTick, other.endTick) - Math.max(span.startTick, other.startTick) >= TICKS_PER_QUARTER,
            )
            .map((other) => other.voice),
        ).size,
    ),
  );
}

function scoreForSeed(seed: string): GenerationOutput {
  const cached = scoreCache.get(seed);
  if (cached !== undefined) {
    return cached;
  }
  const output = generateScore({ seed, lengthTicks: REPAIR_REVIEW_LENGTH_TICKS });
  scoreCache.set(seed, output);
  return output;
}
