import {
  DEFAULT_SELECTION_MODEL,
  type GenerationOutput,
  generateScore,
  type MetaEvent,
  planSegmentGenerationDeadlineResult,
  type ScoreEvent,
  type SegmentGenerationDeadlineResult,
} from "@fugematon/core";
import type {
  GenerationWorkerRequest,
  GenerationWorkerResponse,
  GenerationWorkerReviewSnapshot,
} from "./generation-worker-protocol.js";
import { createPlaybackModel } from "./score.js";

const workerScope = globalThis as unknown as {
  onmessage: ((event: MessageEvent<GenerationWorkerRequest>) => void) | null;
  postMessage: (message: GenerationWorkerResponse) => void;
};

workerScope.onmessage = (event) => {
  const request = event.data;
  const startedAtMs = performance.now();

  try {
    const output = generateScore({
      seed: request.seed,
      lengthTicks: request.lengthTicks,
      selectionModel: DEFAULT_SELECTION_MODEL,
    });
    const completedAtMs = performance.now();
    const hardConstraintsSatisfied = satisfiesGenerationHardConstraints(output);
    const deadlineResult = planSegmentGenerationDeadlineResult({
      mode: "continuous-fugue",
      segmentIndex: request.segmentIndex,
      startedAtMs,
      completedAtMs,
      deadlineMs: request.deadlineMs,
      generatedCandidateSatisfiesHardConstraints: hardConstraintsSatisfied,
      bestSoFarCandidateSatisfiesHardConstraints: false,
    });
    const playbackOutput = createGenerationWorkerPlaybackOutput(output, deadlineResult, request.lengthTicks);

    workerScope.postMessage({
      type: "generated",
      requestId: request.requestId,
      seed: request.seed,
      performanceProfileId: request.performanceProfileId,
      model: createPlaybackModel(playbackOutput, request.performanceProfileId),
      deadlineResult,
      reviewSnapshot: createReviewSnapshot(output, hardConstraintsSatisfied),
    });
  } catch (error) {
    workerScope.postMessage({
      type: "error",
      requestId: request.requestId,
      seed: request.seed,
      message: error instanceof Error ? error.message : "score generation failed",
    });
  }
};

export function createGenerationWorkerPlaybackOutput(
  output: GenerationOutput,
  deadlineResult: SegmentGenerationDeadlineResult,
  lengthTicks: number,
): GenerationOutput {
  if (deadlineResult.returnedCandidateKind === "generated") {
    return output;
  }

  return createConservativeFallbackOutput(output, lengthTicks);
}

function satisfiesGenerationHardConstraints(output: GenerationOutput): boolean {
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

function createReviewSnapshot(
  output: GenerationOutput,
  hardConstraintsSatisfied: boolean,
): GenerationWorkerReviewSnapshot {
  return {
    hardConstraintsSatisfied,
    fallbackPassageCount: output.diagnostics.fallbackPassageCount,
    issueCount: output.diagnostics.issues.length,
    warningCount: output.diagnostics.warnings.length,
    qualityVectorStatus: output.diagnostics.qualityVector.axes.some((axis) => axis.status === "review-required")
      ? "review-required"
      : "within-profile",
  };
}

function createConservativeFallbackOutput(output: GenerationOutput, lengthTicks: number): GenerationOutput {
  const events = createConservativeFallbackEvents(output.events, lengthTicks);

  return {
    events,
    diagnostics: {
      ...output.diagnostics,
      generatedUntilTick: lengthTicks,
      eventCount: events.length,
      noteCount: 0,
      stateTransitions: ["exposition"],
      subjectEntries: [],
      rangeViolations: 0,
      voiceCrossings: 0,
      subjectIdentityViolations: 0,
      answerPlanViolations: 0,
      keyMetadataMismatches: 0,
      unresolvedDissonanceCount: 0,
      allVoiceSilenceGapCount: 0,
    },
  };
}

function createConservativeFallbackEvents(events: readonly ScoreEvent[], lengthTicks: number): ScoreEvent[] {
  return [
    requireMetaEvent(events, "generator-version"),
    requireMetaEvent(events, "timebase"),
    requireMetaEvent(events, "tempo-change"),
    requireMetaEvent(events, "time-signature"),
    requireMetaEvent(events, "key-signature"),
    {
      kind: "meta",
      type: "state-change",
      tick: 0,
      payload: { state: "exposition" },
    },
    {
      kind: "meta",
      type: "score-end",
      tick: lengthTicks,
      payload: { lengthTicks },
    },
  ];
}

function requireMetaEvent<TType extends MetaEvent["type"]>(
  events: readonly ScoreEvent[],
  type: TType,
): Extract<MetaEvent, { type: TType }> {
  const event = events.find(
    (candidate): candidate is Extract<MetaEvent, { type: TType }> =>
      candidate.kind === "meta" && candidate.type === type,
  );

  if (event === undefined) {
    throw new Error(
      `web.generation-worker.missing-fallback-metadata: missing fallback metadata; why=conservative fallback must preserve score timing and key metadata; action=include a ${type} meta event in generated output`,
    );
  }

  return event;
}
