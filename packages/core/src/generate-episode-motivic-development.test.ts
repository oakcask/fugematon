import assert from "node:assert/strict";
import test from "node:test";
import { TICKS_PER_QUARTER } from "./constants.js";
import type { GenerationOutput, NoteEvent } from "./events.js";
import { cachedGenerateScore as generateScore } from "./generate-test-helpers.js";

const EPISODE_MOTIVIC_DEVELOPMENT_SEEDS = ["dark-episode", "fugue-smoke", "seed-0zereox-1v729ih"] as const;

const REVIEW_LENGTH_TICKS = TICKS_PER_QUARTER * 288;
const scoreCache = new Map<string, GenerationOutput>();

test("subject-free notes expose episode motivic derivation metadata", () => {
  const summaries = EPISODE_MOTIVIC_DEVELOPMENT_SEEDS.map((seed) => {
    const output = scoreForSeed(seed);
    const subjectFreeNotes = output.events.filter(
      (event): event is NoteEvent =>
        event.kind === "note" &&
        (event.role === "free-counterpoint" || event.role === "counter-subject") &&
        output.diagnostics.sectionPlans.some(
          (plan) =>
            plan.state !== "exposition" &&
            plan.startTick <= event.startTick &&
            event.startTick < plan.startTick + plan.durationTicks,
        ),
    );

    return {
      seed,
      subjectFreeNoteCount: subjectFreeNotes.length,
      derivedNoteCount: subjectFreeNotes.filter((note) => note.motivicDerivation !== undefined).length,
      transformationKinds: new Set(subjectFreeNotes.map((note) => note.motivicDerivation?.transformationKind)),
      targetFunctions: new Set(subjectFreeNotes.map((note) => note.motivicDerivation?.targetFunction)),
    };
  });

  assert.ok(
    summaries.every((summary) => summary.subjectFreeNoteCount > 0 && summary.derivedNoteCount > 0),
    JSON.stringify(summaries, null, 2),
  );
  assert.ok(
    summaries.some((summary) => summary.transformationKinds.size >= 3 && summary.targetFunctions.size >= 2),
    JSON.stringify(summaries, null, 2),
  );
});

test("episode motivic diagnostics summarize derivation coverage and stock formulas", () => {
  const summaries = EPISODE_MOTIVIC_DEVELOPMENT_SEEDS.map((seed) => {
    const summary = scoreForSeed(seed).diagnostics.episodeMotivicDevelopment;
    return {
      seed,
      summary,
    };
  });

  assert.ok(
    summaries.every(({ summary }) => summary.schemaVersion === 1 && summary.subjectFreeDurationTicks > 0),
    JSON.stringify(summaries, null, 2),
  );
  assert.ok(
    summaries.every(({ summary }) => summary.derivationCoverage >= 0.8 && summary.transformationVariety >= 3),
    JSON.stringify(summaries, null, 2),
  );
  assert.ok(
    summaries.every(
      ({ summary }) => summary.sourceMotiveDurations.length > 0 && summary.transformationDurations.length > 0,
    ),
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
