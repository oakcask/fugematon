# WebAudio synth interpretation follow-up

Status: complete. Completion evidence is recorded in [WebAudio synth interpretation completion review](../reviews/webaudio-synth-interpretation-completion.md).

This follow-up runs after [Infinite playback MVP](phase-8.md). It refines how WebAudio interprets `PerformanceProfile` for synth playback without changing generated `ScoreEvent` output, generator scoring, quality diagnostics thresholds, or `generatorVersion`.

## Rationale

Phase 12P separated score data from rendering data, but the current WebAudio renderer still treats performance velocity mostly as sustained gain. That is too direct for the current organ-like synth: MIDI-style velocity is closer to attack emphasis and relative dynamic intent than to a long-note loudness multiplier.

The risk is most audible when bass carries a subject or answer. The bass profile uses a stronger gain and brighter oscillator, while low support velocities can be clamped upward by the shared velocity curve. This can make the bass subject clear but reduce mid-voice readability in long playback.

This is a rendering follow-up, not a score-continuity repair. If voices stop, restart, thin out, or collide in the score, the response remains a generator, scoring, or diagnostic change. WebAudio envelope changes may make a valid score easier to hear, but must not hide score-window blockers.

## Scope

* Add profile-owned WebAudio synth interpretation fields, such as attack, decay, sustain level, release, velocity-to-attack emphasis, and velocity-to-sustain gain.
* Keep the renderer deterministic: the same score, seed, and performance profile must schedule the same notes and automation.
* Split attack emphasis from sustained loudness so subject entries can speak clearly without letting long bass notes mask other voices.
* Recalibrate `organ-default` for long listening balance, especially bass subject and answer windows.
* Keep `strict-counterpoint` as an inspection profile that exposes voice independence, entry clashes, and articulation problems rather than smoothing them away.
* Record profile id and version in Web UI playback models, review bundles, and MIDI metadata where applicable.
* Add tests that prove WebAudio gain scheduling follows the profile envelope and that ScoreEvent output is unchanged.

## Out Of Scope

* Changing `ScoreEvent.velocity` values in `packages/core`.
* Treating performance profile preference as a music-quality metric or generation scoring input.
* Hiding entry-boundary resets, thinning, voice lockstep, unison, or weak counter-subject identity through softer attacks.
* SoundFont or sample-library selection as a product feature.
* AudioWorklet, deadline tuning, Worker fallback, or broader browser scheduling infrastructure.
* Synth preset browsing or detailed user-facing synth controls.

## Implementation Plan

1. Extend `PerformanceProfile` with a WebAudio synth section while keeping MIDI-compatible fields explicit.
2. Version `organ-default` and `strict-counterpoint` when the audible defaults change.
3. Replace WebAudio's direct sustained-gain velocity mapping with a profile function that produces attack peak and sustain gain.
4. Add envelope automation tests for attack, sustain, and release behavior without relying on browser audio output.
5. Add focused playback-review notes for bass subject and bass answer windows under `organ-default` and `strict-counterpoint`.
6. Keep MIDI export deterministic and avoid writing synth-specific envelope semantics into standard MIDI unless a portable representation is deliberately introduced.

## Implementation Notes

* `organ-default` and `strict-counterpoint` version 3 add profile-owned WebAudio synth envelope settings.
* WebAudio scheduling now derives separate attack peak and sustain gain from the profile instead of using score velocity as direct sustained gain.
* `listening-review.json` schema version 2 records the performance profile id/version and adds focused bass subject/answer balance notes for `organ-default` and `strict-counterpoint`.
* Automated coverage checks profile-owned synth settings, envelope timing, attack/sustain velocity separation, score-event immutability through performance conversion, and removal of the old direct playback `releaseSeconds` field.

## Completion Conditions

* WebAudio playback no longer maps velocity linearly to sustained gain for the default synth profile.
* Bass subject and answer windows remain clear without persistently masking middle voices in focused listening notes.
* `strict-counterpoint` still exposes score-level attacks and clashes instead of hiding them behind smooth envelope settings.
* Generated `ScoreEvent` output, diagnostics, and quality-vector values are unchanged for representative review seeds.
* Review artifacts identify the performance profile id and version used for any listening comparison.
* The implementation notes classify accepted changes as rendering changes, not generation changes.

The completion review regenerated the 22 seed `organ-default` and `strict-counterpoint` bundles at `129600` ticks and compared them with the TARGET baseline under `samples/webaudio-synth-interpretation-current`. Both profile comparisons produced no file differences. Focused scheduling review confirms the default synth now separates bass subject/answer attack emphasis from reduced sustain, while `strict-counterpoint` keeps score-level attacks and clashes exposed. Human listening remains a manual-listening gap, but the rendering follow-up no longer blocks the next target.
