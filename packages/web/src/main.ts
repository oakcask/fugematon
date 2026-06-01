import {
  FUGUE_FORM_REVIEW_LENGTH_TICKS,
  type InfinitePlaybackMode,
  planSegmentGenerationDeadlineResult,
  type SegmentGenerationDeadlineResult,
  type SegmentSnapshot,
} from "@fugematon/core";
import { listPerformanceProfiles, type PerformanceProfileId } from "@fugematon/performance";
import "./style.css";
import { ScorePlayer } from "./audio.js";
import {
  adoptedSegmentSessionSeed,
  computeEndlessPrefetchDeadlineMs,
  isSegmentChainingPlaybackMode,
  segmentBoundaryPauseMs,
  segmentRequestSeed,
  shouldDeferContinuousPrefetchUntilSegmentStart,
} from "./endless-playback.js";
import type { GenerationWorkerResponse, GenerationWorkerReviewSnapshot } from "./generation-worker-protocol.js";
import { drawPianoRoll } from "./piano-roll.js";
import {
  appendPlaybackModelSessionTimeline,
  DEFAULT_WEB_PERFORMANCE_PROFILE_ID,
  formatKeySignature,
  formatPlaybackPosition,
  formatTimeSignature,
  type PlaybackModel,
} from "./score.js";

const URL_SEED_PARAM = "seed";
const URL_DEBUG_PARAM = "debug";
const ENDLESS_DEBUG_VALUE = "endless";
const DEBUG_STORAGE_KEY = "fugematon.debug";
const SCORE_LENGTH_TICKS = FUGUE_FORM_REVIEW_LENGTH_TICKS;
const GENERATION_DEADLINE_MS = 10_000;
const AUDIBLE_BOUNDARY_PAUSE_MS = 750;

type UrlUpdateMode = "push" | "replace" | "none";
type GenerationStatus = "idle" | "generating" | "best-so-far-fallback" | "ready" | "failed";
type NextSegmentStatus = "idle" | "prefetching" | "ready" | "failed";

type AppState = {
  seed: string;
  performanceProfileId: PerformanceProfileId;
  playbackMode: InfinitePlaybackMode;
  segmentIndex: number;
  model?: PlaybackModel;
  sessionModel?: PlaybackModel;
  segmentPlaybackOffsetSecond: number;
  generationStatus: GenerationStatus;
  nextSegmentStatus: NextSegmentStatus;
  deadlineResult?: SegmentGenerationDeadlineResult;
  reviewSnapshot?: GenerationWorkerReviewSnapshot;
  nextSegmentSnapshot?: SegmentSnapshot;
};

type PrefetchedSegment = {
  seed: string;
  performanceProfileId: PerformanceProfileId;
  model: PlaybackModel;
  sessionModel?: PlaybackModel;
  segmentPlaybackOffsetSecond: number;
  deadlineResult: SegmentGenerationDeadlineResult;
  reviewSnapshot: GenerationWorkerReviewSnapshot;
  nextSegmentSnapshot: SegmentSnapshot;
};

type DebugValue = string | number | boolean | undefined;

const app = requireElement(document.querySelector<HTMLDivElement>("#app"), "app root");

let state = createPendingState(readInitialSeed());

app.innerHTML = `
  <section class="shell">
    <div class="hero">
      <p class="eyebrow">deterministic counterpoint machine</p>
      <h1>Fugematon</h1>
      <p class="lede">Generate four-voice fugue for browser playback.</p>
    </div>
    <form class="control-card" id="seed-form">
      <label for="seed">Seed</label>
      <div class="seed-row">
        <input id="seed" name="seed" autocomplete="off" spellcheck="false" />
        <select id="performance-profile" name="performance-profile" aria-label="Performance profile"></select>
        <select id="playback-mode" name="playback-mode" aria-label="Playback mode">
          <option value="continuous-fugue">continuous fugue</option>
          <option value="endless-program">endless program</option>
        </select>
        <button type="button" class="secondary" id="random-seed">Random seed</button>
        <button type="submit">Regenerate</button>
      </div>
      <p class="hint">The same seed always produces the same score events.</p>
    </form>
    <section class="transport-card" aria-label="Playback controls">
      <div class="transport-summary">
        <span class="metric-label">Playback</span>
        <strong id="transport-status">Ready to play</strong>
        <span class="playback-position" id="playback-position"></span>
      </div>
      <div class="transport-actions">
        <button type="button" id="play-pause">Play</button>
        <button type="button" class="secondary" id="stop">Stop</button>
      </div>
    </section>
    <section class="visualizer-card" aria-label="Piano roll visualization">
      <canvas id="piano-roll"></canvas>
    </section>
    <section class="score-card" aria-live="polite">
      <div>
        <span class="metric-label">Tempo</span>
        <strong id="tempo"></strong>
      </div>
      <div>
        <span class="metric-label">Meter</span>
        <strong id="meter"></strong>
      </div>
      <div>
        <span class="metric-label">Key</span>
        <strong id="key-signature"></strong>
      </div>
      <div>
        <span class="metric-label">Notes</span>
        <strong id="notes"></strong>
      </div>
      <div>
        <span class="metric-label">Pitch span</span>
        <strong id="pitch-span"></strong>
      </div>
      <div>
        <span class="metric-label">States</span>
        <strong id="states"></strong>
      </div>
      <div>
        <span class="metric-label">Entries</span>
        <strong id="entries"></strong>
      </div>
      <div>
        <span class="metric-label">Generation</span>
        <strong id="generation-status"></strong>
      </div>
      <div>
        <span class="metric-label">Mode</span>
        <strong id="mode-status"></strong>
      </div>
      <div>
        <span class="metric-label">Segment</span>
        <strong id="segment-index"></strong>
      </div>
      <div>
        <span class="metric-label">Terminal closure</span>
        <strong id="terminal-closure-status"></strong>
      </div>
      <div>
        <span class="metric-label">Continuity</span>
        <strong id="continuity-status"></strong>
      </div>
      <div>
        <span class="metric-label">Deadline</span>
        <strong id="deadline-status"></strong>
      </div>
      <div>
        <span class="metric-label">Fallback</span>
        <strong id="fallback-status"></strong>
      </div>
    </section>
  </section>
`;

const seedForm = requireElement(document.querySelector<HTMLFormElement>("#seed-form"), "seed form");
const seedInput = requireElement(document.querySelector<HTMLInputElement>("#seed"), "seed input");
const performanceProfileSelect = requireElement(
  document.querySelector<HTMLSelectElement>("#performance-profile"),
  "performance profile select",
);
const playbackModeSelect = requireElement(
  document.querySelector<HTMLSelectElement>("#playback-mode"),
  "playback mode select",
);
const randomSeedButton = requireElement(
  document.querySelector<HTMLButtonElement>("#random-seed"),
  "random seed button",
);
const tempo = requireElement(document.querySelector<HTMLElement>("#tempo"), "tempo metric");
const meter = requireElement(document.querySelector<HTMLElement>("#meter"), "meter metric");
const keySignature = requireElement(document.querySelector<HTMLElement>("#key-signature"), "key signature metric");
const notes = requireElement(document.querySelector<HTMLElement>("#notes"), "notes metric");
const pitchSpan = requireElement(document.querySelector<HTMLElement>("#pitch-span"), "pitch span metric");
const states = requireElement(document.querySelector<HTMLElement>("#states"), "states metric");
const entries = requireElement(document.querySelector<HTMLElement>("#entries"), "entries metric");
const generationStatus = requireElement(
  document.querySelector<HTMLElement>("#generation-status"),
  "generation status metric",
);
const modeStatus = requireElement(document.querySelector<HTMLElement>("#mode-status"), "mode status metric");
const segmentIndexStatus = requireElement(
  document.querySelector<HTMLElement>("#segment-index"),
  "segment index metric",
);
const terminalClosureStatus = requireElement(
  document.querySelector<HTMLElement>("#terminal-closure-status"),
  "terminal closure status metric",
);
const continuityStatus = requireElement(
  document.querySelector<HTMLElement>("#continuity-status"),
  "continuity status metric",
);
const deadlineStatus = requireElement(
  document.querySelector<HTMLElement>("#deadline-status"),
  "deadline status metric",
);
const fallbackStatus = requireElement(
  document.querySelector<HTMLElement>("#fallback-status"),
  "fallback status metric",
);
const playPauseButton = requireElement(document.querySelector<HTMLButtonElement>("#play-pause"), "play/pause button");
const stopButton = requireElement(document.querySelector<HTMLButtonElement>("#stop"), "stop button");
const transportStatus = requireElement(document.querySelector<HTMLElement>("#transport-status"), "transport status");
const playbackPosition = requireElement(document.querySelector<HTMLElement>("#playback-position"), "playback position");
const pianoRoll = requireElement(document.querySelector<HTMLCanvasElement>("#piano-roll"), "piano roll");

seedInput.value = state.seed;
for (const profile of listPerformanceProfiles()) {
  performanceProfileSelect.add(new Option(profile.id, profile.id));
}
performanceProfileSelect.value = state.performanceProfileId;
playbackModeSelect.value = state.playbackMode;
render(state);
renderPlaybackPosition(0);

let player: ScorePlayer | undefined;
let animationFrame: number | undefined;
let playbackStartController: AbortController | undefined;
let pausedAtSecond = 0;
let hasPausedPlayback = false;
let generationTimeout: number | undefined;
let activePrimaryGenerationRequestId = 0;
let activePrefetchGenerationRequestId: number | undefined;
let nextGenerationRequestId = 0;
let nextSegmentIndex = 0;
let prefetchedSegment: PrefetchedSegment | undefined;
let segmentChainActive = false;
const generationWorker = new Worker(new URL("./generation-worker.ts", import.meta.url), { type: "module" });

generationWorker.addEventListener("message", (event: MessageEvent<GenerationWorkerResponse>) => {
  handleGenerationWorkerResponse(event.data);
});

renderTransportButtons();
regenerateScore(state.seed, "replace");

seedForm.addEventListener("submit", (event) => {
  event.preventDefault();
  regenerateScore(seedInput.value);
});

randomSeedButton.addEventListener("click", () => {
  regenerateScore(createRandomSeed());
});

playbackModeSelect.addEventListener("change", () => {
  regenerateScore(seedInput.value, "replace");
});

playPauseButton.addEventListener("click", () => {
  if (player?.isPlaying) {
    pausePlayback();
    return;
  }

  void startPlayback();
});

stopButton.addEventListener("click", () => {
  cancelPlayback();
  if (state.model !== undefined) {
    drawPianoRoll(pianoRoll, visualPlaybackModel(state), 0);
  }
  renderPlaybackPosition(0);
  transportStatus.textContent = "Playback stopped";
});

window.addEventListener("resize", () => {
  if (state.model === undefined) {
    return;
  }

  const playbackSecond = player?.playbackSecond ?? 0;
  drawPianoRoll(pianoRoll, visualPlaybackModel(state), playbackSecond);
  renderPlaybackPosition(playbackSecond);
});

window.addEventListener("popstate", () => {
  regenerateScore(readInitialSeed(), "none");
});

function regenerateScore(seed: string, urlUpdateMode: UrlUpdateMode = "push"): void {
  const nextSeed = seed.trim();
  if (nextSeed.length === 0) {
    seedInput.value = state.seed;
    return;
  }

  const playbackMode = playbackModeSelect.value as InfinitePlaybackMode;
  seedInput.value = nextSeed;
  cancelPlayback();
  prefetchedSegment = undefined;
  activePrefetchGenerationRequestId = undefined;
  nextSegmentIndex = 0;
  const requestId = nextRequestId();
  activePrimaryGenerationRequestId = requestId;
  const segmentIndex = 0;
  const performanceProfileId = performanceProfileSelect.value as PerformanceProfileId;
  state = {
    seed: nextSeed,
    performanceProfileId,
    playbackMode,
    segmentIndex,
    model: state.model,
    sessionModel: state.sessionModel,
    segmentPlaybackOffsetSecond: 0,
    generationStatus: "generating",
    nextSegmentStatus: "idle",
  };
  render(state);
  if (state.model !== undefined) {
    drawPianoRoll(pianoRoll, visualPlaybackModel(state), 0);
  }
  renderPlaybackPosition(0);
  transportStatus.textContent = "Generating score";
  writeUrlSeed(nextSeed, urlUpdateMode);
  queueGenerationFallback(requestId, segmentIndex);
  generationWorker.postMessage({
    requestId,
    seed: nextSeed,
    performanceProfileId,
    lengthTicks: SCORE_LENGTH_TICKS,
    deadlineMs: GENERATION_DEADLINE_MS,
    segmentIndex,
    mode: playbackMode,
  });
}

function createRandomSeed(): string {
  const values = new Uint32Array(2);
  window.crypto.getRandomValues(values);
  return `seed-${Array.from(values, (value) => value.toString(36).padStart(7, "0")).join("-")}`;
}

function readInitialSeed(): string {
  return readUrlSeed(createRandomSeed());
}

function createPendingState(
  seed: string,
  performanceProfileId: PerformanceProfileId = DEFAULT_WEB_PERFORMANCE_PROFILE_ID,
): AppState {
  return {
    seed,
    performanceProfileId,
    playbackMode: "continuous-fugue",
    segmentIndex: 0,
    segmentPlaybackOffsetSecond: 0,
    generationStatus: "idle",
    nextSegmentStatus: "idle",
  };
}

function nextRequestId(): number {
  nextGenerationRequestId += 1;
  return nextGenerationRequestId;
}

function readUrlSeed(fallbackSeed: string): string {
  const seed = new URLSearchParams(window.location.search).get(URL_SEED_PARAM)?.trim();
  return seed && seed.length > 0 ? seed : fallbackSeed;
}

function writeUrlSeed(seed: string, mode: UrlUpdateMode): void {
  if (mode === "none") {
    return;
  }

  const url = new URL(window.location.href);
  url.searchParams.set(URL_SEED_PARAM, seed);
  const nextUrl = `${url.pathname}${url.search}${url.hash}`;
  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;

  if (nextUrl === currentUrl) {
    return;
  }

  if (mode === "replace") {
    window.history.replaceState(null, "", nextUrl);
    return;
  }

  window.history.pushState(null, "", nextUrl);
}

function logEndlessDebug(event: string, details: Record<string, DebugValue> = {}): void {
  if (!isEndlessDebugEnabled()) {
    return;
  }

  console.debug("[fugematon:endless]", event, {
    seed: state.seed,
    mode: state.playbackMode,
    segmentIndex: state.segmentIndex,
    nextSegmentStatus: state.nextSegmentStatus,
    activePrefetchGenerationRequestId,
    prefetchedSegmentIndex: prefetchedSegment?.deadlineResult.segmentIndex,
    playerSecond: roundDebugSecond(player?.playbackSecond),
    modelNotes: state.model?.notes.length,
    ...details,
  });
}

function isEndlessDebugEnabled(): boolean {
  const urlDebug = new URLSearchParams(window.location.search).get(URL_DEBUG_PARAM);
  const storedDebug = safeReadDebugStorage();

  return debugValueIncludes(urlDebug, ENDLESS_DEBUG_VALUE) || debugValueIncludes(storedDebug, ENDLESS_DEBUG_VALUE);
}

function safeReadDebugStorage(): string | undefined {
  try {
    return window.localStorage.getItem(DEBUG_STORAGE_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

function debugValueIncludes(value: string | undefined | null, expected: string): boolean {
  return (value ?? "")
    .split(",")
    .map((part) => part.trim())
    .includes(expected);
}

function roundDebugSecond(value: number | undefined): number | undefined {
  return value === undefined ? undefined : Math.round(value * 1000) / 1000;
}

function render(nextState: AppState): void {
  const model = nextState.model;

  tempo.textContent = model === undefined ? "..." : `${model.bpm} bpm`;
  meter.textContent = model === undefined ? "..." : formatTimeSignature(model.timeSignature);
  keySignature.textContent = model === undefined ? "..." : formatKeySignature(model.keySignature);
  notes.textContent = model === undefined ? "..." : `${model.notes.length}`;
  pitchSpan.textContent = model === undefined ? "..." : `${model.pitchRange.min}-${model.pitchRange.max}`;
  states.textContent = model === undefined ? "..." : `${new Set(model.stateTransitions).size}`;
  entries.textContent = model === undefined ? "..." : `${model.subjectEntries.length}`;
  generationStatus.textContent = formatGenerationStatus(nextState);
  modeStatus.textContent = formatPlaybackMode(nextState.playbackMode);
  segmentIndexStatus.textContent = `${nextState.segmentIndex}`;
  terminalClosureStatus.textContent = nextState.reviewSnapshot?.terminalClosureStatus ?? "...";
  continuityStatus.textContent = nextState.reviewSnapshot?.continuousSegmentContinuityStatus ?? "...";
  deadlineStatus.textContent = formatDeadlineStatus(nextState);
  fallbackStatus.textContent = formatFallbackStatus(nextState);
}

function renderPlaybackPosition(playbackSecond: number): void {
  if (state.model === undefined) {
    playbackPosition.textContent = "0s / pending";
    return;
  }

  playbackPosition.textContent = formatPlaybackPosition(playbackSecond, visualPlaybackModel(state));
}

function visualPlaybackModel(nextState: AppState): PlaybackModel {
  return nextState.playbackMode === "continuous-fugue" && nextState.sessionModel !== undefined
    ? nextState.sessionModel
    : nextState.model!;
}

function currentSegmentPlaybackSecond(): number {
  const playbackSecond = player?.playbackSecond ?? 0;

  return state.playbackMode === "continuous-fugue"
    ? Math.max(0, playbackSecond - state.segmentPlaybackOffsetSecond)
    : playbackSecond;
}

async function startPlayback(): Promise<void> {
  if (state.model === undefined) {
    transportStatus.textContent = "Waiting for generated score";
    renderTransportButtons();
    return;
  }

  const controller = new AbortController();
  const offsetSecond = pausedAtSecond;
  playbackStartController?.abort();
  playbackStartController = controller;
  transportStatus.textContent = "Starting playback";
  renderTransportButtons();
  renderPlaybackPosition(pausedAtSecond);

  try {
    player ??= new ScorePlayer();
    const model = visualPlaybackModel(state);
    const started = await player.play(model, { offsetSecond, signal: controller.signal });
    if (!started || controller.signal.aborted) {
      return;
    }

    pausedAtSecond = 0;
    hasPausedPlayback = false;
    segmentChainActive = isSegmentChainingPlaybackMode(state.playbackMode);
    transportStatus.textContent = isSegmentChainingPlaybackMode(state.playbackMode)
      ? "Playing segment"
      : "Playing score";
    setPlaybackFeedback(true);
    renderTransportButtons();
    prefetchNextSegment();
    startVisualizerLoop();
  } catch (error) {
    if (!controller.signal.aborted) {
      setPlaybackFeedback(false);
      transportStatus.textContent = error instanceof Error ? error.message : "Playback failed";
    }
  } finally {
    if (playbackStartController === controller) {
      playbackStartController = undefined;
    }
    if (playbackStartController === undefined) {
      renderTransportButtons();
    }
  }
}

function cancelPlayback(): void {
  segmentChainActive = false;
  playbackStartController?.abort();
  playbackStartController = undefined;
  player?.stop();
  pausedAtSecond = 0;
  hasPausedPlayback = false;
  cancelVisualizerLoop();
  setPlaybackFeedback(false);
  renderTransportButtons();
}

function pausePlayback(): void {
  if (player === undefined || !player.isPlaying) {
    return;
  }

  playbackStartController?.abort();
  segmentChainActive = false;
  playbackStartController = undefined;
  pausedAtSecond = player.pause();
  hasPausedPlayback = true;
  cancelVisualizerLoop();
  setPlaybackFeedback(false);
  if (state.model !== undefined) {
    drawPianoRoll(pianoRoll, visualPlaybackModel(state), pausedAtSecond);
  }
  renderPlaybackPosition(pausedAtSecond);
  transportStatus.textContent = "Playback paused";
  renderTransportButtons();
}

function startVisualizerLoop(): void {
  cancelVisualizerLoop();

  const drawFrame = () => {
    if (state.model === undefined) {
      animationFrame = undefined;
      return;
    }

    const playbackSecond = player?.playbackSecond ?? 0;
    drawPianoRoll(pianoRoll, visualPlaybackModel(state), playbackSecond);
    renderPlaybackPosition(playbackSecond);

    if (player?.isPlaying) {
      if (segmentChainActive && state.playbackMode === "continuous-fugue") {
        prefetchNextSegment();
      }
      animationFrame = window.requestAnimationFrame(drawFrame);
      return;
    }

    animationFrame = undefined;
    setPlaybackFeedback(false);
    pausedAtSecond = 0;
    hasPausedPlayback = false;
    if (segmentChainActive && isSegmentChainingPlaybackMode(state.playbackMode)) {
      void continueSegmentPlayback();
      return;
    }

    transportStatus.textContent = "Playback complete";
    renderTransportButtons();
  };

  animationFrame = window.requestAnimationFrame(drawFrame);
}

function cancelVisualizerLoop(): void {
  if (animationFrame !== undefined) {
    window.cancelAnimationFrame(animationFrame);
    animationFrame = undefined;
  }
}

function setPlaybackFeedback(isPlaying: boolean): void {
  document.body.classList.toggle("is-playing", isPlaying);
}

function renderTransportButtons(): void {
  const isStarting = playbackStartController !== undefined;
  const isPlaying = player?.isPlaying ?? false;
  playPauseButton.disabled = isStarting || state.model === undefined;
  playPauseButton.textContent = isStarting ? "Starting" : renderPlayPauseLabel(isPlaying);
}

function queueGenerationFallback(requestId: number, segmentIndex: number): void {
  if (generationTimeout !== undefined) {
    window.clearTimeout(generationTimeout);
  }

  generationTimeout = window.setTimeout(() => {
    generationTimeout = undefined;

    if (requestId !== activePrimaryGenerationRequestId || state.model === undefined) {
      return;
    }

    state = {
      ...state,
      generationStatus: "best-so-far-fallback",
      deadlineResult: planSegmentGenerationDeadlineResult({
        mode: state.playbackMode,
        segmentIndex,
        startedAtMs: 0,
        completedAtMs: GENERATION_DEADLINE_MS + 1,
        deadlineMs: GENERATION_DEADLINE_MS,
        generatedCandidateSatisfiesHardConstraints: false,
        bestSoFarCandidateSatisfiesHardConstraints: true,
      }),
    };
    render(state);
    transportStatus.textContent = "Using best-so-far while generation finishes";
    renderTransportButtons();
  }, GENERATION_DEADLINE_MS);
}

function handleGenerationWorkerResponse(response: GenerationWorkerResponse): void {
  logEndlessDebug("worker-response", {
    requestId: response.requestId,
    responseType: response.type,
    responseSeed: response.seed,
    responseSegmentIndex: response.type === "generated" ? response.deadlineResult.segmentIndex : undefined,
    responseCandidateKind: response.type === "generated" ? response.deadlineResult.returnedCandidateKind : undefined,
    responseElapsedMs: response.type === "generated" ? Math.round(response.deadlineResult.elapsedMs) : undefined,
    responseTimedOut: response.type === "generated" ? response.deadlineResult.timedOut : undefined,
    responseNotes: response.type === "generated" ? response.model.notes.length : undefined,
    reviewHardConstraintsSatisfied:
      response.type === "generated" ? response.reviewSnapshot.hardConstraintsSatisfied : undefined,
    responseIssueCount: response.type === "generated" ? response.reviewSnapshot.issueCount : undefined,
    responseWarningCount: response.type === "generated" ? response.reviewSnapshot.warningCount : undefined,
    continuousSegmentContinuityStatus:
      response.type === "generated" ? response.reviewSnapshot.continuousSegmentContinuityStatus : undefined,
  });

  if (response.requestId === activePrefetchGenerationRequestId) {
    handlePrefetchGenerationWorkerResponse(response);
    return;
  }

  if (response.requestId !== activePrimaryGenerationRequestId) {
    return;
  }

  if (generationTimeout !== undefined) {
    window.clearTimeout(generationTimeout);
    generationTimeout = undefined;
  }

  if (response.type === "error") {
    state = {
      ...state,
      generationStatus: "failed",
    };
    render(state);
    transportStatus.textContent = response.message;
    renderTransportButtons();
    return;
  }

  nextSegmentIndex = response.deadlineResult.segmentIndex + 1;
  const preserveBestSoFarModel =
    state.generationStatus === "best-so-far-fallback" &&
    state.model !== undefined &&
    response.deadlineResult.returnedCandidateKind === "conservative-fallback";
  const model = preserveBestSoFarModel ? (state.model ?? response.model) : response.model;
  const generationStatus = preserveBestSoFarModel ? "best-so-far-fallback" : "ready";

  state = {
    seed: response.seed,
    performanceProfileId: response.performanceProfileId,
    playbackMode: response.deadlineResult.mode,
    segmentIndex: response.deadlineResult.segmentIndex,
    model,
    sessionModel: model,
    segmentPlaybackOffsetSecond: 0,
    generationStatus,
    nextSegmentStatus: state.nextSegmentStatus,
    deadlineResult: response.deadlineResult,
    reviewSnapshot: response.reviewSnapshot,
    nextSegmentSnapshot: response.nextSegmentSnapshot,
  };
  seedInput.value = response.seed;
  render(state);
  drawPianoRoll(pianoRoll, visualPlaybackModel(state), 0);
  renderPlaybackPosition(0);
  transportStatus.textContent = preserveBestSoFarModel ? "Keeping best-so-far after deadline" : "Ready to play";
  renderTransportButtons();
}

function handlePrefetchGenerationWorkerResponse(response: GenerationWorkerResponse): void {
  activePrefetchGenerationRequestId = undefined;

  if (response.type === "error") {
    logEndlessDebug("prefetch-error", {
      requestId: response.requestId,
      responseSeed: response.seed,
    });
    state = {
      ...state,
      nextSegmentStatus: "failed",
    };
    render(state);
    return;
  }

  const segmentPlaybackOffsetSecond =
    response.deadlineResult.mode === "continuous-fugue" && state.sessionModel !== undefined
      ? state.sessionModel.totalSeconds
      : 0;
  const sessionModel =
    response.deadlineResult.mode === "continuous-fugue" && state.sessionModel !== undefined
      ? appendPlaybackModelSessionTimeline(state.sessionModel, response.model)
      : undefined;
  prefetchedSegment = {
    seed: response.seed,
    performanceProfileId: response.performanceProfileId,
    model: response.model,
    sessionModel,
    segmentPlaybackOffsetSecond,
    deadlineResult: response.deadlineResult,
    reviewSnapshot: response.reviewSnapshot,
    nextSegmentSnapshot: response.nextSegmentSnapshot,
  };
  logEndlessDebug("prefetch-ready", {
    requestId: response.requestId,
    responseSeed: response.seed,
    responseSegmentIndex: response.deadlineResult.segmentIndex,
    responseCandidateKind: response.deadlineResult.returnedCandidateKind,
    responseElapsedMs: Math.round(response.deadlineResult.elapsedMs),
    responseTimedOut: response.deadlineResult.timedOut,
    responseNotes: response.model.notes.length,
    reviewHardConstraintsSatisfied: response.reviewSnapshot.hardConstraintsSatisfied,
    responseIssueCount: response.reviewSnapshot.issueCount,
    responseWarningCount: response.reviewSnapshot.warningCount,
    terminalClosureStatus: response.reviewSnapshot.terminalClosureStatus,
    continuousSegmentContinuityStatus: response.reviewSnapshot.continuousSegmentContinuityStatus,
  });
  state = {
    ...state,
    nextSegmentStatus: "ready",
  };
  render(state);
  if (state.playbackMode === "continuous-fugue" && queueContinuousSegmentPlayback(prefetchedSegment)) {
    return;
  }
  if (sessionModel !== undefined && state.playbackMode === "continuous-fugue") {
    const playbackSecond = player?.playbackSecond ?? 0;
    drawPianoRoll(pianoRoll, sessionModel, playbackSecond);
    renderPlaybackPosition(playbackSecond);
  }
}

function prefetchNextSegment(): void {
  if (
    !isSegmentChainingPlaybackMode(state.playbackMode) ||
    state.model === undefined ||
    activePrefetchGenerationRequestId !== undefined ||
    prefetchedSegment !== undefined
  ) {
    return;
  }

  const absolutePlaybackSecond = player?.playbackSecond ?? 0;
  if (
    shouldDeferContinuousPrefetchUntilSegmentStart({
      mode: state.playbackMode,
      playbackSecond: absolutePlaybackSecond,
      segmentPlaybackOffsetSecond: state.segmentPlaybackOffsetSecond,
    })
  ) {
    return;
  }

  const model = state.model;
  const segmentIndex = Math.max(nextSegmentIndex, state.segmentIndex + 1);
  nextSegmentIndex = segmentIndex;
  const requestId = nextRequestId();
  const playbackSecond = currentSegmentPlaybackSecond();
  const deadlineMs = computeEndlessPrefetchDeadlineMs({
    modelTotalSeconds: model.totalSeconds,
    playbackSecond,
    boundaryPauseMs: segmentBoundaryPauseMs(state.playbackMode, AUDIBLE_BOUNDARY_PAUSE_MS),
    minimumDeadlineMs: GENERATION_DEADLINE_MS,
  });
  const seed = segmentRequestSeed({
    mode: state.playbackMode,
    sessionSeed: state.seed,
    segmentIndex,
  });
  activePrefetchGenerationRequestId = requestId;
  state = {
    ...state,
    nextSegmentStatus: "prefetching",
  };
  render(state);
  logEndlessDebug("prefetch-request", {
    requestId,
    requestSeed: seed,
    requestSegmentIndex: segmentIndex,
    requestDeadlineMs: deadlineMs,
    currentModelTotalSeconds: roundDebugSecond(model.totalSeconds),
    currentPlaybackSecond: roundDebugSecond(playbackSecond),
    currentModelNotes: model.notes.length,
  });
  generationWorker.postMessage({
    requestId,
    seed,
    performanceProfileId: state.performanceProfileId,
    lengthTicks: SCORE_LENGTH_TICKS,
    deadlineMs,
    segmentIndex,
    mode: state.playbackMode,
    previousSegmentSnapshot: state.playbackMode === "continuous-fugue" ? state.nextSegmentSnapshot : undefined,
  });
}

async function continueSegmentPlayback(): Promise<void> {
  if (state.playbackMode === "continuous-fugue") {
    logEndlessDebug("chain-stop-continuous-not-queued", {
      nextSegmentAvailable: prefetchedSegment !== undefined,
    });
    segmentChainActive = false;
    transportStatus.textContent = "Playback complete";
    renderTransportButtons();
    return;
  }

  const boundaryPauseMs = segmentBoundaryPauseMs(state.playbackMode, AUDIBLE_BOUNDARY_PAUSE_MS);
  if (boundaryPauseMs > 0) {
    transportStatus.textContent = "Segment boundary";
    renderTransportButtons();
    await delay(boundaryPauseMs);
  }
  renderTransportButtons();
  prefetchNextSegment();
  const nextSegment = await waitForPrefetchedSegment();

  if (!segmentChainActive || !isSegmentChainingPlaybackMode(state.playbackMode) || nextSegment === undefined) {
    logEndlessDebug("chain-stop", {
      segmentChainActive,
      nextSegmentAvailable: nextSegment !== undefined,
    });
    segmentChainActive = false;
    transportStatus.textContent = "Playback complete";
    renderTransportButtons();
    return;
  }

  adoptPrefetchedSegment(nextSegment);
  void startPlayback();
}

function queueContinuousSegmentPlayback(segment: PrefetchedSegment): boolean {
  if (state.playbackMode !== "continuous-fugue" || !segmentChainActive || player === undefined) {
    return false;
  }

  const queued = player.queueNext(segment.model, segment.segmentPlaybackOffsetSecond);
  if (!queued) {
    logEndlessDebug("continuous-queue-rejected", {
      boundarySecond: roundDebugSecond(segment.segmentPlaybackOffsetSecond),
      playerSecond: roundDebugSecond(player.playbackSecond),
    });
    return false;
  }

  logEndlessDebug("continuous-queue-next", {
    boundarySecond: roundDebugSecond(segment.segmentPlaybackOffsetSecond),
    queuedSegmentIndex: segment.deadlineResult.segmentIndex,
  });
  adoptPrefetchedSegment(segment);
  transportStatus.textContent = "Playing segment";
  setPlaybackFeedback(true);
  renderTransportButtons();
  prefetchNextSegment();

  return true;
}

function adoptPrefetchedSegment(segment: PrefetchedSegment): void {
  logEndlessDebug("adopt-prefetch", {
    adoptedSeed: segment.seed,
    adoptedSegmentIndex: segment.deadlineResult.segmentIndex,
    adoptedCandidateKind: segment.deadlineResult.returnedCandidateKind,
    adoptedTimedOut: segment.deadlineResult.timedOut,
    adoptedNotes: segment.model.notes.length,
    reviewHardConstraintsSatisfied: segment.reviewSnapshot.hardConstraintsSatisfied,
    responseIssueCount: segment.reviewSnapshot.issueCount,
    responseWarningCount: segment.reviewSnapshot.warningCount,
    terminalClosureStatus: segment.reviewSnapshot.terminalClosureStatus,
  });
  prefetchedSegment = undefined;
  nextSegmentIndex = segment.deadlineResult.segmentIndex + 1;
  const seed = adoptedSegmentSessionSeed({
    mode: segment.deadlineResult.mode,
    currentSessionSeed: state.seed,
    responseSeed: segment.seed,
  });
  const sessionModel =
    segment.deadlineResult.mode === "continuous-fugue"
      ? (segment.sessionModel ??
        (state.sessionModel === undefined
          ? segment.model
          : appendPlaybackModelSessionTimeline(state.sessionModel, segment.model)))
      : segment.model;
  const segmentPlaybackOffsetSecond =
    segment.deadlineResult.mode === "continuous-fugue" ? segment.segmentPlaybackOffsetSecond : 0;
  state = {
    seed,
    performanceProfileId: segment.performanceProfileId,
    playbackMode: segment.deadlineResult.mode,
    segmentIndex: segment.deadlineResult.segmentIndex,
    model: segment.model,
    sessionModel,
    segmentPlaybackOffsetSecond,
    generationStatus: "ready",
    nextSegmentStatus: "idle",
    deadlineResult: segment.deadlineResult,
    reviewSnapshot: segment.reviewSnapshot,
    nextSegmentSnapshot: segment.nextSegmentSnapshot,
  };
  seedInput.value = seed;
  render(state);
  drawPianoRoll(pianoRoll, visualPlaybackModel(state), segmentPlaybackOffsetSecond);
  renderPlaybackPosition(segmentPlaybackOffsetSecond);
}

function waitForPrefetchedSegment(): Promise<PrefetchedSegment | undefined> {
  if (prefetchedSegment !== undefined) {
    logEndlessDebug("wait-prefetch-immediate", {
      waitSegmentIndex: prefetchedSegment.deadlineResult.segmentIndex,
      waitNotes: prefetchedSegment.model.notes.length,
    });
    return Promise.resolve(prefetchedSegment);
  }

  logEndlessDebug("wait-prefetch-start");
  return new Promise((resolve) => {
    const startedAtMs = performance.now();
    const interval = window.setInterval(() => {
      if (
        !segmentChainActive ||
        !isSegmentChainingPlaybackMode(state.playbackMode) ||
        state.nextSegmentStatus === "failed"
      ) {
        window.clearInterval(interval);
        logEndlessDebug("wait-prefetch-abort", {
          waitedMs: Math.round(performance.now() - startedAtMs),
          segmentChainActive,
        });
        resolve(undefined);
        return;
      }
      if (prefetchedSegment !== undefined) {
        window.clearInterval(interval);
        logEndlessDebug("wait-prefetch-ready", {
          waitedMs: Math.round(performance.now() - startedAtMs),
          waitSegmentIndex: prefetchedSegment.deadlineResult.segmentIndex,
          waitNotes: prefetchedSegment.model.notes.length,
        });
        resolve(prefetchedSegment);
        return;
      }
      if (performance.now() - startedAtMs > GENERATION_DEADLINE_MS * 2) {
        window.clearInterval(interval);
        logEndlessDebug("wait-prefetch-timeout", {
          waitedMs: Math.round(performance.now() - startedAtMs),
        });
        resolve(undefined);
      }
    }, 100);
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function formatGenerationStatus(nextState: AppState): string {
  switch (nextState.generationStatus) {
    case "idle":
      return "Pending worker";
    case "generating":
      return "Worker running";
    case "best-so-far-fallback":
      return "Best-so-far fallback";
    case "failed":
      return "Failed";
    case "ready":
      return formatReadyGenerationStatus(nextState);
  }
}

function formatReadyGenerationStatus(nextState: AppState): string {
  if (nextState.deadlineResult === undefined) {
    return "Ready";
  }

  const candidate = nextState.deadlineResult.returnedCandidateKind;
  const elapsed = Math.round(nextState.deadlineResult.elapsedMs);
  const nextSegment = nextState.playbackMode === "endless-program" ? `, next ${nextState.nextSegmentStatus}` : "";
  return `${candidate}, ${elapsed} ms${nextSegment}`;
}

function formatPlaybackMode(mode: InfinitePlaybackMode): string {
  if (mode === "endless-program") {
    return "endless program";
  }
  if (mode === "regenerative-cycle") {
    return "regenerative cycle";
  }
  return "continuous fugue";
}

function formatDeadlineStatus(nextState: AppState): string {
  if (nextState.deadlineResult === undefined) {
    return "...";
  }
  return nextState.deadlineResult.timedOut
    ? `missed by ${Math.round(nextState.deadlineResult.deadlineExceededByMs)} ms`
    : "met";
}

function formatFallbackStatus(nextState: AppState): string {
  return nextState.deadlineResult?.returnedCandidateKind ?? "...";
}

function renderPlayPauseLabel(isPlaying: boolean): string {
  if (isPlaying) {
    return "Pause";
  }

  return hasPausedPlayback ? "Resume" : "Play";
}

function requireElement<TElement extends Element>(element: TElement | null, name: string): TElement {
  if (element === null) {
    throw new Error(`${name} not found`);
  }

  return element;
}
