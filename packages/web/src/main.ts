import { DEFAULT_SELECTION_MODEL, generateScore, PHASE_3_LENGTH_TICKS } from "@fugematon/core";
import {
  DEFAULT_PERFORMANCE_PROFILE_ID,
  listPerformanceProfiles,
  type PerformanceProfileId,
} from "@fugematon/performance";
import "./style.css";
import { ScorePlayer } from "./audio.js";
import { drawPianoRoll } from "./piano-roll.js";
import { createPlaybackModel, formatBarBeatDuration, formatTimeSignature, type PlaybackModel } from "./score.js";

const DEFAULT_SEED = "fugue-smoke";
const SCORE_LENGTH_TICKS = PHASE_3_LENGTH_TICKS;

type AppState = {
  seed: string;
  performanceProfileId: PerformanceProfileId;
  model: PlaybackModel;
};

const app = requireElement(document.querySelector<HTMLDivElement>("#app"), "app root");

let state = createState(DEFAULT_SEED);

app.innerHTML = `
  <section class="shell">
    <div class="hero">
      <p class="eyebrow">seeded counterpoint machine</p>
      <h1>Fugematon</h1>
      <p class="lede">Generate deterministic four-voice fugue states for browser playback.</p>
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
        <span class="metric-label">Duration</span>
        <strong id="duration"></strong>
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
      <div>
        <span class="metric-label">Playback</span>
        <strong id="transport-status">Ready to play</strong>
      </div>
      <div class="transport-actions">
        <button type="button" id="start">Play score</button>
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
const duration = requireElement(document.querySelector<HTMLElement>("#duration"), "duration metric");
const notes = requireElement(document.querySelector<HTMLElement>("#notes"), "notes metric");
const pitchSpan = requireElement(document.querySelector<HTMLElement>("#pitch-span"), "pitch span metric");
const states = requireElement(document.querySelector<HTMLElement>("#states"), "states metric");
const entries = requireElement(document.querySelector<HTMLElement>("#entries"), "entries metric");
const startButton = requireElement(document.querySelector<HTMLButtonElement>("#start"), "start button");
const stopButton = requireElement(document.querySelector<HTMLButtonElement>("#stop"), "stop button");
const transportStatus = requireElement(document.querySelector<HTMLElement>("#transport-status"), "transport status");
const pianoRoll = requireElement(document.querySelector<HTMLCanvasElement>("#piano-roll"), "piano roll");

seedInput.value = state.seed;
for (const profile of listPerformanceProfiles()) {
  performanceProfileSelect.add(new Option(profile.id, profile.id));
}
performanceProfileSelect.value = state.performanceProfileId;
render(state);
drawPianoRoll(pianoRoll, state.model, 0);

let player: ScorePlayer | undefined;
let animationFrame: number | undefined;

seedForm.addEventListener("submit", (event) => {
  event.preventDefault();
  regenerateScore(seedInput.value);
});

randomSeedButton.addEventListener("click", () => {
  regenerateScore(createRandomSeed());
});

startButton.addEventListener("click", () => {
  void startPlayback();
});

stopButton.addEventListener("click", () => {
  player?.stop();
  cancelVisualizerLoop();
  drawPianoRoll(pianoRoll, state.model, 0);
  transportStatus.textContent = "Playback stopped";
});

window.addEventListener("resize", () => {
  drawPianoRoll(pianoRoll, state.model, player?.playbackSecond ?? 0);
});

function regenerateScore(seed: string): void {
  const nextSeed = seed.trim();
  if (nextSeed.length === 0) {
    seedInput.value = state.seed;
    return;
  }

  seedInput.value = nextSeed;
  player?.stop();
  cancelVisualizerLoop();
  state = createState(nextSeed, performanceProfileSelect.value as PerformanceProfileId);
  render(state);
  drawPianoRoll(pianoRoll, state.model, 0);
  transportStatus.textContent = "Ready to play";
}

function createRandomSeed(): string {
  const values = new Uint32Array(2);
  window.crypto.getRandomValues(values);
  return `seed-${Array.from(values, (value) => value.toString(36).padStart(7, "0")).join("-")}`;
}

function createState(
  seed: string,
  performanceProfileId: PerformanceProfileId = DEFAULT_PERFORMANCE_PROFILE_ID,
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

function render(nextState: AppState): void {
  tempo.textContent = `${nextState.model.bpm} bpm`;
  meter.textContent = formatTimeSignature(nextState.model.timeSignature);
  duration.textContent = `${nextState.model.totalSeconds.toFixed(1)} s / ${formatBarBeatDuration(
    nextState.model.totalTicks,
    nextState.model.timeSignature,
    nextState.model.ticksPerQuarter,
  )}`;
  notes.textContent = `${nextState.model.notes.length}`;
  pitchSpan.textContent = `${nextState.model.pitchRange.min}-${nextState.model.pitchRange.max}`;
  states.textContent = `${new Set(nextState.model.stateTransitions).size}`;
  entries.textContent = `${nextState.model.subjectEntries.length}`;
}

async function startPlayback(): Promise<void> {
  startButton.disabled = true;
  transportStatus.textContent = "Starting playback";

  try {
    player ??= new ScorePlayer();
    await player.play(state.model);
    transportStatus.textContent = "Playing score";
    startVisualizerLoop();
  } catch (error) {
    transportStatus.textContent = error instanceof Error ? error.message : "Playback failed";
  } finally {
    startButton.disabled = false;
  }
}

function startVisualizerLoop(): void {
  cancelVisualizerLoop();

  const drawFrame = () => {
    const playbackSecond = player?.playbackSecond ?? 0;
    drawPianoRoll(pianoRoll, state.model, playbackSecond);

    if (player?.isPlaying) {
      animationFrame = window.requestAnimationFrame(drawFrame);
      return;
    }

    animationFrame = undefined;
    transportStatus.textContent = "Playback complete";
  };

  animationFrame = window.requestAnimationFrame(drawFrame);
}

function cancelVisualizerLoop(): void {
  if (animationFrame !== undefined) {
    window.cancelAnimationFrame(animationFrame);
    animationFrame = undefined;
  }
}

function requireElement<TElement extends Element>(element: TElement | null, name: string): TElement {
  if (element === null) {
    throw new Error(`${name} not found`);
  }

  return element;
}
