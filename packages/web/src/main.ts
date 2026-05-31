import {
  FUGUE_FORM_REVIEW_LENGTH_TICKS,
  planSegmentGenerationDeadlineResult,
  type SegmentGenerationDeadlineResult,
} from "@fugematon/core";
import { listPerformanceProfiles, type PerformanceProfileId } from "@fugematon/performance";
import "./style.css";
import { ScorePlayer } from "./audio.js";
import type { GenerationWorkerResponse, GenerationWorkerReviewSnapshot } from "./generation-worker-protocol.js";
import { drawPianoRoll } from "./piano-roll.js";
import {
  DEFAULT_WEB_PERFORMANCE_PROFILE_ID,
  formatKeySignature,
  formatPlaybackPosition,
  formatTimeSignature,
  type PlaybackModel,
} from "./score.js";

const DEFAULT_SEED = "fugue-smoke";
const URL_SEED_PARAM = "seed";
const SCORE_LENGTH_TICKS = FUGUE_FORM_REVIEW_LENGTH_TICKS;
const GENERATION_DEADLINE_MS = 10_000;

type UrlUpdateMode = "push" | "replace" | "none";
type GenerationStatus = "idle" | "generating" | "best-so-far-fallback" | "ready" | "failed";

type AppState = {
  seed: string;
  performanceProfileId: PerformanceProfileId;
  model?: PlaybackModel;
  generationStatus: GenerationStatus;
  deadlineResult?: SegmentGenerationDeadlineResult;
  reviewSnapshot?: GenerationWorkerReviewSnapshot;
};

const app = requireElement(document.querySelector<HTMLDivElement>("#app"), "app root");

let state = createPendingState(readUrlSeed(DEFAULT_SEED));

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
        <select id="performance-profile" name="performance-profile"></select>
        <button type="button" class="secondary" id="random-seed">Random seed</button>
        <button type="submit">Regenerate</button>
      </div>
      <p class="hint">The same seed always produces the same score events.</p>
    </form>
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
    </section>
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
  </section>
`;

const seedForm = requireElement(document.querySelector<HTMLFormElement>("#seed-form"), "seed form");
const seedInput = requireElement(document.querySelector<HTMLInputElement>("#seed"), "seed input");
const performanceProfileSelect = requireElement(
  document.querySelector<HTMLSelectElement>("#performance-profile"),
  "performance profile select",
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
render(state);
renderPlaybackPosition(0);

let player: ScorePlayer | undefined;
let animationFrame: number | undefined;
let playbackStartController: AbortController | undefined;
let pausedAtSecond = 0;
let hasPausedPlayback = false;
let generationTimeout: number | undefined;
let activeGenerationRequestId = 0;
let nextSegmentIndex = 0;
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
    drawPianoRoll(pianoRoll, state.model, 0);
  }
  renderPlaybackPosition(0);
  transportStatus.textContent = "Playback stopped";
});

window.addEventListener("resize", () => {
  if (state.model === undefined) {
    return;
  }

  const playbackSecond = player?.playbackSecond ?? 0;
  drawPianoRoll(pianoRoll, state.model, playbackSecond);
  renderPlaybackPosition(playbackSecond);
});

window.addEventListener("popstate", () => {
  regenerateScore(readUrlSeed(DEFAULT_SEED), "none");
});

function regenerateScore(seed: string, urlUpdateMode: UrlUpdateMode = "push"): void {
  const nextSeed = seed.trim();
  if (nextSeed.length === 0) {
    seedInput.value = state.seed;
    return;
  }

  seedInput.value = nextSeed;
  cancelPlayback();
  activeGenerationRequestId += 1;
  const requestId = activeGenerationRequestId;
  const segmentIndex = nextSegmentIndex;
  const performanceProfileId = performanceProfileSelect.value as PerformanceProfileId;
  state = {
    seed: nextSeed,
    performanceProfileId,
    model: state.model,
    generationStatus: "generating",
  };
  render(state);
  if (state.model !== undefined) {
    drawPianoRoll(pianoRoll, state.model, 0);
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
  });
}

function createRandomSeed(): string {
  const values = new Uint32Array(2);
  window.crypto.getRandomValues(values);
  return `seed-${Array.from(values, (value) => value.toString(36).padStart(7, "0")).join("-")}`;
}

function createPendingState(
  seed: string,
  performanceProfileId: PerformanceProfileId = DEFAULT_WEB_PERFORMANCE_PROFILE_ID,
): AppState {
  return {
    seed,
    performanceProfileId,
    generationStatus: "idle",
  };
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
}

function renderPlaybackPosition(playbackSecond: number): void {
  if (state.model === undefined) {
    playbackPosition.textContent = "0s / pending";
    return;
  }

  playbackPosition.textContent = formatPlaybackPosition(playbackSecond, state.model);
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
  renderPlaybackPosition(offsetSecond);

  try {
    player ??= new ScorePlayer();
    const model = state.model;
    const started = await player.play(model, { offsetSecond, signal: controller.signal });
    if (!started || controller.signal.aborted) {
      return;
    }

    pausedAtSecond = 0;
    hasPausedPlayback = false;
    transportStatus.textContent = "Playing score";
    setPlaybackFeedback(true);
    renderTransportButtons();
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
  playbackStartController = undefined;
  pausedAtSecond = player.pause();
  hasPausedPlayback = true;
  cancelVisualizerLoop();
  setPlaybackFeedback(false);
  if (state.model !== undefined) {
    drawPianoRoll(pianoRoll, state.model, pausedAtSecond);
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
    drawPianoRoll(pianoRoll, state.model, playbackSecond);
    renderPlaybackPosition(playbackSecond);

    if (player?.isPlaying) {
      animationFrame = window.requestAnimationFrame(drawFrame);
      return;
    }

    animationFrame = undefined;
    setPlaybackFeedback(false);
    pausedAtSecond = 0;
    hasPausedPlayback = false;
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

    if (requestId !== activeGenerationRequestId || state.model === undefined) {
      return;
    }

    state = {
      ...state,
      generationStatus: "best-so-far-fallback",
      deadlineResult: planSegmentGenerationDeadlineResult({
        mode: "continuous-fugue",
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
  if (response.requestId !== activeGenerationRequestId) {
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
    model,
    generationStatus,
    deadlineResult: response.deadlineResult,
    reviewSnapshot: response.reviewSnapshot,
  };
  seedInput.value = response.seed;
  render(state);
  drawPianoRoll(pianoRoll, model, 0);
  renderPlaybackPosition(0);
  transportStatus.textContent = preserveBestSoFarModel ? "Keeping best-so-far after deadline" : "Ready to play";
  renderTransportButtons();
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
  return `${candidate}, ${elapsed} ms`;
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
