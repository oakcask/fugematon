# Phase 13X2: Bass Answer Tail Texture Repair

Phase 13X2 is inserted after Phase 13X and before Phase 13Y. Its purpose is to fix the user-reported bass-answer symptom as post-bass-answer texture thinning, not only as an entry-boundary synchronized reset.

Status: complete. Phase 13Y may proceed with generalized entry-continuity work while preserving the new bass-answer-tail texture evidence and role-visible review output.

Planning review: [Phase 13X2 bass answer texture review](../reviews/phase-13x2-bass-answer-texture-review.md).
Completion review: [Phase 13X2 completion review](../reviews/phase-13x2-completion-review.md).
Follow-up generalization: [Phase 13Y](phase-13y.md).

## Rationale

Phase 13X correctly repaired the first-bass-answer boundary reset: at the bass answer tick, the three outside voices no longer all end and restart together. A follow-up score-window review shows that this was probably too narrow an interpretation of the listening report.

The likely user-visible symptom is later in the same musical area:

* the first bass answer ends around quarter 19;
* the following continuation or episode often thins to one upper voice, then sometimes to bass-only free counterpoint;
* this can sound like the other parts stop after the bass answer, even though `allVoiceSilenceGapCount` remains 0.

This is a score-level texture and phrase-continuity problem. It should be fixed in generator and scoring behavior, not in playback smoothing or by reclassifying the old entry-boundary metric.

The review also shows a feedback-observability problem: the piano roll does not make subject, answer, counter-subject, and free-counterpoint roles easy enough to identify. That makes human reports harder to localize and made it easier to interpret "bass answer makes the other parts stop" as an entry-tick issue instead of a post-answer tail issue.

## Scope

* Add focused diagnostics for the first bass answer tail and the following continuation window.
* Detect bass-only free-counterpoint tails, outside-voice dropout after bass answer, and one-outside-voice texture that is not prepared by cadence, entry preparation, or phrase design.
* Adjust continuation and episode texture candidates so at least one upper line remains active through the post-bass-answer tail unless a clear cadence or prepared thinning explains the gap.
* Score first continuation candidates against abrupt thinning, bass-only filler, and unsupported solo texture after structurally important bass answers.
* Add review UI or piano-roll inspection support that distinguishes `subject`, `answer`, `counter-subject`, and `free-counterpoint` roles in the visible notes.
* Record focused `organ-default` and `strict-counterpoint` notes for the repaired tail windows, not only the bass-entry tick.

## Out Of Scope

* Replacing Phase 13X. The entry-boundary reset repair remains valid and must stay intact.
* Generalizing every entry-boundary rule beyond bass entries. Phase 13Y handles the entry-role and entry-order generalization after this corrected user symptom is repaired.
* Treating all thin texture as a failure. Cadential thinning, entry preparation, pedal points, and deliberately exposed solo lines remain allowed when the score window explains them.
* Building the full Phase 8 visualizer. The role visibility work here is review observability for locating musical feedback, not the complete infinite-playback visual design.
* Masking the symptom with MIDI articulation, WebAudio envelopes, or piano-roll styling alone.

## Completion Conditions

* The 22 seed review set has no first-bass-answer follow-up window where soprano, alto, and tenor are all inactive while bass alone continues as free counterpoint, unless the review records a clear cadential or formal explanation.
* Representative, boundary, modal, rotation, and adversarial seeds keep at least one upper line active or prepared across the first bass answer tail and into the next continuation phrase.
* `soloTexture`, `phase11Review.functionalThinning`, or a new focused summary exposes bass-answer-tail thinning separately from entry-boundary reset.
* The existing Phase 13X evidence remains true: first-bass-entry synchronized reset stays 0, and post-exposition bass-entry synchronized reset stays 0.
* Piano-roll or review-window output makes note roles visible enough that a listener can name whether a reported spot is subject, answer, counter-subject, or free counterpoint.
* Focused listening notes compare the old likely symptom window and the repaired score windows.

## Implementation Order

1. Add a focused first-bass-answer-tail diagnostic and tests for the affected seeds from the planning review.
2. Add review/piano-roll role visibility for note roles, starting with subject, answer, counter-subject, and free-counterpoint.
3. Change continuation or episode texture candidate generation so post-bass-answer tails do not collapse to bass-only free counterpoint without preparation.
4. Update scoring so candidates that preserve upper-line agency after the bass answer beat candidates that merely avoid full silence.
5. Re-run the 22 seed review set and record score-window examples before Phase 13Y resumes.

## Phase 13Y Handoff

Phase 13Y may start. The Phase 13X2 completion baseline has no reviewed first-bass-answer tail with zero outside voices or bass-only free counterpoint, and Phase 13X first/post bass-entry synchronized reset evidence remains at 0.

Phase 13Y should generalize entry continuity without losing the new `bassAnswerTailTexture` evidence, the remaining one-outside tail review signal, or the piano-roll role visibility needed for future feedback.
