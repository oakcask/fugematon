# Metrical Generation Repair

Status: current implementation target before `Infinite playback MVP`.

This plan responds to the user-reported `seed-0kowcm6-0am7x3f` symptom: the exported score is 3/4, but the music does not sound like triple meter. The cause is structural, not playback-only. `generateScore` chooses a time signature and emits it as metadata, while subject generation, exposition spacing, continuation planning, harmonic anchors, metrical intent, scoring, and diagnostics still use quarter- and two-quarter constants that mostly behave like 4/4.

Review basis: [Metrical generation review](../reviews/metrical-generation-review.md).

## Scope

* Introduce a shared meter context derived from `TimeSignature`, including measure length, beat unit, beat index, downbeat, secondary accent, weak beat, offbeat, and compound-meter grouping.
* Thread meter context through `buildSubject`, `buildFugueScore`, exposition and continuation section planning, harmonic-plan anchor placement, texture generation, candidate evaluation, and diagnostics.
* Rebuild subject rhythm choices so 3/4 subjects can establish a three-beat measure instead of applying the same two-quarter strong-beat map used by 4/4.
* Rebuild exposition entry spacing so 3/4 defaults land on intentional metrical positions. Off-bar entries remain allowed only when represented as pickup, stretto, hemiola, or cross-metric rhetoric.
* Align harmonic anchors, cadence targets, structural-root support, and strong-beat dissonance classification to the selected meter.
* Add `meterConsistencyReview` diagnostics for time-signature metadata versus entry starts, subject accents, metrical-harmony intent, harmonic anchors, cadence targets, and phrase boundaries.
* Include 6/8 compound meter in the design instead of only patching 3/4.

## Out Of Scope

* UI controls for manually choosing or correcting meter.
* Playback accent simulation that makes an unchanged score sound more metric.
* Hiding metrical weakness with segment boundaries, visualizer phrasing, or performance profiles.
* Rewriting fugue form, counter-subject identity, or line-agency objectives except where their timing depends on meter context.

## Completion Conditions

* `seed-0kowcm6-0am7x3f` generates 3/4 score windows whose subject starts, structural tones, support texture, and cadential targets establish triple meter unless a window is explicitly classified as pickup, hemiola, stretto, or cross-metric.
* Focused 3/4 seeds include `seed-0kowcm6-0am7x3f`, `seed-0zereox-1v729ih`, and `tight-stretto`, with 4/4 controls including `fugue-smoke`, `bach-001`, and `contrary-motion`.
* A 6/8 focused seed set is identified or generated, then reviewed for compound-meter grouping and not only downbeat alignment.
* 4/4 behavior remains stable enough that the repair does not regress the Phase 14 entry-continuity, weak-dissonance, counter-subject, and phrase-vocabulary evidence without an explicit score-window tradeoff.
* `meterConsistencyReview` reports representative windows and stays `review-required` until the musical symptom, fix target, and runtime cost justify any CI promotion.
* Focused `organ-default` and `strict-counterpoint` listening notes are recorded for the affected seed set before `Infinite playback MVP` resumes.

## Workstreams

### M1: Meter Context And Baseline Diagnostics

Add a meter helper module that maps ticks to measure position and beat strength from `TimeSignature`. Record current behavior for the focused 3/4 and 4/4 seeds, then add `meterConsistencyReview` without changing notes first.

### M2: Subject And Entry Planning

Pass meter context into subject generation and exposition planning. Add 3/4-compatible subject rhythm profiles and meter-aware entry spacing. Keep deliberate off-bar imitation possible, but make it explicit in planned-entry metadata and review output.

### M3: Harmony, Texture, And Scoring

Pass meter context into harmonic anchors, metrical-harmony intent, texture note creation, candidate evaluation, and strong-beat diagnostics. Ensure structural tones and cadences are judged against the selected meter, not a hard-coded two-quarter cycle.

### M4: 6/8 Compound-Meter Coverage

Extend beat-strength grouping for 6/8 before the repair is considered complete. Add focused seeds and review windows for compound downbeat, mid-measure accent, and offbeat motion.

### M5: Review Bundle And Handoff

Regenerate focused review evidence, record listening gaps or accepted tradeoffs, and update `Infinite playback MVP` handoff text. Only then resume operational work.
