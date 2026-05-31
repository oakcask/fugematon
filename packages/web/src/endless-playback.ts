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
