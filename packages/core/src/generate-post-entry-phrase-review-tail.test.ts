import assert from "node:assert/strict";
import test from "node:test";
import { TICKS_PER_QUARTER } from "./constants.js";
import type { GenerationOutput, NoteEvent } from "./events.js";
import { generateScore } from "./generate.js";

const scoreCache = new Map<string, GenerationOutput>();

test("score generation keeps tight-stretto first bass answer tail thinning review-visible", () => {
  const output = scoreForSeed("tight-stretto");
  const firstBassAnswer = output.diagnostics.subjectEntries.find(
    (entry) => entry.voice === "bass" && entry.state === "exposition" && entry.form === "answer",
  );
  assert.ok(firstBassAnswer !== undefined);

  const fifthBeatTick = firstBassAnswer.startTick + TICKS_PER_QUARTER * 4;
  const activeNotes = output.events.filter(
    (event): event is NoteEvent =>
      event.kind === "note" &&
      event.startTick <= fifthBeatTick &&
      fifthBeatTick < event.startTick + event.durationTicks,
  );
  const activeOutsideVoices = new Set(
    activeNotes.filter((note) => note.voice !== firstBassAnswer.voice).map((note) => note.voice),
  );
  const tailWindow = output.diagnostics.bassAnswerTailTexture.windows[0];

  assert.equal(activeOutsideVoices.size, 0);
  assert.equal(output.diagnostics.bassAnswerTailTexture.reviewRequired, true);
  assert.equal(tailWindow?.classification, "review-required");
  assert.ok((tailWindow?.zeroOutsideVoiceTicks ?? 0) <= TICKS_PER_QUARTER * 3);
  assert.equal(hardConstraintFailures(output), 0);
});

test("fugue-smoke keeps bass-answer tail thinning bounded and review-visible", () => {
  const output = scoreForSeed("fugue-smoke");
  const firstBassAnswer = output.diagnostics.subjectEntries.find(
    (entry) => entry.voice === "bass" && entry.state === "exposition" && entry.form === "answer",
  );
  assert.ok(firstBassAnswer !== undefined);
  const tailWindow = output.diagnostics.bassAnswerTailTexture.windows[0];

  assert.equal(output.diagnostics.bassAnswerTailTexture.reviewRequired, true);
  assert.equal(tailWindow?.classification, "review-required");
  assert.ok((tailWindow?.zeroOutsideVoiceTicks ?? 0) <= TICKS_PER_QUARTER * 3);
  assert.equal(output.diagnostics.bassAnswerTailTexture.supportRhythmReviewRequiredWindowCount, 0);
  assert.notEqual(tailWindow?.supportRhythmClassification, "unmotivated-tail-fragmentation");
  assert.equal(hardConstraintFailures(output), 0);
});

function scoreForSeed(seed: string): GenerationOutput {
  const cached = scoreCache.get(seed);
  if (cached !== undefined) {
    return cached;
  }
  const output = generateScore({ seed, lengthTicks: TICKS_PER_QUARTER * 288 });
  scoreCache.set(seed, output);
  return output;
}

function hardConstraintFailures(output: GenerationOutput): number {
  return (
    output.diagnostics.rangeViolations +
    output.diagnostics.voiceCrossings +
    output.diagnostics.subjectIdentityViolations +
    output.diagnostics.answerPlanViolations +
    output.diagnostics.keyMetadataMismatches +
    output.diagnostics.writingProfilePitchViolations
  );
}
