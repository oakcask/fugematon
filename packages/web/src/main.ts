import { DEFAULT_SELECTION_MODEL, FUGUE_FORM_REVIEW_LENGTH_TICKS, generateScore } from "@fugematon/core";
import { listPerformanceProfiles, type PerformanceProfileId } from "@fugematon/performance";
import "./style.css";
import { ScorePlayer } from "./audio.js";
import { drawPianoRoll } from "./piano-roll.js";
import {
  createPlaybackModel,
  DEFAULT_WEB_PERFORMANCE_PROFILE_ID,
  formatKeySignature,
  formatPlaybackPosition,
  formatTimeSignature,
  type PlaybackModel,
} from "./score.js";

const DEFAULT_SEED = "fugue-smoke";
const URL_SEED_PARAM = "seed";
const SCORE_LENGTH_TICKS = FUGUE_FORM_REVIEW_LENGTH_TICKS;

type UrlUpdateMode = "push" | "replace" | "none";

type AppState = {
  seed: string;
  performanceProfileId: PerformanceProfileId;
  model: PlaybackModel;
};

const app = requireElement(document.querySelector<HTMLDivElement>("#app"), "app root");

let state = createState(readUrlSeed(DEFAULT_SEED));

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
drawPianoRoll(pianoRoll, state.model, 0);
renderPlaybackPosition(0);
writeUrlSeed(state.seed, "replace");

let player: ScorePlayer | undefined;
let animationFrame: number | undefined;
let playbackStartController: AbortController | undefined;
let pausedAtSecond = 0;
renderTransportButtons();

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
  drawPianoRoll(pianoRoll, state.model, 0);
  renderPlaybackPosition(0);
  transportStatus.textContent = "Playback stopped";
});

window.addEventListener("resize", () => {
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
  state = createState(nextSeed, performanceProfileSelect.value as PerformanceProfileId);
  render(state);
  drawPianoRoll(pianoRoll, state.model, 0);
  renderPlaybackPosition(0);
  transportStatus.textContent = "Ready to play";
  writeUrlSeed(nextSeed, urlUpdateMode);
}

function createRandomSeed(): string {
  const values = new Uint32Array(2);
  window.crypto.getRandomValues(values);
  return `seed-${Array.from(values, (value) => value.toString(36).padStart(7, "0")).join("-")}`;
}

function createState(
  seed: string,
  performanceProfileId: PerformanceProfileId = DEFAULT_WEB_PERFORMANCE_PROFILE_ID,
): AppState {
  return {
    seed,
    performanceProfileId,
    model: createPlaybackModel(
      generateScore({ seed, lengthTicks: SCORE_LENGTH_TICKS, selectionModel: DEFAULT_SELECTION_MODEL }),
      performanceProfileId,
    ),
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
  tempo.textContent = `${nextState.model.bpm} bpm`;
  meter.textContent = formatTimeSignature(nextState.model.timeSignature);
  keySignature.textContent = formatKeySignature(nextState.model.keySignature);
  notes.textContent = `${nextState.model.notes.length}`;
  pitchSpan.textContent = `${nextState.model.pitchRange.min}-${nextState.model.pitchRange.max}`;
  states.textContent = `${new Set(nextState.model.stateTransitions).size}`;
  entries.textContent = `${nextState.model.subjectEntries.length}`;
}

function renderPlaybackPosition(playbackSecond: number): void {
  playbackPosition.textContent = formatPlaybackPosition(playbackSecond, state.model);
}

async function startPlayback(): Promise<void> {
  const controller = new AbortController();
  const offsetSecond = pausedAtSecond;
  playbackStartController?.abort();
  playbackStartController = controller;
  transportStatus.textContent = "Starting playback";
  renderTransportButtons();
  renderPlaybackPosition(offsetSecond);

  try {
    player ??= new ScorePlayer();
    const started = await player.play(state.model, { offsetSecond, signal: controller.signal });
    if (!started || controller.signal.aborted) {
      return;
    }

    pausedAtSecond = 0;
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
  cancelVisualizerLoop();
  setPlaybackFeedback(false);
  drawPianoRoll(pianoRoll, state.model, pausedAtSecond);
  renderPlaybackPosition(pausedAtSecond);
  transportStatus.textContent = "Playback paused";
  renderTransportButtons();
}

function startVisualizerLoop(): void {
  cancelVisualizerLoop();

  const drawFrame = () => {
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
  playPauseButton.disabled = isStarting;
  playPauseButton.textContent = isStarting ? "Starting" : renderPlayPauseLabel(isPlaying);
}

function renderPlayPauseLabel(isPlaying: boolean): string {
  if (isPlaying) {
    return "Pause";
  }

  return pausedAtSecond > 0 ? "Resume" : "Play";
}

function requireElement<TElement extends Element>(element: TElement | null, name: string): TElement {
  if (element === null) {
    throw new Error(`${name} not found`);
  }

  return element;
}
