# Playback source realism feasibility

Status: investigation complete; first prototype scaffold added. This note evaluates whether Fugematon should use SpessaSynth with a SoundFont, build a small browser sampler, or defer both until a notices page and asset metadata path exist.

## Decision Summary

Recommended path:

1. Add a notices / licenses page first, backed by generated package and asset metadata.
2. Pilot SpessaSynth with `MuseScore_General.sf3` behind a rendering-profile switch, keeping the current oscillator renderer as fallback.
3. Keep a custom VSCO WAV sampler as a later, curated-instrument path if the goal becomes exposed chamber-orchestra realism rather than GM / organ-like fugue playback.

Reason: SpessaSynth gives the shortest route to realistic playback because it already handles SF2/SF3 parsing, voice allocation, envelopes, MIDI-style controllers, and browser AudioWorklet scheduling. A custom sampler gives better control over a CC0 source library, but it would require building the hard parts that make sample playback musical: zone mapping, pitch transposition, release tails, velocity handling, loop/crossfade behavior, preloading, instrument ranges, and memory budgeting.

Bibliography claims: `playback-source-notices-required`, `playback-source-pilot-order`.

## Current Renderer Fit

The current WebAudio path schedules `PlaybackNote` records directly into oscillators. It already has a clean boundary between generated score events, performance profile conversion, and browser rendering:

* `packages/performance` owns voice-level performance settings.
* `packages/web/src/score.ts` converts generation output into `PlaybackModel`.
* `packages/web/src/audio.ts` schedules notes and profile-owned envelope settings.

That boundary is usable for either candidate. The next renderer should remain a rendering concern and must not change `ScoreEvent`, diagnostics, generator scoring, or quality-vector semantics. Score-level discontinuities, thinning, lockstep, and unison problems must remain visible rather than hidden with better samples.

## Option A: SpessaSynth plus MuseScore_General.sf3

Feasibility: high for a pilot.

SpessaSynth `spessasynth_lib` is a browser WebAudio wrapper around `spessasynth_core`. The npm page describes the wrapper as a browser library for SF2/SF3/DLS playback and shows the required AudioWorklet processor asset setup. It is Apache-2.0 and has one runtime dependency, `spessasynth_core`. The npm page currently shows `spessasynth_lib` `3.27.8` as published one month before this investigation; the GitHub `master` package metadata has moved to the 4.x line and uses `spessasynth_core: latest`, so implementation must pin exact package versions and re-run dependency review when installing.

MuseScore_General.sf3 is attractive because it is General MIDI compatible. MuseScore's handbook says MuseScore_General.sf3 is a GM set with more than 128 instruments and lists the compressed `.sf3` at 35.9 MB, with a 208 MB `.sf2` version. The same handbook lists it as MIT licensed and credits S. Christian Collins. The exact asset file distributed with Fugematon must carry the upstream license and attribution file, not just a handbook citation.

Implementation shape:

* Add a renderer abstraction with `oscillator` and `soundfont` implementations.
* Bundle or lazily fetch `worklet_processor.min.js` through Vite static assets.
* Load the `.sf3` once per session and reuse the synth across segment boundaries.
* Map Fugematon voices to stable channels and programs, for example organ / choir / string ensemble presets during the first pilot.
* Translate `PlaybackNote` starts and stops into synth `programChange`, `noteOn`, and `noteOff` events.
* Preserve current oscillator playback as fallback when the soundfont fails to load, the worklet fails, or memory pressure is too high.

Risks and mitigations:

* Package volatility: the library has active releases and a recent major-version transition. Pin exact versions and avoid `latest`.
* Worklet packaging: the processor is a separate runtime file. Add a test or build check that fails if the deployed asset is missing.
* Browser behavior: the README notes Chromium-based distortion risk. Keep the renderer switch and fallback visible for manual listening review.
* Bundle size: do not eagerly include a 35.9 MB soundfont in the initial application bundle. Prefer lazy download with cache headers or a separate optional asset package.
* License notices: Apache-2.0 and MIT notices are required in the app and release artifact.

Dependency-review result: adopt with mitigations for a prototype, after pinning exact versions and inspecting the installed package contents. Do not adopt through a loose range or through `spessasynth_core: latest`.

## Option B: Custom sampler plus VSCO Community WAV

Feasibility: medium for a narrow instrument set; low for full-library realism in one phase.

VSCO 2 Community Edition is a strong source-library candidate because the official Versilian Studios page describes it as CC0 / public-domain and provides Raw WAV files. The page also provides smaller 256-sample and 50-sample packs, which are much more realistic pilot inputs than the full 3 GB library. Its Vanilla SFZ version is useful as mapping reference, but the page explicitly notes that SFZ and SF2 are not directly compatible.

Implementation shape:

* Start with a curated subset, probably organ substitute is not the target; use string quartet, chamber strings, or a small wind/strings set.
* Create checked-in asset manifests containing sample file, root pitch, key range, velocity range, loop metadata if any, license id, and attribution text.
* Decode with `AudioContext.decodeAudioData`, then schedule `AudioBufferSourceNode` plus `GainNode` and `StereoPannerNode`.
* Support release tails and crossfades before adding round-robin or detailed articulation.
* Add cache-aware lazy loading and a hard memory budget.

Risks and mitigations:

* Musical realism cost: raw WAV files alone do not make a playable instrument. Mapping and release behavior will dominate perceived quality.
* Pitch shifting: wide transposition from sparse samples sounds artificial. Keep key ranges narrow and use smaller curated packs first.
* Velocity and articulation: VSCO CE includes varied material, but a minimal sampler will initially lack legato, expression crossfades, and robust round-robin behavior.
* Asset sprawl: require a manifest and license metadata per sample subset; do not copy ad hoc filenames into code.
* SFZ parser scope: avoid a general SFZ parser in the first phase unless reuse is clearly cheaper than hand-authored manifests.

Dependency-review result: no new runtime dependency is required for a minimal sampler. The risk is engineering scope, asset curation, and browser memory rather than third-party code.

## Option C: Use VSCO SFZ Directly

Feasibility: low as the first implementation.

This would require a browser SFZ engine or a custom SFZ parser plus sampler. It has better source mappings than raw WAV, but it combines the complexity of Option B with more parser surface. It is only worth considering after a narrow sampler proves useful, or if a maintained SFZ engine passes dependency review.

## Notices Page Requirement

Before distributing either SpessaSynth or third-party audio assets, add an in-app notices page. It should be visible from the main UI footer or settings area and should have a generated data source rather than hand-maintained prose.

Minimum content:

* Runtime OSS packages shipped to users: name, version, license, homepage, copyright / notice text.
* Audio assets: asset id, source title, source URL, exact file or pack identifier, license, required attribution, and whether attribution is legally required or project-provided courtesy.
* Build-only tools in a separate section or omitted from the public runtime page, depending on release policy.
* A downloadable or route-addressable plain text notice artifact for release bundles.

Current local package license inventory from `pnpm licenses list --json` includes MIT, Apache-2.0, MPL-2.0, ISC, BSD-3-Clause, and MIT OR Apache-2.0 packages. The public runtime app currently has no third-party production package beyond workspace code, but the built web artifact uses Vite/Rolldown tooling. Adding SpessaSynth would add Apache-2.0 runtime notices; adding MuseScore_General.sf3 would add MIT asset notices and attribution; adding VSCO WAV assets would add CC0 asset records even though attribution is not required.

Implementation notes:

* Add `packages/web/src/notices.ts` or generated `notices.json` as the stable UI input.
* Add a script that reads package manager license output and asset manifest files, then writes a deterministic notices artifact.
* Do not include local paths, install locations, usernames, cache paths, or gitignored raw asset contents in the generated notices.
* CI should fail with a searchable error id if a distributed package or asset lacks license metadata.

## Recommended Next Phase

Scope:

* Add generated notices infrastructure and a simple notices page.
* Add a `soundfont` renderer behind an explicit profile / feature switch.
* Add SpessaSynth only after pinning exact `spessasynth_lib` and `spessasynth_core` versions and inspecting installed package files.
* Pilot with a small locally documented `.sf3` asset path; do not load the soundfont on initial page load.
* Keep oscillator playback as the default fallback until listening review confirms the SoundFont path improves clarity without masking score-level issues.

Acceptance:

* `pnpm build` passes.
* UI tests confirm the notices page is reachable and contains software and asset sections.
* A build or unit test fails with a searchable error id when a configured distributed asset lacks license metadata.
* Manual listening review records oscillator vs SoundFont comparison for representative bass subject / answer windows and continuous segment boundaries.

Out of scope:

* Full VSCO sampler.
* General SFZ parser.
* Server-side audio rendering.
* Treating sample quality as generation-quality acceptance.
* Bundling large sound assets into the initial JS bundle.

## Prototype Scaffold Added

The first prototype pass adds the browser-side boundary without adopting SpessaSynth or distributing an audio asset yet:

* `packages/web/src/notices.ts` defines the notices data shape and validates distributed audio assets with the searchable error id `web.notices.missing-audio-asset-metadata`.
* The web UI exposes a `Notices` section with software and audio asset lists. The current default state intentionally reports that no third-party runtime software or audio assets are distributed.
* `packages/web/src/soundfont.ts` translates `PlaybackModel` notes into MIDI-style `program-change`, `note-on`, and `note-off` events using the existing performance profile channel/program fields.
* `ScorePlayer` accepts `oscillator` and `soundfont-prototype` renderer ids. The SoundFont path requires an injected adapter and falls back to oscillator playback with `web.audio.soundfont-adapter-missing` until the pinned SpessaSynth adapter and `.sf3` asset metadata are added.

Still pending:

* Run dependency review for exact pinned `spessasynth_lib` and `spessasynth_core` versions before installation.
* Add the AudioWorklet processor and actual `.sf3` loading path without eager initial-bundle inclusion.
* Add concrete runtime package and audio asset notices before distributing SpessaSynth or MuseScore_General.sf3.
* Complete manual listening comparison between oscillator and SoundFont playback.

## Sources

* `spessasynth_lib` npm page: https://www.npmjs.com/package/spessasynth_lib
* `spessasynth_core` package overview: https://socket.dev/npm/package/spessasynth_core
* VSCO 2 Community Edition official page: https://versilian-studios.com/vsco-community/
* MuseScore SoundFonts handbook: https://musescore.org/en/handbook/soundfonts
