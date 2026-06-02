# Playback source realism feasibility

Status: investigation complete; SpessaSynth adapter prototype added. This note evaluates whether Fugematon should use SpessaSynth with a SoundFont, build a small browser sampler, or defer both until a notices page and asset metadata path exist.

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

SpessaSynth `spessasynth_lib` is a browser WebAudio wrapper around `spessasynth_core`. The npm page describes the wrapper as a browser library for SF2/SF3/DLS playback and shows the required AudioWorklet processor asset setup. It is Apache-2.0 and has one runtime dependency, `spessasynth_core`. Fresh npm registry metadata checked on 2026-06-01 shows `spessasynth_lib` `4.3.6` and `spessasynth_core` `4.3.7` as the current package line. `spessasynth_lib` still declares `spessasynth_core: latest`, so implementation must keep a package-manager override when installing.

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
* Timbre masking: early manual trials with multiple General MIDI programs, including string, organ, piano / music-box, and harp-like presets, suggest the SoundFont path can sound muddier than the current oscillator renderer because richer sample harmonics stack across four contrapuntal voices. Treat instrument choice as a listening-review risk, not only a program-number tuning problem; evaluate whether voice-specific programs, lower gain / velocity, narrower registrations, or a simpler sampler are needed before making SoundFont playback the default.
* Continuous-fugue latency: early manual trials suggest the SoundFont path can introduce audible delay or disruption while the next continuous-fugue segment is being generated. Treat this as a renderer / scheduling risk before defaulting to SoundFont playback; verify whether SpessaSynth event scheduling, synth recreation after stop / pause, SoundFont memory pressure, or main-thread generation and UI work compete with segment prefetch near boundaries.
* Bundle size: do not eagerly include a 35.9 MB soundfont in the initial application bundle. Prefer lazy download with cache headers or a separate optional asset package.
* License notices: Apache-2.0 and MIT notices are required in the app and release artifact.

Dependency-review result: adopt with mitigations for a prototype. `spessasynth_lib@4.3.6` and `spessasynth_core@4.3.7` were inspected as published tarballs. The runtime tarballs contain built `dist` files, README, license, package metadata, and the required `spessasynth_processor.min.js` AudioWorklet processor; no install scripts run from the published package. Production audit reported no known vulnerabilities at adoption time. Keep `spessasynth_core` pinned through workspace overrides because the upstream `spessasynth_lib` dependency remains `latest`.

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
* Decide and document SoundFont asset delivery before enabling the pilot in deployed builds: either include the `.sf3` in the web deploy artifact as a Vite public asset or fetch it from a documented external asset host / CDN.
* Add CI coverage for the chosen delivery path so a configured distributed SoundFont URL has a matching asset manifest entry, license metadata, expected file name, and stable checksum or equivalent integrity record.
* Keep oscillator playback as the default fallback until listening review confirms the SoundFont path improves clarity without masking score-level issues.

Acceptance:

* `pnpm build` passes.
* UI tests confirm the notices page is reachable and contains software and asset sections.
* A build or unit test fails with a searchable error id when a configured distributed asset lacks license metadata.
* A CI or build check fails with a searchable error id when the SoundFont pilot is enabled for deployment but the configured `.sf3` asset is missing from the deploy artifact or external asset manifest.
* Manual listening review records oscillator vs SoundFont comparison for representative bass subject / answer windows and continuous segment boundaries.

Out of scope:

* Full VSCO sampler.
* General SFZ parser.
* Server-side audio rendering.
* Treating sample quality as generation-quality acceptance.
* Bundling large sound assets into the initial JS bundle.

## Prototype Scaffold Added

The first prototype pass added the browser-side boundary without adopting SpessaSynth or distributing an audio asset yet:

* `packages/web/src/notices.ts` defines the notices data shape and validates distributed audio assets with the searchable error id `web.notices.missing-audio-asset-metadata`.
* The web UI exposes a `Notices` section with software and audio asset lists. The current default state intentionally reports that no third-party runtime software or audio assets are distributed.
* `packages/web/src/soundfont.ts` translates `PlaybackModel` notes into MIDI-style `program-change`, `note-on`, and `note-off` events using the existing performance profile channel/program fields.
* `ScorePlayer` accepts `oscillator` and `soundfont-prototype` renderer ids. The SoundFont path requires an injected adapter and falls back to oscillator playback with `web.audio.soundfont-adapter-missing` until the pinned SpessaSynth adapter and `.sf3` asset metadata are added.

The second prototype pass adds the pinned SpessaSynth adapter without distributing a SoundFont asset:

* `packages/web/src/spessasynth-adapter.ts` lazy-loads `spessasynth_lib`, bundles the upstream AudioWorklet processor as a separate Vite asset, fetches the configured `.sf3` URL only when the SoundFont pilot is selected, and schedules Fugematon note events through SpessaSynth program, controller, note-on, and note-off calls.
* `pnpm-workspace.yaml` pins `spessasynth_core@4.3.7` through overrides so the upstream `latest` dependency cannot drift on lockfile refresh.
* Runtime software notices now include `spessasynth_lib@4.3.6` and `spessasynth_core@4.3.7`; audio asset notices remain empty because `MuseScore_General.sf3` is not distributed yet.
* `pnpm build`, `pnpm --filter @fugematon/web test`, `pnpm audit --prod`, and the web production dependency tree check passed for this prototype.

The third prototype pass adds the deployment guardrails needed before that asset decision:

* `packages/web/public/NOTICE.txt` is generated from the web notices data and linked from the in-app notices section as a route-addressable plain text artifact. It is not checked in; builds regenerate it and verification rejects stale generated content.
* `pnpm web:dev` also regenerates the notice artifact before starting Vite so a fresh checkout can serve the notices link without requiring a production build first.
* `workflow-scripts/web-playback-assets.mjs` verifies that the checked notice artifact matches the notices data and that any distributed SoundFont descriptor has matching audio asset notice metadata.
* The same check keeps the configured SoundFont URL tied to delivery: local web-public SoundFont URLs must exist in the public assets and built deploy artifact, while external SoundFont URLs must carry an integrity record.
* `pnpm build` and `pnpm --filter @fugematon/web build` now run the notice generation and playback asset verification around the Vite bundle step.

The fourth prototype pass chooses the deployable pilot configuration path without checking in the `.sf3` file:

* `packages/web/src/soundfont.ts` keeps the default local prototype descriptor non-distributed, but `VITE_FUGEMATON_SOUNDFONT_URL` now switches the descriptor to a distributed external asset.
* `VITE_FUGEMATON_SOUNDFONT_INTEGRITY` carries the required checksum or equivalent integrity record for that external asset; the existing playback asset verifier fails the build if an external distributed SoundFont lacks it, and the SpessaSynth adapter passes it into the browser fetch.
* `packages/web/src/notices.ts` derives the matching audio asset notice from distributed SoundFont descriptors, so enabling the external `.sf3` URL also exposes the MIT SoundFont notice in the in-app notices view and generated `NOTICE.txt`.
* This keeps `MuseScore_General.sf3` out of the initial JavaScript bundle and out of the repository while making the deploy-ready configuration explicit and CI-verifiable.

The fifth prototype pass changes the preferred deployable asset path from a hosted external URL to a deploy-time Ubuntu package copy:

* GitHub Pages deployment should install `musescore-general-soundfont-small` from Ubuntu `universe`, copy the package-provided `MuseScore_General_Lite.sf3` into `packages/web/public/soundfonts/` under the configured deploy filename, then run the existing web build so Vite copies the `.sf3` into the deploy artifact.
* Prefer a pinned runner such as `ubuntu-24.04` over `ubuntu-latest` so the package source and version do not drift silently when GitHub changes the runner image.
* Ubuntu Noble package metadata checked on 2026-06-02 shows `musescore-general-soundfont-small` version `0.2.1-1`; the local `apt-cache` candidate matches that version and describes the package as the lossy MuseScore General SoundFont.
* The package description states that `musescore-general-soundfont-small` contains the normal SoundFont shipped with MuseScore 3.x, lossily SF3-compressed, installed under the standard Debian SF3 soundfont directory, and distributed under MIT.
* The deploy workflow should find the installed `.sf3` with package metadata, copy it to the configured local public URL, and fail with a searchable error id if the package, copied file, expected file name, or checksum check is missing.
* `pnpm web:soundfont:prepare` verifies the Ubuntu package license metadata, locates the installed `MuseScore_General*.sf3`, and copies it into `packages/web/public/soundfonts/MuseScore_General.sf3` for local Vite playback or Pages bundling.
* `pnpm web:dev:soundfont` runs the prepare step, rebuilds with `VITE_FUGEMATON_SOUNDFONT_URL=/soundfonts/MuseScore_General.sf3` so the generated `NOTICE.txt` includes the SoundFont audio asset notice, then starts `pnpm web:dev` with the same environment for manual listening.
* `.github/workflows/deploy--gh-pages.yaml` now installs `musescore-general-soundfont-small` on a pinned `ubuntu-24.04` runner and runs `pnpm web:soundfont:prepare` before building or uploading the Pages artifact.
* The license verifier reads the installed package description and copyright file, then fails with searchable error ids if the package no longer advertises MIT licensing, the `MuseScore_General SoundFont (MIT, parts PD or CC0)` copyright header changes, or the MIT permission / warranty text is missing.
* The SpessaSynth adapter now rejects likely HTML responses before handing data to the SF3 parser, so a missing Vite public asset reports `web.audio.soundfont-asset-html-response` instead of a low-level `Invalid chunk header` parser failure.
* Keep `VITE_FUGEMATON_SOUNDFONT_URL=/soundfonts/MuseScore_General.sf3` for deployment rather than an external HTTPS URL. That lets the existing playback asset verifier check both the web public source and built deploy artifact.
* `workflow-scripts/web-playback-assets.mjs` still rejects external distributed SoundFont descriptors when the URL basename does not match the declared file name or the integrity value is not a `sha256`, `sha384`, or `sha512` Subresource Integrity token. This remains a fallback guardrail, but it is no longer the preferred GitHub Pages delivery path.
* A previously checked OSUOSL-hosted file had SHA-256 hex digest `5b85b6c2c61d10b2b91cddd41efcce7b25cd31c8271d511c73afafbef20b6fa3` and SRI value `sha256-W4W2wsYdELK5HN3UHvzOeyXNMcgnHVEcc6+vvvILb6M=`. Treat this only as comparison evidence unless the deploy process switches back to external hosting.

Still pending:

* Complete manual listening comparison between oscillator and SoundFont playback, including whether SoundFont harmonic density masks contrapuntal line clarity and whether continuous-fugue segment generation causes SoundFont-only boundary latency.

## Sources

* `spessasynth_lib` npm page: https://www.npmjs.com/package/spessasynth_lib
* `spessasynth_lib` npm registry metadata: https://registry.npmjs.org/spessasynth_lib
* `spessasynth_core` package overview: https://socket.dev/npm/package/spessasynth_core
* `spessasynth_core` npm registry metadata: https://registry.npmjs.org/spessasynth_core
* VSCO 2 Community Edition official page: https://versilian-studios.com/vsco-community/
* MuseScore SoundFonts handbook: https://musescore.org/en/handbook/soundfonts
* Ubuntu Noble sound packages: https://packages.ubuntu.com/en/noble/sound/
* Ubuntu `musescore-general-soundfont-small` package metadata: https://launchpad.net/ubuntu/noble/+package/musescore-general-soundfont-small
