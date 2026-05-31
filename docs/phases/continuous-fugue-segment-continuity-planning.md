# Continuous fugue segment continuity planning

Status: completed.

This plan follows the Phase 8 segment snapshot contract and should be handled before treating continuous playback as musically continuous in the Web UI.

## Goal

Make `continuous-fugue` continue from the previous segment instead of starting a new exposition at every segment boundary.

The next segment should emerge from the prior segment's tail through subject return, subject-fragment development, inversion, modulation, episode, or stretto-like continuation. It should not begin another alto / soprano / tenor / bass exposition cycle unless the planner explicitly chooses a later formal re-exposition as musical material.

The piano roll should also present the chain as one continuous timeline. It may keep segment metadata visible, but it must not visually reset to a new piece at the hidden boundary.

## Reported Symptom

Human feedback: `continuous fugue` is not continuing well. Instead of smoothly introducing another subject from the previous segment ending and continuing the piece, it starts the alto, soprano, tenor, bass entries again. The piano roll also suddenly shows another piece, so the experience is not continuous.

Likely structural cause:

* Web segment chaining currently requests the next segment with a derived seed, then adopts the generated segment as a fresh playback model.
* Core generation still builds every score from `buildExposition`, so every segment begins from an initial exposition state.
* The Phase 8 snapshot contract exists as documentation and data shape, but the next-segment generation path does not yet consume a segment snapshot carrying subject family, section planner state, tonal region, density arc, novelty / fatigue budget, voice continuity, PRNG state, and bounded past event context.
* Piano-roll rendering is tied to the adopted segment model and playback second, so hidden-boundary `continuous-fugue` playback resets the visual timeline even when the audio boundary has no pause.

Theory basis: continuous fugue semantics require form-level continuation. A later re-entry or return can be clear and even emphatic, but it should be prepared by the preceding harmonic and textural context. A literal restart of the initial exposition entry order reads as a new piece, not as hidden-boundary continuation.

## Scope

* Add a real next-segment generation path for `continuous-fugue` that starts from the prior segment snapshot rather than from a derived seed alone.
* Preserve the initial segment path for the first segment only.
* Carry enough bounded context across the boundary for candidate generation, scoring, and diagnostics to see the previous tail.
* Make the next segment start in a continuation state such as `episode`, `subject-return`, or `stretto-like` unless a later re-exposition is explicitly planned and justified.
* Keep `endless-program` and `regenerative-cycle` behavior separate. `endless-program` may still have audible piece boundaries and terminal coda work; `continuous-fugue` must avoid terminal coda and hidden re-exposition reset.
* Change Web playback and piano-roll state so hidden-boundary continuous playback appends or window-scrolls through a session timeline instead of replacing the visible score with a new piece.
* Add diagnostics or review evidence that detects exposition-like segment restarts in `continuous-fugue`.

## Out Of Scope

* Hiding the reset with playback smoothing, release envelopes, boundary silence, animation, or piano-roll crossfade.
* Making all modes visually identical. `endless-program` can still expose segment boundaries as piece boundaries.
* Implementing full durable session persistence, rewind, IndexedDB history, or arbitrary state editing.
* Fixing one literal seed, key, time signature, voice order, measure, or current note ordering artifact.
* Removing all later four-voice subject-entry sequences. The blocker is unplanned segment-boundary re-exposition, not every future stretto, return, or formal recapitulatory gesture.

## Workstreams

### CFC-A: Baseline boundary review

Run a focused review on current `continuous-fugue` chaining before changing generation. Preserve the reported symptom and classify possible meanings:

* literal restart of `exposition` at segment tick 0;
* repeated initial entry order across segment boundaries;
* subject family reset rather than transformed continuation;
* tonal-region reset;
* density arc reset;
* piano-roll timeline reset.

Initial seeds:

* `fugue-smoke` as the default representative;
* one modal seed;
* one dense or stretto-heavy seed;
* one short-segment stress case;
* one control where an exposed later return is musically acceptable but not at a segment start.

Record score-window findings in `../reviews/` if the review changes diagnostics scope, acceptance criteria, or seed policy.

### CFC-B: Snapshot handoff model

Define the segment-end snapshot that `continuous-fugue` needs at the generation boundary.

The snapshot should include:

* subject family and active transformations;
* recent answer transforms and fragment derivations;
* current tonal region and pending modulation target;
* density arc and active / recently resting voices;
* novelty and fatigue budget;
* section planner state and recent state history;
* unresolved voice / role continuity;
* bounded past event context for ScoreEvent, role, metrical, harmonic, and section-function evidence;
* PRNG internal state for deterministic continuation.

The snapshot should be created from the generated segment tail, not inferred from the next seed string.

### CFC-C: Continuation generation API

Add a core generation entry point that accepts a segment snapshot and emits the next segment as continuation material.

Acceptance criteria:

* initial generation can still create segment 0 from an initial snapshot;
* segment 1 and later in `continuous-fugue` do not call the initial exposition builder as their first structural act;
* planned entries at the new segment start are classified as continuation entries, returns, fragments, or stretto-like entries rather than initial `exposition` entries;
* generated ticks can be offset into session time or otherwise mapped without losing local segment reproducibility;
* diagnostics can still run on segment-local output while review can inspect boundary-local context.

### CFC-D: Section planner continuity

Teach the continuation planner to choose boundary-aware first sections.

The first section after a hidden boundary should be selected from the carried state:

* if the prior tail prepares an entry, introduce the next subject or fragment in a compatible voice and tonal region;
* if the prior tail is episodic, continue sequence, inversion, or modulation toward a planned return;
* if density is high or fatigue is high, thin or vary texture without dropping voice agency;
* if the prior tail contains unresolved tension, resolve or explain it before adding new entry pressure.

Repeated initial entry order should receive a strong cost unless explicitly marked as a later formal re-exposition with review-visible rationale.

### CFC-E: Boundary diagnostics and review surface

Add a `continuousSegmentContinuity` review surface, or extend an existing review surface, to expose hidden-boundary reset evidence.

The review should classify:

* `accepted-continuation`;
* `prepared-subject-return`;
* `prepared-stretto`;
* `developmental-episode`;
* `review-required-reexposition`;
* `generator-response-required-reset`.

Signals should include segment index, boundary tick, previous tail state, next first state, first entries, entry-order similarity to initial exposition, carried subject family, tonal-region continuity, density continuity, and whether the piano-roll session timeline remained continuous.

Initial CI / review scope: `review-required`. A narrow deterministic case where segment 1 starts with `exposition` and the initial entry order may later become `ci-observed` or `ci-blocking` once false positives are known.

### CFC-F: Web worker protocol and prefetch

Update the Web worker request / response protocol so prefetch can pass a previous segment snapshot for `continuous-fugue`.

The Web layer should:

* keep the seed as the session seed, not mutate the visible seed into a derived per-segment seed for `continuous-fugue`;
* pass `segmentIndex` and previous snapshot to the worker;
* receive the generated segment, next snapshot, deadline result, and review snapshot;
* keep fallback status visible if the worker cannot produce a snapshot-based continuation before deadline.

The derived seed path may remain for modes where piece-like or regenerative segment semantics still require it, but it must not be the only continuation mechanism for `continuous-fugue`.

### CFC-G: Piano-roll session timeline

Change piano-roll playback state for `continuous-fugue` from segment replacement to session timeline rendering.

The first implementation can keep a bounded in-memory rolling window rather than full persistence. It should:

* append adopted segment notes into a session score model or timeline buffer;
* maintain a session playback offset so segment-local ticks draw at their session position;
* scroll or window the piano roll through the boundary without resetting to zero;
* preserve role color and entry metadata across segment boundaries;
* show segment index as metadata without making the boundary look like a new piece.

For `endless-program`, replacing the visible score at an audible boundary remains acceptable. For `regenerative-cycle`, choose behavior from bridge semantics when its dedicated UI scope is implemented.

### CFC-H: Tests and verification

Add focused tests at the core and Web boundaries.

Core tests:

* segment 0 starts from an initial exposition;
* segment 1 for `continuous-fugue` starts from a continuation snapshot and does not begin with `exposition`;
* carried subject family and tonal region influence the first continuation section;
* deterministic continuation holds for the same generator version and snapshot;
* diagnostics expose reset classification when a synthetic snapshot is followed by an exposition-like restart.

Web tests:

* prefetch sends a snapshot for `continuous-fugue`;
* adopting a continuous segment appends to the session timeline instead of replacing the piano-roll model;
* visible seed remains the session seed in continuous mode;
* `endless-program` still keeps audible-boundary segment replacement behavior.

Manual / agent review:

* inspect at least one representative boundary in a generated review bundle;
* verify that piano-roll screenshots before and after the boundary show a continuous time window rather than a new score at tick 0;
* record any remaining listening gap if no human listening pass is done.

## Completion Conditions

* `continuous-fugue` segment 1 and later are generated from a carried snapshot, not only from a derived seed.
* The first structural state after a hidden boundary is continuation material, not an unplanned initial exposition.
* The initial alto / soprano / tenor / bass entry order no longer repeats at every continuous segment boundary.
* Subject family, transformations, tonal region, density arc, novelty / fatigue, voice continuity, PRNG state, and bounded context are carried enough for deterministic continuation.
* Boundary diagnostics or review evidence can distinguish prepared continuation from generator reset.
* The Web piano roll renders continuous-mode playback as a session timeline through hidden boundaries.
* `endless-program` terminal coda work remains separate, and `continuous-fugue` still receives no terminal coda.
* Added generation and UI changes do not hide hard failures, subject identity violations, answer plan violations, unresolved entry clashes, all-voice silence, or texture thinning.
* Focused review evidence is recorded before the plan is marked complete. Human listening may remain a gap, but score-window and piano-roll inspection gaps must be explicit.

## Handoff Notes

This is a repair to the implementation of existing Phase 8 semantics, not a change to the durable definition of `continuous-fugue`.

The current implementation behaves like a sequence of fresh pieces because the chaining path does not yet consume the snapshot contract. The durable design principle is: a hidden boundary is allowed to be a generation boundary, but it must not be a musical or visual restart.

## Completion Record

Implemented snapshot-based `continuous-fugue` continuation generation and Web prefetch handoff. Segment 1 and later receive the previous segment snapshot, resume the carried PRNG state, preserve subject-family / tonal-region / density / bounded-context evidence, and begin with continuation states rather than a fresh initial exposition.

Added `continuousSegmentContinuity` diagnostics with classifications for prepared returns, stretto, developmental episodes, re-exposition review cases, and generator resets. The Web worker response now carries the next snapshot and continuity status, while continuous-mode piano-roll rendering appends segments into a session timeline.

Focused implementation evidence is recorded in [Continuous fugue segment continuity review](../reviews/continuous-fugue-segment-continuity-review.md). Human listening remains a gap; score-window diagnostics and automated piano-roll timeline tests cover the implementation acceptance evidence.
