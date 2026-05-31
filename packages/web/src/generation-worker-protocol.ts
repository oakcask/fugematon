import type {
  ContinuousSegmentContinuityClassification,
  InfinitePlaybackMode,
  SegmentGenerationDeadlineResult,
  SegmentSnapshot,
  TerminalClosureClassification,
  TerminalClosureSource,
} from "@fugematon/core";
import type { PerformanceProfileId } from "@fugematon/performance";
import type { PlaybackModel } from "./score.js";

export type GenerationWorkerRequest = {
  requestId: number;
  seed: string;
  performanceProfileId: PerformanceProfileId;
  lengthTicks: number;
  deadlineMs: number;
  segmentIndex: number;
  mode?: InfinitePlaybackMode;
  previousSegmentSnapshot?: SegmentSnapshot;
};

export type GenerationWorkerReviewSnapshot = {
  hardConstraintsSatisfied: boolean;
  fallbackPassageCount: number;
  issueCount: number;
  warningCount: number;
  qualityVectorStatus: string;
  terminalClosureStatus: TerminalClosureClassification;
  terminalClosureSource: TerminalClosureSource;
  continuousSegmentContinuityStatus: ContinuousSegmentContinuityClassification;
};

export type GenerationWorkerSuccessResponse = {
  type: "generated";
  requestId: number;
  seed: string;
  performanceProfileId: PerformanceProfileId;
  model: PlaybackModel;
  deadlineResult: SegmentGenerationDeadlineResult;
  reviewSnapshot: GenerationWorkerReviewSnapshot;
  nextSegmentSnapshot: SegmentSnapshot;
};

export type GenerationWorkerErrorResponse = {
  type: "error";
  requestId: number;
  seed: string;
  message: string;
};

export type GenerationWorkerResponse = GenerationWorkerSuccessResponse | GenerationWorkerErrorResponse;
