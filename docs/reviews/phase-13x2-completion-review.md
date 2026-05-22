# Phase 13X2 Completion Review

This review records the Phase 13X2 repair for first-bass-answer tail texture. It uses the standard 22 seed review set at 129600 ticks and focused score-window inspection of the first bass answer tail.

Source-family basis remains Fux/species counterpoint for line continuity and common-practice fugue for answer rhetoric, countersubject continuity, episode pacing, and prepared thinning. No new edition-specific citation pass was performed in this completion review.

## Findings

### 1. Bass-only free-counterpoint tail is repaired

Across the 22 seed review set, `bassAnswerTailTexture.reviewRequired` is now false for every seed. The focused first-bass-answer tail window reports:

* 0 seeds with bass-only free-counterpoint tail after the first bass answer.
* 0 seeds with zero outside voices in the tail window.
* 0 seeds with `entryBoundaryContinuity.firstBassEntrySynchronizedReset`.
* 0 post-exposition bass-entry synchronized resets.

The affected planning-review seeds `wide-key`, `modal-dorian`, `contrary-motion`, `tight-stretto`, and `modal-cadence` no longer collapse to bass-only free counterpoint around the first continuation after the first bass answer.

Musical judgement: the likely reported symptom is repaired. The bass answer no longer leads into a score window where soprano, alto, and tenor all disappear while bass continues free counterpoint.

### 2. The diagnostic separates tail thinning from entry-boundary reset

`bassAnswerTailTexture` is now separate from `entryBoundaryContinuity`. The new summary localizes the first bass answer start, answer end, tail window end, zero-outside duration, bass-only free-counterpoint duration, one-outside duration, minimum outside-voice count, and active outside voices.

This keeps the Phase 13X entry-boundary evidence intact while exposing the corrected Phase 13X2 symptom directly. `allVoiceSilenceGapCount` can remain 0 without hiding the case where upper-line agency disappears after the bass answer.

### 3. Role-visible piano-roll and playback data improve feedback localization

Playback events and piano-roll layout now preserve `NoteRole`. The piano roll can distinguish subject, answer, subject-fragment, counter-subject, free-counterpoint, and fallback notes even when a note is not the start of a planned entry.

Project response: this is review observability, not a musical repair by itself. It lets future listener reports identify whether a symptom belongs to entry material, counter-subject, free counterpoint, episode support, or fallback.

### 4. Focused profile notes

`organ-default`: the repaired planning-review seeds no longer present the old bass-only tail after the first bass answer. The texture can still thin to a single upper line in some windows, but there is no score-window evidence that all upper voices stop while bass alone continues.

`strict-counterpoint`: the profile keeps the remaining limitation easier to hear. Several seeds still have one-outside-voice tail spans, so Phase 14 should continue to treat line agency and counter-subject survivability as score-led beauty issues. This is not a Phase 13X2 blocker because the corrected symptom was the unexplained zero-outside / bass-only collapse.

## Accepted Tradeoff

Phase 13X2 does not require dense texture throughout the tail. Cadential thinning, exposed solo rhetoric, or one upper line can be acceptable when the score keeps at least one active or prepared outside voice. The remaining one-outside spans stay visible through `bassAnswerTailTexture.oneOutsideVoiceTicks` and should not be hidden by Phase 13Y, Phase 13Z, or Phase 14.

The repair adds upper support in formerly bass-only tail windows. In the Phase 11/12 representative batch `bach-001`, `fugue-smoke`, `wide-key`, and `modal-dorian`, this moves the section-local planner unison-overlap delta allowance from 328 to 329 while preserving the existing shared-rhythm, leap-recovery, bass-root-support, and counter-subject retention expectations. This is accepted because the concrete score-window symptom is eliminated and the changed unison count remains a review signal rather than a hard constraint failure.

## Verification

* `pnpm lint`
* `pnpm build`
* `node --test packages/core/dist/generate-phase13x2-bass-answer-tail-review.test.js packages/core/dist/generate-phase13x-first-bass-entry-contract.test.js packages/core/dist/generate-phase13x-first-bass-entry-review-a.test.js packages/core/dist/public-contract.integration.test.js packages/performance/dist/index.test.js packages/web/dist/score.test.js packages/web/dist/piano-roll.test.js`
* `pnpm fugematon review --out samples/phase-13x2-completion-review --ticks 129600`
* `pnpm fugematon review --out samples/phase-13x2-completion-review-strict --ticks 129600 --performance-profile strict-counterpoint`

Human listening remains incomplete. The completion judgement is based on generated score windows, diagnostics, MIDI bundle availability for both profiles, and agent-side music-theory review.
