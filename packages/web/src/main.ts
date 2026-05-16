import { generateScore } from "@fugematon/core";
import "./style.css";
import { ScorePlayer } from "./audio.js";
import { createPlaybackModel, type PlaybackModel } from "./score.js";

const DEFAULT_SEED = "fugue-smoke";
const SCORE_LENGTH_TICKS = 7680;

type AppState = {
  seed: string;
  model: PlaybackModel;
};

const app = requireElement(document.querySelector<HTMLDivElement>("#app"), "app root");

let state = createState(DEFAULT_SEED);

app.innerHTML = `
  <section class="shell">
    <div class="hero">
      <p class="eyebrow">seeded counterpoint machine</p>
      <h1>Fugematon</h1>
      <p class="lede">Generate a deterministic four-voice exposition and prepare it for browser playback.</p>
    </div>
    <form class="control-card" id="seed-form">
      <label for="seed">Seed</label>
      <div class="seed-row">
        <input id="seed" name="seed" autocomplete="off" spellcheck="false" />
        <button type="submit">Regenerate</button>
      </div>
      <p class="hint">The same seed always produces the same Phase 1 score.</p>
    </form>
    <section class="score-card" aria-live="polite">
      <div>
        <span class="metric-label">Tempo</span>
        <strong id="tempo"></strong>
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
    </section>
    <section class="transport-card">
      <div>
        <span class="metric-label">Transport</span>
        <strong id="transport-status">Ready</strong>
      </div>
      <div class="transport-actions">
        <button type="button" id="start">Start</button>
        <button type="button" class="secondary" id="stop">Stop</button>
      </div>
    </section>
  </section>
`;

const seedForm = requireElement(document.querySelector<HTMLFormElement>("#seed-form"), "seed form");
const seedInput = requireElement(document.querySelector<HTMLInputElement>("#seed"), "seed input");
const tempo = requireElement(document.querySelector<HTMLElement>("#tempo"), "tempo metric");
const duration = requireElement(document.querySelector<HTMLElement>("#duration"), "duration metric");
const notes = requireElement(document.querySelector<HTMLElement>("#notes"), "notes metric");
const pitchSpan = requireElement(document.querySelector<HTMLElement>("#pitch-span"), "pitch span metric");
const startButton = requireElement(document.querySelector<HTMLButtonElement>("#start"), "start button");
const stopButton = requireElement(document.querySelector<HTMLButtonElement>("#stop"), "stop button");
const transportStatus = requireElement(document.querySelector<HTMLElement>("#transport-status"), "transport status");

seedInput.value = state.seed;
render(state);

let player: ScorePlayer | undefined;

seedForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const nextSeed = seedInput.value.trim();
  if (nextSeed.length === 0) {
    seedInput.value = state.seed;
    return;
  }

  player?.stop();
  state = createState(nextSeed);
  render(state);
  transportStatus.textContent = "Ready";
});

startButton.addEventListener("click", () => {
  void startPlayback();
});

stopButton.addEventListener("click", () => {
  player?.stop();
  transportStatus.textContent = "Stopped";
});

function createState(seed: string): AppState {
  return {
    seed,
    model: createPlaybackModel(generateScore({ seed, lengthTicks: SCORE_LENGTH_TICKS })),
  };
}

function render(nextState: AppState): void {
  tempo.textContent = `${nextState.model.bpm} bpm`;
  duration.textContent = `${nextState.model.totalSeconds.toFixed(1)} s`;
  notes.textContent = `${nextState.model.notes.length}`;
  pitchSpan.textContent = `${nextState.model.pitchRange.min}-${nextState.model.pitchRange.max}`;
}

async function startPlayback(): Promise<void> {
  startButton.disabled = true;
  transportStatus.textContent = "Starting";

  try {
    player ??= new ScorePlayer();
    await player.play(state.model);
    transportStatus.textContent = `Playing ${state.seed}`;
  } catch (error) {
    transportStatus.textContent = error instanceof Error ? error.message : "Playback failed";
  } finally {
    startButton.disabled = false;
  }
}

function requireElement<TElement extends Element>(element: TElement | null, name: string): TElement {
  if (element === null) {
    throw new Error(`${name} not found`);
  }

  return element;
}
