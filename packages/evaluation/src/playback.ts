export type PairwisePlaybackSide = "a" | "b";

export type PairwisePlaybackState = {
  status: "ready" | "playing" | "paused" | "stopped" | "renderer-failure";
  activeSide?: PairwisePlaybackSide;
  positionTick: number;
  comparableEndTick: number;
  loop?: { startTick: number; endTick: number; enabled: boolean };
  sideStarts: Record<PairwisePlaybackSide, number>;
  sideStops: Record<PairwisePlaybackSide, number>;
  switchCount: number;
};

export function createPairwisePlaybackState(comparableEndTick: number): PairwisePlaybackState {
  return {
    status: "ready",
    positionTick: 0,
    comparableEndTick,
    sideStarts: { a: 0, b: 0 },
    sideStops: { a: 0, b: 0 },
    switchCount: 0,
  };
}

export function playPairwiseSide(state: PairwisePlaybackState, side: PairwisePlaybackSide): PairwisePlaybackState {
  const switching = state.status === "playing" && state.activeSide !== undefined && state.activeSide !== side;
  return {
    ...state,
    status: "playing",
    activeSide: side,
    sideStarts: { ...state.sideStarts, [side]: state.sideStarts[side] + 1 },
    sideStops:
      switching && state.activeSide !== undefined
        ? { ...state.sideStops, [state.activeSide]: state.sideStops[state.activeSide] + 1 }
        : state.sideStops,
    switchCount: state.switchCount + (switching ? 1 : 0),
  };
}

export function pausePairwisePlayback(state: PairwisePlaybackState, positionTick: number): PairwisePlaybackState {
  return stopActive(state, "paused", positionTick);
}

export function stopPairwisePlayback(state: PairwisePlaybackState): PairwisePlaybackState {
  return stopActive(state, "stopped", state.loop?.enabled ? state.loop.startTick : 0);
}

export function seekPairwisePlayback(state: PairwisePlaybackState, positionTick: number): PairwisePlaybackState {
  const lower = state.loop?.enabled ? state.loop.startTick : 0;
  const upper = state.loop?.enabled ? state.loop.endTick : state.comparableEndTick;
  return { ...state, positionTick: Math.max(lower, Math.min(upper, positionTick)) };
}

export function setPairwiseLoop(
  state: PairwisePlaybackState,
  loop: { startTick: number; endTick: number; enabled: boolean },
): PairwisePlaybackState {
  if (loop.startTick < 0 || loop.endTick <= loop.startTick || loop.endTick > state.comparableEndTick) {
    throw new Error(
      "evaluation.playback.invalid-loop: Loop bounds cannot be shared by both sides. Action: choose a positive region inside the comparable score range.",
    );
  }
  return seekPairwisePlayback({ ...state, loop }, state.positionTick);
}

export function failPairwiseRenderer(state: PairwisePlaybackState): PairwisePlaybackState {
  return stopActive(state, "renderer-failure", state.positionTick);
}

function stopActive(
  state: PairwisePlaybackState,
  status: PairwisePlaybackState["status"],
  positionTick: number,
): PairwisePlaybackState {
  return {
    ...state,
    status,
    positionTick: Math.max(0, Math.min(state.comparableEndTick, positionTick)),
    sideStops:
      state.status === "playing" && state.activeSide !== undefined
        ? { ...state.sideStops, [state.activeSide]: state.sideStops[state.activeSide] + 1 }
        : state.sideStops,
  };
}
