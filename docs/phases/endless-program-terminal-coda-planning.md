# Endless program terminal coda planning

Status: complete.

This plan follows [Endless program terminal cadence validation](endless-program-terminal-cadence-validation.md). The previous target proved that `endless-program` can expose terminal closure evidence, but the current repair still behaves like a terminal-boundary override: the last score material is clipped and replaced by a short four-voice terminal sonority. That can satisfy cadence diagnostics while sounding abrupt, especially when voices that were resting re-enter together at the final boundary.

## Goal

Generate a formal terminal coda for `endless-program` segments instead of relying on a one-beat terminal sonority override.

The coda should make the segment end like a short piece: it prepares the cadence, restores or releases texture intentionally, lands the bass and outer voices on stable terminal tones, and leaves any final rest as a piece boundary rather than as hidden silence.

`continuous-fugue` keeps hidden-boundary continuation semantics and must not receive a terminal coda. `regenerative-cycle` still requires cadential closure, but its ending may keep bridge intent for the next segment, so it should not be treated as identical to a self-contained `endless-program` coda.

## Reported Symptom

Human feedback: `endless program` currently creates an ending of only about two beats, and parts that were resting immediately before the ending return at once so all four parts suddenly sound. The result is musically unnatural.

Likely structural cause: `applyTerminalClosureIntent` currently changes only the terminal boundary by clipping notes near the end and inserting a four-voice terminal sonority. This is useful as a closure fallback and review target, but it is not a phrase-level or section-level ending.

Theory basis: a fugue or fugue-like segment can close with fuller texture, but the texture change should be prepared by cadence function, suspension or resolution, pedal or low-voice support, echo, subject-fragment liquidation, or deliberate final reinforcement. A sudden restart of resting voices on the final sonority reads as a texture discontinuity even when the final chord itself is stable.

## Scope

* Add a planner-level terminal coda concept for `endless-program`.
* Reserve the final one to two measures, or a meter-aware equivalent, before ordinary continuation generation reaches the segment boundary.
* Represent the coda in score-visible structure, either as a `coda` state or a terminal section intent that diagnostics and review windows can distinguish from ordinary `subject-return`, `episode`, or `stretto-like` material.
* Generate cadence preparation inside the coda: predominant or dominant approach, low-voice root support, stable outer-voice landing, and mode-aware terminal tones.
* Reintroduce resting voices gradually when a fuller final texture is desired. A voice that was silent should return as prepared support, suspension/resolution, cadence figure, echo, or terminal reinforcement before the final landing, not only on the final attack.
* Preserve modal closure as modal closure. Do not force modal seeds into tonal authentic-cadence behavior.
* Keep `TerminalClosureReviewSummary` visible, but make it validate the generated coda rather than prove that the fallback sonority is enough.
* Keep `applyTerminalClosureIntent` as a conservative fallback while coda generation is introduced. It should become a safety net, not the normal successful path.

## Out Of Scope

* Hiding weak endings with playback pause, release envelopes, visualizer treatment, fallback output, or boundary silence.
* Requiring all four voices to sound throughout the coda.
* Treating every two-voice or three-voice ending as weak. Prepared cadential thinning, pedal, suspension, echo, and deliberate two-part rhetoric remain allowed when the score-window function explains them.
* Fixing one literal seed, measure, key, pitch, time signature, voice name, or current note ordering artifact.
* Full `regenerative-cycle` UI or bridge design. This plan may define compatibility requirements, but the first repair target is self-contained `endless-program` closure.

## Workstreams

### EPC-A: Baseline coda review

Run a focused review on current `endless-program` endings before changing generation. Preserve the human symptom and classify possible meanings: too-short cadence span, sudden active voice count increase, simultaneous re-entry after rests, unsupported final texture thickening, or insufficient phrase-level closure.

Initial seeds:

* `fugue-smoke` as the default representative.
* `modal-cadence` and `sparse-cadence` as cadence stress cases.
* `dense-modal` as modal density stress.
* `tight-stretto` and `circle-fifths` as entry and harmonic-pressure stress cases.
* At least one short-segment boundary case and one longer review-length control.

Record concrete score-window findings in `../reviews/` if the review changes evidence, diagnostics scope, or acceptance criteria.

### EPC-B: Coda structure model

Choose the representation for terminal coda. The preferred model is planner-visible structure rather than texture-only repair:

* either extend `FugueState` with `coda`;
* or add a terminal section intent / phrase role that keeps public compatibility while still appearing in `sectionPlans`, diagnostics, and review windows.

The model should carry cadence kind, local and target key, density arc, cadence preparation status, and whether the section is self-contained closure or bridge-like closure.

### EPC-C: Planner reservation

Update segment planning so `endless-program` reserves coda time before filling the segment with ordinary continuation sections.

Planner acceptance criteria:

* ordinary continuation does not run all the way to the segment boundary and then get clipped;
* the coda starts on a meter-aware boundary when possible;
* the coda duration is long enough to show preparation and landing, not only the final sonority;
* very short requested segments degrade visibly through diagnostics or fallback rather than pretending to have full coda form.

### EPC-D: Coda texture generation

Generate coda notes as phrase material. The first implementation can be conservative, but it should include a preparation-to-landing arc:

* approach: predominant or dominant support, subject-fragment liquidation, or cadence figure;
* preparation: low voice establishes root or cadential support and upper voices move toward chord tones;
* landing: outer voices and bass arrive on stable terminal tones;
* release: optional final rest only after stable terminal sonority.

Voice re-entry should be staggered or function-labeled. A silent voice may re-enter for cadence support, but the final attack should not be the first evidence that the voice belongs in the ending.

### EPC-E: Review and diagnostics alignment

Extend terminal closure review or add a terminal coda review surface so the diagnostics can distinguish:

* generated coda versus fallback terminal sonority;
* prepared voice re-entry versus sudden final-boundary restart;
* cadence-supported thickening versus unsupported texture jump;
* cadential thinning versus unsupported collapse;
* self-contained coda versus regenerative bridge.

The first scope classification should be `review-required`. Narrow deterministic regressions, such as all resting outside voices re-entering only on the final attack in focused `endless-program` seeds, may later become `ci-observed` or `ci-blocking` once false positives are known.

### EPC-F: Fallback demotion

Keep the current terminal closure override only as conservative fallback during the transition. Normal accepted `endless-program` generation should show a coda section and should not need the fallback to create the first stable terminal sonority.

If fallback is used, worker and UI snapshots should continue to expose terminal closure status and should add enough status to avoid presenting fallback closure as generated coda quality.

## Completion Conditions

* `endless-program` generation includes planner-visible terminal coda structure before the segment boundary.
* The generated coda reserves enough meter-aware time to prepare a cadence, not just insert the final sonority.
* Focused seeds no longer rely on simultaneous final-attack re-entry of previously resting voices to create four-part closure.
* Final low-voice support, outer-voice landing, unresolved boundary dissonance, and final-rest classification remain visible through `TerminalClosureReviewSummary` or a successor review surface.
* The review surface distinguishes generated coda from fallback terminal closure.
* `continuous-fugue` still avoids terminal cadence requirements and receives no terminal coda.
* `regenerative-cycle` behavior remains compatible with future bridge design and is not silently collapsed into `endless-program` semantics.
* Added coda generation does not introduce hard failures, subject identity violations, answer plan violations, hidden all-voice silence, or unresolved terminal dissonance.
* Any accepted regressions in unison, shared rhythm, texture density, modal color, or phrase development are recorded as concrete musical tradeoffs, not only as metric deltas.
* Focused review evidence is recorded before the plan is marked complete. Human listening may remain a gap, but the score-window review gap must be explicit.

## Handoff Notes

This plan changes phase scope from terminal cadence validation to terminal coda generation. It should be implemented before using `endless-program` closure as evidence that segment boundaries are musically satisfying.

The durable design principle is: `endless-program` boundaries are audible piece boundaries, so they need generated form-level closure. A stable final chord is necessary evidence, but not sufficient evidence, when the preceding texture makes the ending sound pasted on.

## Completion Record

Implemented planner-visible coda generation for `endless-program` by reserving a terminal section with `terminalIntent: "self-contained-coda"` before the boundary. The coda generates staggered cadence preparation and a stable terminal landing before `applyTerminalClosureIntent` runs, so the terminal sonority override is now a fallback rather than the normal successful path.

`TerminalClosureReviewSummary` schema version 2 distinguishes `generated-coda`, `fallback-terminal-closure`, `bridge-compatible-closure`, ordinary cadence, and `not-required` sources. It also exposes prepared voice re-entry and final-attack re-entry counts while keeping low-voice support, outer-voice landing, unresolved boundary dissonance, thinning, and final-rest evidence.

Focused evidence is recorded in [Endless Program Terminal Coda Review](../reviews/endless-program-terminal-coda-review.md). The focused `endless-program` seeds all report generated coda source, prepared re-entry, accepted root-supported terminal closure, no unresolved boundary dissonance, no hidden all-voice silence, and no range, crossing, subject identity, or answer plan hard failures. `continuous-fugue` still reports terminal closure as `not-required` and receives no coda. `regenerative-cycle` remains bridge-compatible and does not receive a self-contained coda.
