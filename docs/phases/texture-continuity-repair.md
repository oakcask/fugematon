# Texture Continuity Repair

Texture continuity repair is inserted after Score-led beauty handoff and Metrical generation repair, before Infinite playback MVP. Its purpose is to stop exposed free-counterpoint from becoming a default solo filler when subject or answer material is not active.

Status: current quality blocker for Infinite playback MVP. The first reported seed is `seed-0i335vx-1n54a1x`, where measure 5 thins to bass answer plus one outside free-counterpoint support, measure 9 exposes a bass-only free-counterpoint beat, and measure 28 exposes a two-quarter tenor free-counterpoint solo. The repair must be structural, not seed-specific.

Planning review:

* [Texture continuity replan](../reviews/texture-continuity-replan.md): user-reported score-window evidence, structural hypothesis, CI / review scope, and implementation order.

## Rationale

Earlier work repaired all-voice silence, bass-only first-answer collapse, long post-answer thin-support windows, and repeated free-counterpoint phrase signatures in focused sets. The new report shows a remaining gap: one outside support voice can still be accepted as enough at the first bass-answer tail, and later continuation can expose a single free-counterpoint line whose short stock phrase is not strong enough to carry the texture alone.

This is a score-window failure rather than only a metric failure. `soloTexture` sees the reported seed as having solo runs, including one unsupported abrupt run, and `bassAnswerTailTexture` records one-outside tail ticks while still classifying the tail as supported. The generator therefore needs a stronger texture-floor model and the diagnostics need to distinguish acceptable cadential or rhetorical thinning from exposed filler.

Theory basis: fugue texture may reduce to two voices, pedal support, cadence preparation, echo, or deliberate solo rhetoric. The reported windows are different: the non-entry voices withdraw without a clear cadence or prepared solo function, and the exposed free-counterpoint line uses a short formula rather than a function-bearing continuation.

## Scope

* Add score-window evidence for exposed free-counterpoint solo: active voice count, role, voice, section state, cadence proximity, phrase-boundary proximity, and whether the line has cadence, pedal, echo, suspension, or entry-preparation function.
* Raise first bass-answer tail acceptance so one outside support voice is not automatically enough when the tail lasts two or more beats without a cadence or prepared two-part function.
* Add generation support for exposed free-counterpoint solo windows by inserting an independent chord-tone, root, oblique, or staggered support line in an available voice.
* Rework continuation texture planning so `thin` means functionally thin, not default one-voice filler. Cadential thinning and deliberate exposed rhetoric remain allowed when marked by score-window evidence.
* Treat exposed free-counterpoint phrase vocabulary separately from support density. Once a free-counterpoint line is exposed, its phrase must show local function through cadence approach, sequence direction, subject relation, register transfer, contour change, or rhythmic profile.
* Add candidate scoring pressure against exposed filler solo while preserving hard constraints, subject identity, answer plan, voice order, and existing entry-continuity repairs.
* Keep review scope classified under [CI and review scope](../reference/quality-metrics/ci-review-scope.md). Beauty-sensitive windows remain `review-required` until false positives, runtime, and repair targets are stable.

## Out Of Scope

* Hiding texture gaps with playback smoothing, visualizer emphasis, instrument profile changes, or segment boundaries.
* Requiring all four voices to sound at all times.
* Rejecting every one-voice or two-voice passage. Cadential thinning, pedal, echo, suspension preparation, and exposed solo rhetoric remain valid when the score-window function explains them.
* Fixing only `seed-0i335vx-1n54a1x`, a literal measure number, a literal pitch, or a literal voice assignment.
* Widening `soloTexture` or `bassAnswerTailTexture` thresholds to make the symptom disappear.

## Workstreams

### TCR-A: Exposed-solo review surface

Add focused diagnostics or review helpers that list exposed free-counterpoint solo windows with seed, measure or tick, voice, section state, role, duration, previous active voice count, and functional explanation. The first review set is `seed-0i335vx-1n54a1x`, plus representative, boundary, rotation, and adversarial controls.

The first metric classification is `review-required`. It may become `ci-observed` once runtime and false positives are known. It should become `ci-blocking` only for narrow deterministic regressions such as an unprepared exposed free-counterpoint solo of one beat or more in the focused seed set.

### TCR-B: First bass-answer tail texture floor

Change the first bass-answer tail model so one outside voice is visible as a review signal rather than accepted support by default. The generator should prefer two outside support voices, carried support, staggered continuation, or a clear two-part function after the bass answer tail.

The acceptance distinction is structural: zero outside voices and bass-only free-counterpoint remain severe; one outside voice for a sustained tail becomes review-required unless explained by cadence, pedal, suspension, echo, or deliberate two-part rhetoric.

### TCR-C: Exposed free-counterpoint solo support generation

Add a post-processing or candidate-generation step after existing functional thinning and post-entry support repairs. It should find long exposed free-counterpoint solo windows and add a non-colliding support line in an available voice.

Support should prefer root, chord-tone, oblique, or staggered motion and must avoid obvious voice crossing, exact pitch collision, pitch-class unison pressure, unresolved entry friction, and cheap shared-rhythm lockstep.

### TCR-D: Continuation texture-floor planning

Replace the implicit default that a continuation tail may use one free-counterpoint voice with a phrase-level texture floor. `thin`, `balanced`, and `full` should describe functional texture, not just voice count.

The planner should distinguish cadence thinning, entry preparation, pedal, echo, suspension preparation, exposed solo rhetoric, and unsupported filler before candidate scoring rewards a low-density section.

### TCR-E: Exposed phrase grammar

Only after support density is stable, improve the free-counterpoint material that remains exposed. Avoid treating a short stock degree pattern as enough solo material. Exposed free-counterpoint should vary rhythm, contour, sequence direction, cadence approach, register, or relation to subject and counter-subject material.

This workstream must not use unprepared semitone friction, counter-subject collision, or voice crossing as a cheap source of variety.

### TCR-F: Review and handoff

Run a focused score-window review on `seed-0i335vx-1n54a1x`, `bach-001`, `fugue-smoke`, `minor-entry`, `modal-cadence`, `dense-modal`, and at least one ad hoc control seed. Record metrics that improve, metrics that regress, the concrete musical symptom for each tradeoff, and whether the response belongs in generation, scoring, diagnostics, docs, or manual listening.

## Completion Conditions

* The reported `seed-0i335vx-1n54a1x` measure-5 bass-answer tail no longer relies on one outside support voice for the sustained tail unless a score-window function explains it.
* The reported measure-9 and measure-28 exposed free-counterpoint solo windows are repaired by structural support or classified with an explicit musical function.
* Focused review seeds have no unprepared exposed free-counterpoint solo of one beat or more in non-cadential windows, unless the review records a cadence, pedal, echo, suspension, entry-preparation, or deliberate solo-rhetoric explanation.
* Added support does not introduce hard failures, subject identity violations, answer plan violations, or hidden all-voice silence.
* Tradeoffs in unison, shared rhythm, harmonic mismatch, weak/offbeat dissonance, leap recovery, and counter-subject survivability are recorded by seed and score-window symptom.
* `soloTexture`, `bassAnswerTailTexture`, and the new exposed-solo review surface remain visible to Infinite playback MVP; operational UI must not hide these signals.
* Focused `organ-default` and `strict-counterpoint` listening notes are recorded or explicitly left as a listening gap before handoff.

## Phase 8 Handoff

Infinite playback MVP may resume only after Texture continuity repair has score-window evidence for the reported seed and a focused seed set. Segment boundaries, visualizer treatment, performance profiles, or playback smoothing must not be used to mask exposed free-counterpoint filler, bass-answer tail thinning, or unsupported solo texture.
