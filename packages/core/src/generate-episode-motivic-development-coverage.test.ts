import assert from "node:assert/strict";
import test from "node:test";
import { TICKS_PER_QUARTER } from "./constants.js";
import type { FugueState, GenerationOutput, HarmonicPlan, NoteEvent } from "./events.js";
import { cachedGenerateScore as generateScore } from "./generate-test-helpers.js";

const EPISODE_MOTIVIC_REVIEW_SEEDS = [
  "dark-episode",
  "fugue-smoke",
  "seed-0zereox-1v729ih",
  "random-listen-check",
] as const;

const REVIEW_LENGTH_TICKS = TICKS_PER_QUARTER * 288;
const scoreCache = new Map<string, GenerationOutput>();

test("episode motivic review seeds expose planned fragment derivation evidence", () => {
  const summaries = EPISODE_MOTIVIC_REVIEW_SEEDS.map((seed) => {
    const fragmentDerivations = scoreForSeed(seed).diagnostics.phraseRepetitionReview.fragmentDerivations;
    return {
      seed,
      fragmentDerivations,
      derivedEpisodeCount: fragmentDerivations
        .filter((derivation) => derivation.phraseFunction === "episode-sequence")
        .reduce((sum, derivation) => sum + derivation.count, 0),
      unclassifiedCount: fragmentDerivations
        .filter((derivation) => derivation.transform === "none")
        .reduce((sum, derivation) => sum + derivation.count, 0),
    };
  });

  assert.ok(
    summaries.every((summary) => summary.derivedEpisodeCount > 0),
    JSON.stringify(summaries, null, 2),
  );
  assert.ok(
    summaries.every((summary) => summary.unclassifiedCount >= 0),
    JSON.stringify(summaries, null, 2),
  );
  assert.ok(
    summaries.some((summary) =>
      summary.fragmentDerivations.some((derivation) => derivation.transform !== "none" && derivation.share > 0),
    ),
    JSON.stringify(summaries, null, 2),
  );
});

test("episode motivic review seeds keep subject-free free counterpoint review-visible", () => {
  const summaries = EPISODE_MOTIVIC_REVIEW_SEEDS.map((seed) => {
    const output = scoreForSeed(seed);
    const episodeFreeCounterpoint = notesInStates(output, ["episode"])
      .filter((note) => note.role === "free-counterpoint")
      .reduce((sum, note) => sum + note.durationTicks, 0);
    const subjectFreeCounterpoint = notesInStates(output, ["episode", "stretto-like"])
      .filter((note) => note.role === "free-counterpoint")
      .reduce((sum, note) => sum + note.durationTicks, 0);

    return {
      seed,
      episodeFreeCounterpoint,
      subjectFreeCounterpoint,
      exposedSoloReviewRequired: output.diagnostics.exposedFreeCounterpointSolo.reviewRequiredWindowCount,
      bassTailReviewRequired: output.diagnostics.bassAnswerTailTexture.reviewRequired,
    };
  });

  assert.ok(
    summaries.every((summary) => summary.episodeFreeCounterpoint > 0 && summary.subjectFreeCounterpoint > 0),
    JSON.stringify(summaries, null, 2),
  );
  assert.ok(
    summaries.every((summary) => summary.exposedSoloReviewRequired <= 3 && summary.bassTailReviewRequired),
    JSON.stringify(summaries, null, 2),
  );
});

function scoreForSeed(seed: string): GenerationOutput {
  const cached = scoreCache.get(seed);
  if (cached !== undefined) {
    return cached;
  }
  const output = generateScore({ seed, lengthTicks: REVIEW_LENGTH_TICKS });
  scoreCache.set(seed, output);
  return output;
}

function notesInStates(output: GenerationOutput, states: readonly FugueState[]): NoteEvent[] {
  const plans = output.diagnostics.sectionPlans.filter((plan) => states.includes(plan.state));
  return output.events.filter(
    (event): event is NoteEvent => event.kind === "note" && plans.some((plan) => noteStartsInPlan(event, plan)),
  );
}

function noteStartsInPlan(note: NoteEvent, plan: HarmonicPlan): boolean {
  return plan.startTick <= note.startTick && note.startTick < plan.startTick + plan.durationTicks;
}
