import type { InfinitePlaybackMode } from "@fugematon/core";

export type EndlessPrefetchDeadlineInput = {
  modelTotalSeconds: number;
  playbackSecond: number;
  boundaryPauseMs: number;
  minimumDeadlineMs: number;
};

export function computeEndlessPrefetchDeadlineMs(input: EndlessPrefetchDeadlineInput): number {
  const remainingPlaybackMs = Math.max(0, input.modelTotalSeconds - input.playbackSecond) * 1000;
  const availableBeforeBoundaryMs = Math.max(0, remainingPlaybackMs - input.boundaryPauseMs);

  return Math.max(input.minimumDeadlineMs, Math.ceil(availableBeforeBoundaryMs));
}

export function isSegmentChainingPlaybackMode(mode: InfinitePlaybackMode): boolean {
  return mode === "continuous-fugue" || mode === "endless-program" || mode === "regenerative-cycle";
}

export function segmentBoundaryPauseMs(mode: InfinitePlaybackMode, audibleBoundaryPauseMs: number): number {
  return mode === "endless-program" || mode === "regenerative-cycle" ? audibleBoundaryPauseMs : 0;
}
