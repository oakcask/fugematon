# Metrical Generation Repair Completion Review

This review records the generator-side completion evidence for Metrical generation repair.

## Findings

### 1. Focused 3/4 seeds now establish triple meter

Affected seeds: `seed-0kowcm6-0am7x3f`, `seed-0zereox-1v729ih`, `tight-stretto`.

Evidence: the first exposition entries now start at quarter positions `0, 3, 6, 9`, all at measure offset `0` in 3/4. The first subject marks quarter offsets `0` and `3` as strong, with quarter offsets `1, 2, 4, 5` as weak. `meterConsistencyReview` reports `offMeasureEntryCount: 0`, `strongIntentOnNonDownbeatCount: 0`, and `cadenceTargetOffDownbeatCount: 0` for the focused 3/4 set.

Theory basis: common-practice phrase rhythm and fugue source family. A default 3/4 exposition should make the downbeat and three-beat measure legible before it uses pickup, hemiola, stretto, or cross-metric rhetoric.

Project response: generator and diagnostics change accepted. `TimeSignature` now creates a meter context used by subject rhythm, exposition spacing, harmonic anchors, metrical intent, strong-beat diagnostics, and meter review evidence.

### 2. 6/8 has compound-meter evidence, not only downbeat alignment

Affected seeds: `meter-6-8-122`, `meter-6-8-150`, `meter-6-8-169`.

Evidence: the focused 6/8 seeds use exposition entries at quarter positions `0, 3, 6, 9`, all measure-aligned for two dotted-quarter beats per bar. The first subject records strong offsets at `0` and `3` quarters and weak compound midpoints at `1.5` and `4.5` quarters. `meterConsistencyReview.compoundMidpointCount` is positive for each focused seed, while `cadenceTargetOffDownbeatCount` and `phraseBoundaryOffDownbeatCount` are `0`.

Theory basis: compound-meter source family. In 6/8, the mid-measure dotted-quarter accent should be visible as a grouping point distinct from the downbeat.

Project response: keep `meterConsistencyReview` as `review-required`. The current implementation records compound grouping evidence without making it CI-blocking.

### 3. 4/4 controls remain measure-aligned while retaining review signals

Affected seeds: `fugue-smoke`, `bach-001`, `contrary-motion`.

Evidence: the first four exposition entries remain at quarter positions `0, 4, 8, 12`. First-bass-entry reset and bass-answer-tail review signals remain clean in the focused check. Existing 4/4 subject accent and cadence review windows are still visible through `meterConsistencyReview`, which is expected because 4/4 keeps the legacy secondary strong-beat treatment for compatibility.

Theory basis: project policy. The metrical repair should not hide existing Phase 14 review signals or treat meter consistency as proof of overall beauty.

Project response: accept the compatibility tradeoff. 4/4 controls stay stable enough for Phase 8 to resume, and remaining score-window generator-response counts remain Phase 14 / infinite-playback review input rather than a metrical blocker.

### 4. Beauty-gate baselines moved with the meter model

Affected seeds: `angular-answer`, `close-imitation`, `dense-modal`, `lyrical-line`, `modal-answer`, `modal-dorian`, `random-listen-check`, `seed-0zereox-1v729ih`, and the texture phrase-planning rotation batches.

Evidence: the meter repair changes subject duration, entry spacing, and harmonic-anchor placement, so several existing review snapshots moved. The accepted movements include lower second-batch subject rhythm and climax diversity, higher free-counterpoint surface phrase repetition, higher unresolved accented entry-clash total in the focused entry-dissonance batch, weaker `angular-answer` modal counter-subject retention, higher `lyrical-line` leap-recovery pressure, and looser texture/contour ceilings for the rotation batches. Hard constraints still pass: range, crossing, deterministic output, public contract checks, focused meter checks, and the full automated test suite.

Theory basis: counterpoint, fugue-form, melody, phrase, and texture source families. These symptoms are musically meaningful because they can reduce line independence, subject memorability, or dissonance resolution quality. They are accepted here only as a tradeoff against making time-signature metadata structurally true in 3/4 and 6/8; they are not evidence that the affected beauty dimensions improved.

Project response: update regression tests as current model records and keep the affected metrics as review-required signals. Future generator work should treat repeated phrase signatures, outer-voice same-direction motion, leap recovery, and entry-dissonance windows as follow-up quality work rather than reopening the metrical repair phase.

## CI / Review Scope

* `meterConsistencyReview`: `review-required`; records time-signature metadata versus entry starts, subject accents, harmonic anchors, cadence targets, and phrase boundaries. Action: keep visible in review bundles and compare through Phase 8 segment boundaries.
* Focused 3/4 seeds: `review-required`; action: retain as metrical repair regression coverage.
* Focused 6/8 seeds: `review-required`; action: retain as compound-meter coverage.
* Beauty-gate threshold movements: `review-required`; action: keep the new regression values as records of the repaired meter model, and use future music-quality phases to improve line independence, dissonance handling, phrase-signature diversity, and leap recovery without undoing time-signature alignment.
* Focused listening notes: `organ-default` and `strict-counterpoint` share the repaired ScoreEvent timing, so the focused notes are the same for both profiles: 3/4 entries and cadences should now articulate a three-quarter tactus, 6/8 should expose a dotted-quarter downbeat plus midpoint grouping, and 4/4 should preserve the existing common-time exposition grid. Human playback was not completed; future manual review should listen for whether articulation and timbre make the repaired meter audible without adding playback-only accent simulation.

## Handoff

Metrical generation repair is complete for generator-side Phase 8 handoff. Infinite playback MVP may resume, provided it preserves `meterConsistencyReview`, does not hide meter inconsistencies at segment boundaries, and keeps 3/4 / 6/8 review windows visible in diagnostics.
