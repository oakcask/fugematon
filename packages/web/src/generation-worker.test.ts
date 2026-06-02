import assert from "node:assert/strict";
import test from "node:test";
import { generateScore, planSegmentGenerationDeadlineResult } from "@fugematon/core";
import type { GenerationWorkerRequest, GenerationWorkerResponse } from "./generation-worker-protocol.js";

type WorkerHarnessScope = typeof globalThis & {
  onmessage: ((event: MessageEvent<GenerationWorkerRequest>) => void) | null;
  postMessage: (message: GenerationWorkerResponse) => void;
};

const workerScope = globalThis as WorkerHarnessScope;
const workerReady = import("./generation-worker.js");

test("generation worker returns a playback model with deadline and review signal records", async () => {
  const response = await dispatchWorkerRequest({
    requestId: 41,
    seed: "fugue-smoke",
    performanceProfileId: "strict-counterpoint",
    lengthTicks: 1920,
    deadlineMs: 60_000,
    segmentIndex: 7,
  });

  assert.equal(response.type, "generated");
  assert.equal(response.requestId, 41);
  assert.equal(response.seed, "fugue-smoke");
  assert.equal(response.writingProfileId, "four-voice-default");
  assert.equal(response.performanceProfileId, "strict-counterpoint");
  assert.equal(response.model.performanceProfile.id, "strict-counterpoint");
  assert.ok(response.model.notes.length > 0);
  assert.equal(response.deadlineResult.segmentIndex, 7);
  assert.equal(response.deadlineResult.timedOut, false);
  assert.equal(response.deadlineResult.referenceDiagnosticsPreserved, true);
  assert.equal(response.deadlineResult.qualityVectorPreserved, true);
  assert.ok(response.deadlineResult.reviewSignalsRemainVisible.length > 0);
  assert.equal(response.deadlineResult.hardConstraintSatisfied, true);
  assert.equal(response.nextSegmentSnapshot.segmentIndex, 7);
  assert.match(
    response.reviewSnapshot.continuousSegmentContinuityStatus,
    /^(accepted-continuation|prepared-subject-return|prepared-stretto|developmental-episode|review-required-reexposition|generator-response-required-reset)$/,
  );
  assert.equal(
    response.reviewSnapshot.hardConstraintsSatisfied,
    response.deadlineResult.returnedCandidateKind === "generated",
  );
  assert.ok(response.reviewSnapshot.fallbackPassageCount >= 0);
  assert.ok(response.reviewSnapshot.issueCount >= 0);
  assert.ok(response.reviewSnapshot.warningCount >= 0);
  assert.match(response.reviewSnapshot.qualityVectorStatus, /^(review-required|within-profile)$/);
  assert.match(
    response.reviewSnapshot.terminalClosureStatus,
    /^(not-required|accepted|review-required|generator-response-required)$/,
  );
  assert.match(
    response.reviewSnapshot.terminalClosureSource,
    /^(generated-coda|fallback-terminal-closure|bridge-compatible-closure|ordinary-terminal-cadence|not-required)$/,
  );
});

test("generation worker passes the selected writing profile into score generation", async () => {
  const response = await dispatchWorkerRequest({
    requestId: 48,
    seed: "fugue-smoke",
    writingProfileId: "piano-two-hand",
    performanceProfileId: "strict-counterpoint",
    lengthTicks: 1920,
    deadlineMs: 60_000,
    segmentIndex: 0,
  });

  assert.equal(response.type, "generated");
  assert.equal(response.writingProfileId, "piano-two-hand");
  assert.equal(response.nextSegmentSnapshot.writingProfile.id, "piano-two-hand");
  assert.equal(response.nextSegmentSnapshot.writingProfile.version, 1);
});

test("generation worker passes continuous-fugue snapshots into continuation generation", async () => {
  const first = await dispatchWorkerRequest({
    requestId: 45,
    seed: "fugue-smoke",
    performanceProfileId: "strict-counterpoint",
    lengthTicks: 7680,
    deadlineMs: 60_000,
    segmentIndex: 0,
    mode: "continuous-fugue",
  });
  assert.equal(first.type, "generated");

  const second = await dispatchWorkerRequest({
    requestId: 46,
    seed: "fugue-smoke",
    performanceProfileId: "strict-counterpoint",
    lengthTicks: 7680,
    deadlineMs: 60_000,
    segmentIndex: 1,
    mode: "continuous-fugue",
    previousSegmentSnapshot: first.nextSegmentSnapshot,
  });

  assert.equal(second.type, "generated");
  assert.equal(second.seed, "fugue-smoke");
  assert.equal(second.nextSegmentSnapshot.segmentIndex, 1);
  assert.notEqual(second.model.stateTransitions[0], "exposition");
  assert.notEqual(second.reviewSnapshot.continuousSegmentContinuityStatus, "generator-response-required-reset");
});

test("generation worker preserves endless-program mode in deadline records", async () => {
  const response = await dispatchWorkerRequest({
    requestId: 43,
    seed: "modal-cadence",
    performanceProfileId: "strict-counterpoint",
    lengthTicks: 1920,
    deadlineMs: 60_000,
    segmentIndex: 10,
    mode: "endless-program",
  });

  assert.equal(response.type, "generated");
  assert.equal(response.deadlineResult.mode, "endless-program");
  assert.equal(response.deadlineResult.segmentIndex, 10);
  assert.equal(response.deadlineResult.referenceDiagnosticsPreserved, true);
  assert.equal(response.deadlineResult.qualityVectorPreserved, true);
  assert.ok(response.deadlineResult.reviewSignalsRemainVisible.includes("score-window-acceptance"));
  assert.equal(response.reviewSnapshot.terminalClosureStatus, "accepted");
});

test("generation worker keeps audible endless output with generated coda review signals", async () => {
  const response = await dispatchWorkerRequest({
    requestId: 44,
    seed: "seed-19l7uit-1u226cc-segment-1",
    performanceProfileId: "strict-counterpoint",
    lengthTicks: 129_600,
    deadlineMs: 240_000,
    segmentIndex: 1,
    mode: "endless-program",
  });

  assert.equal(response.type, "generated");
  assert.notEqual(response.deadlineResult.returnedCandidateKind, "conservative-fallback");
  assert.equal(response.deadlineResult.segmentIndex, 1);
  assert.equal(response.reviewSnapshot.terminalClosureStatus, "accepted");
  assert.equal(response.reviewSnapshot.terminalClosureSource, "generated-coda");
  assert.ok(response.model.notes.length > 0);
});

test("generation worker keeps note-bearing endless output when review defects remain", async () => {
  const response = await dispatchWorkerRequest({
    requestId: 47,
    seed: "seed-1bnmddk-0pzsjpu",
    performanceProfileId: "strict-counterpoint",
    lengthTicks: 129_600,
    deadlineMs: 240_000,
    segmentIndex: 0,
    mode: "endless-program",
  });

  assert.equal(response.type, "generated");
  assert.equal(response.deadlineResult.returnedCandidateKind, "best-so-far");
  assert.equal(response.reviewSnapshot.hardConstraintsSatisfied, false);
  assert.equal(response.reviewSnapshot.terminalClosureStatus, "accepted");
  assert.ok(response.model.notes.length > 0);
});

test("generation worker reports invalid deadline requests as error responses", async () => {
  const response = await dispatchWorkerRequest({
    requestId: 42,
    seed: "fugue-smoke",
    performanceProfileId: "strict-counterpoint",
    lengthTicks: 1920,
    deadlineMs: 0,
    segmentIndex: 8,
  });

  assert.equal(response.type, "error");
  assert.equal(response.requestId, 42);
  assert.equal(response.seed, "fugue-smoke");
  assert.match(response.message, /core\.infinite-playback\.invalid-deadline/);
});

test("generation worker playback output uses conservative fallback for unsafe deadline results", async () => {
  const { createGenerationWorkerPlaybackOutput } = await workerReady;
  const output = generateScore({ seed: "fugue-smoke", lengthTicks: 1920 });
  const deadlineResult = planSegmentGenerationDeadlineResult({
    mode: "continuous-fugue",
    segmentIndex: 9,
    startedAtMs: 0,
    completedAtMs: 2000,
    deadlineMs: 1500,
    generatedCandidateSatisfiesHardConstraints: false,
    bestSoFarCandidateSatisfiesHardConstraints: false,
  });
  const fallbackOutput = createGenerationWorkerPlaybackOutput(output, deadlineResult, 1920);

  assert.notEqual(fallbackOutput, output);
  assert.equal(
    fallbackOutput.events.some((event) => event.kind === "note"),
    false,
  );
  assert.equal(fallbackOutput.diagnostics.noteCount, 0);
  assert.equal(fallbackOutput.diagnostics.rangeViolations, 0);
  assert.equal(fallbackOutput.diagnostics.voiceCrossings, 0);
  assert.deepEqual(fallbackOutput.diagnostics.qualityVector, output.diagnostics.qualityVector);
  assert.equal(fallbackOutput.diagnostics.fallbackPassageCount, output.diagnostics.fallbackPassageCount);
});

test("generation worker playback output keeps safe best-so-far notes after deadline", async () => {
  const { createGenerationWorkerPlaybackOutput } = await workerReady;
  const output = generateScore({ seed: "fugue-smoke", lengthTicks: 1920 });
  const deadlineResult = planSegmentGenerationDeadlineResult({
    mode: "endless-program",
    segmentIndex: 9,
    startedAtMs: 0,
    completedAtMs: 2000,
    deadlineMs: 1500,
    generatedCandidateSatisfiesHardConstraints: true,
    bestSoFarCandidateSatisfiesHardConstraints: true,
  });
  const playbackOutput = createGenerationWorkerPlaybackOutput(output, deadlineResult, 1920);

  assert.equal(deadlineResult.returnedCandidateKind, "best-so-far");
  assert.equal(playbackOutput, output);
  assert.ok(playbackOutput.events.some((event) => event.kind === "note"));
  assert.ok(playbackOutput.diagnostics.noteCount > 0);
});

test("generation worker playback output keeps playable review-defective best-so-far notes after deadline", async () => {
  const { createGenerationWorkerPlaybackOutput } = await workerReady;
  const output = generateScore({
    seed: "seed-1bnmddk-0pzsjpu",
    lengthTicks: 129_600,
    mode: "endless-program",
  });
  const deadlineResult = planSegmentGenerationDeadlineResult({
    mode: "endless-program",
    segmentIndex: 0,
    startedAtMs: 0,
    completedAtMs: 2000,
    deadlineMs: 1500,
    generatedCandidateSatisfiesHardConstraints: false,
    bestSoFarCandidateSatisfiesHardConstraints: true,
  });
  const playbackOutput = createGenerationWorkerPlaybackOutput(output, deadlineResult, 129_600);

  assert.equal(deadlineResult.returnedCandidateKind, "best-so-far");
  assert.equal(playbackOutput, output);
  assert.equal(satisfiesReviewHardConstraints(output), false);
  assert.ok(playbackOutput.events.some((event) => event.kind === "note"));
  assert.ok(playbackOutput.diagnostics.noteCount > 0);
});

test("generation worker playback output uses conservative fallback for no-note deadline results", async () => {
  const { createGenerationWorkerPlaybackOutput } = await workerReady;
  const output = generateScore({ seed: "fugue-smoke", lengthTicks: 1920 });
  const noNoteOutput = {
    ...output,
    events: output.events.filter((event) => event.kind !== "note"),
    diagnostics: {
      ...output.diagnostics,
      eventCount: output.events.filter((event) => event.kind !== "note").length,
      noteCount: 0,
    },
  };
  const deadlineResult = planSegmentGenerationDeadlineResult({
    mode: "continuous-fugue",
    segmentIndex: 0,
    startedAtMs: 0,
    completedAtMs: 2000,
    deadlineMs: 1500,
    generatedCandidateSatisfiesHardConstraints: false,
    bestSoFarCandidateSatisfiesHardConstraints: false,
  });
  const fallbackOutput = createGenerationWorkerPlaybackOutput(noNoteOutput, deadlineResult, 1920);

  assert.equal(deadlineResult.returnedCandidateKind, "conservative-fallback");
  assert.notEqual(fallbackOutput, noNoteOutput);
  assert.equal(
    fallbackOutput.events.some((event) => event.kind === "note"),
    false,
  );
  assert.equal(fallbackOutput.diagnostics.noteCount, 0);
});

async function dispatchWorkerRequest(
  request: Omit<GenerationWorkerRequest, "writingProfileId"> &
    Partial<Pick<GenerationWorkerRequest, "writingProfileId">>,
): Promise<GenerationWorkerResponse> {
  const messages: GenerationWorkerResponse[] = [];
  workerScope.postMessage = (message) => {
    messages.push(message);
  };

  await workerReady;
  const handler = workerScope.onmessage;
  if (handler === null) {
    assert.fail("worker message handler was not registered");
  }
  handler({ data: { writingProfileId: "four-voice-default", ...request } } as MessageEvent<GenerationWorkerRequest>);
  assert.equal(messages.length, 1);

  return messages[0]!;
}

function satisfiesReviewHardConstraints(output: ReturnType<typeof generateScore>): boolean {
  const diagnostics = output.diagnostics;

  return (
    diagnostics.rangeViolations === 0 &&
    diagnostics.voiceCrossings === 0 &&
    diagnostics.subjectIdentityViolations === 0 &&
    diagnostics.answerPlanViolations === 0 &&
    diagnostics.keyMetadataMismatches === 0 &&
    diagnostics.unresolvedDissonanceCount === 0 &&
    diagnostics.allVoiceSilenceGapCount === 0
  );
}
