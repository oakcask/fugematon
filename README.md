# Fugematon

Fugematon is a deterministic fugue generator. The core package generates a tick-based four-voice score from a seed, the CLI exports JSON diagnostics or MIDI files, and the web app plays the generated Phase 3 score with WebAudio while showing a Canvas piano roll.

## Requirements

* Node.js version from `.nvmrc`
* pnpm version from `package.json`

If Corepack is not already enabled, run:

```sh
corepack enable
```

## Setup

Install workspace dependencies:

```sh
pnpm install
```

Build all packages and the web bundle:

```sh
pnpm build
```

Run the full test suite:

```sh
pnpm test
```

## CLI

Build before using the CLI, because the root `fugematon` script runs the compiled CLI entrypoint:

```sh
pnpm build
```

Generate ScoreEvent JSON to stdout:

```sh
pnpm fugematon generate --seed fugue-smoke --ticks 7680
```

Write ScoreEvent JSON to a file:

```sh
pnpm fugematon generate --seed fugue-smoke --ticks 7680 --out fugue-smoke.json
```

Print diagnostics:

```sh
pnpm fugematon diagnose --seed fugue-smoke --ticks 7680
```

Export MIDI:

```sh
pnpm fugematon midi --seed fugue-smoke --ticks 7680 --out samples/fugue-smoke-phase1.mid
```

The sample MIDI command is also available as:

```sh
pnpm samples:generate
```

## Web App

Start the Vite development server:

```sh
pnpm web:dev
```

Open the local URL printed by Vite. The app lets you:

* Enter a seed and regenerate the deterministic Phase 3 score.
* Play a Phase 3 score with exposition, episode, subject return, and stretto-like states.
* Press Start to begin WebAudio playback after the required browser user gesture.
* Press Stop to stop scheduled playback.
* Watch the four-voice score and highlighted subject entries on the Canvas piano roll while it plays.

Create a production web build:

```sh
pnpm --filter @fugematon/web build
```

## Project Layout

* `packages/core`: deterministic score generation, diagnostics, PRNG, and MIDI export.
* `packages/cli`: command-line wrapper around the core generator.
* `packages/web`: Vite app for browser playback and visualization.
* `docs`: design notes, technical plan, and phase implementation notes.
* `samples`: generated sample artifacts for manual listening checks.

## Phase Notes

Read `docs/README.md` for implementation context.
