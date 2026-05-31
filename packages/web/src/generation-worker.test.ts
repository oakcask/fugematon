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
  assert.equal(response.performanceProfileId, "strict-counterpoint");
  assert.equal(response.model.performanceProfile.id, "strict-counterpoint");
  assert.ok(response.model.notes.length > 0);
  assert.equal(response.deadlineResult.segmentIndex, 7);
  assert.equal(response.deadlineResult.timedOut, false);
  assert.equal(response.deadlineResult.referenceDiagnosticsPreserved, true);
  assert.equal(response.deadlineResult.qualityVectorPreserved, true);
  assert.ok(response.deadlineResult.reviewSignalsRemainVisible.length > 0);
  assert.equal(response.deadlineResult.hardConstraintSatisfied, true);
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

async function dispatchWorkerRequest(request: GenerationWorkerRequest): Promise<GenerationWorkerResponse> {
  const messages: GenerationWorkerResponse[] = [];
  workerScope.postMessage = (message) => {
    messages.push(message);
  };

  await workerReady;
  const handler = workerScope.onmessage;
  if (handler === null) {
    assert.fail("worker message handler was not registered");
  }
  handler({ data: request } as MessageEvent<GenerationWorkerRequest>);
  assert.equal(messages.length, 1);

  return messages[0]!;
}
