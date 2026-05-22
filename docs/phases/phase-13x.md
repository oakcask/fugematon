# Phase 13X: First Bass Entry Continuity Repair

Phase 13X is inserted after Phase 13W and before Phase 13Y. Its purpose is to fix the exposition bass answer where soprano, alto, and tenor all reset at the same tick as the first bass entry.

Status: complete for the entry-boundary reset target. Phase 13X2 is now the current follow-up because the user-reported bass-answer symptom is likely post-bass-answer free-counterpoint tail thinning rather than only same-tick entry reset. Phase 8 remains deferred until Phase 13X2 records bass-answer-tail repair evidence, Phase 13Y records generalized entry-continuity evidence, Phase 13Z records long-run phrase-development evidence, and Phase 14 records score-led beauty evidence.

Starting review: [Phase 13X first bass entry review](../reviews/phase-13x-first-bass-entry-review.md).
Completion review: [Phase 13X completion review](../reviews/phase-13x-completion-review.md).
Follow-up generalization: [Phase 13Y](phase-13y.md).
Symptom reinterpretation follow-up: [Phase 13X2](phase-13x2.md).

## Rationale

The Phase 13W repair was scoped to post-exposition bass entries. A new 22 seed review shows that every seed still has the exposition bass answer at quarter 12 with all three outside voices ending and restarting together. This makes the first bass entry sound like a mechanical texture reset rather than an answer entering a living contrapuntal fabric.

The problem is musical, not only diagnostic:

* a fugal exposition should preserve line continuity in already-entered voices unless a cadence or tutti gesture prepares a collective articulation;
* the generated windows do not carry, suspend, resolve, or stagger any outside voice through the first bass answer;
* aggregate quality metrics can look ready while a structurally central score window remains unconvincing.

Phase 13X is intentionally narrow. It repairs the confirmed blocker in the current fixed exposition order. Phase 13Y generalizes the same entry-continuity rule so future entry orders or non-bass entries cannot hide the same synchronized reset under another voice name.

## Scope

* First exposition bass-answer continuity diagnostics.
* Previous-note-aware exposition support before and across the bass answer.
* Held, suspended, resolving, staggered, or cadentially justified outside-voice support candidates.
* Scoring that balances bass answer clarity, counter-subject identity, dissonance preparation, and independent line agency.
* Focused review of post-exposition bass returns so delayed support is judged as counterpoint, not only as a classifier escape.

## Out Of Scope

* Playback smoothing, MIDI articulation masking, or WebAudio envelope changes as substitutes for score continuity.
* Visualizer or segment-boundary design that hides the first bass-entry reset.
* Generalizing entry-boundary continuity to every important entry or alternate exposition order. Phase 13Y handles that after this confirmed first-bass-answer repair.
* Treating legacy guardrail margins or existing expected values as adoption blockers when generated score windows improve musically.
* Branching, Worker fallback, and Phase 8 operational UI work.

## Completion Conditions

* The 22 seed review bundle no longer has soprano, alto, and tenor all ending and restarting at the exposition bass-answer tick.
* Representative, boundary, rotation, modal, and adversarial seeds show at least one outside voice carrying, suspending, resolving, or entering as a prepared stagger across the first bass answer.
* Counter-subject identity remains audible and visible in score-window evidence.
* Post-exposition bass entries are reviewed for preparation and line continuity, not only for absence of three-outside-voice synchronized onset.
* `entryBoundaryContinuity` exposes first-bass-entry evidence, outside voices ending at the entry, and post-exposition bass-entry evidence separately.
* `organ-default` and `strict-counterpoint` focused listening notes compare the repaired score windows and record any remaining listening fatigue.

## Implementation Order

1. Add exposition-aware first-bass-entry diagnostics and tests that keep the current blocker visible.
2. Thread previous-note boundary context into exposition support generation before the bass answer.
3. Add continuity-preserving support candidates for held voices, prepared suspensions, staggered counter-subject continuation, and cadentially justified tutti.
4. Update candidate scoring to prefer musically prepared continuity over same-tick support reset.
5. Regenerate the 22 seed review bundle and document score-window examples before Phase 13Y generalization starts.

## Phase 8 Handoff

Phase 8 must not resume from Phase 13W or Phase 13X alone. Phase 13X should hand off a repaired first-bass-answer baseline to Phase 13Y, which must generalize the entry-continuity model beyond bass-specific windows before infinite playback resumes.

## Completion Record

Phase 13X is complete as of the completion review.

The repair keeps the exposition bass answer at quarter 12, but no reviewed seed now has soprano, alto, and tenor all ending and restarting at that tick. Across the 22 seed review set, `firstBassEntrySynchronizedReset` is 0 and post-exposition bass-entry `synchronizedResetCount` is also 0 across 166 reviewed windows. Representative, modal, rotation, and adversarial seeds carry or stagger an outside voice across the bass answer while keeping the bass answer readable.

Accepted tradeoff: previous-note-aware support slightly changes legacy metric baselines. The most direct musical cost is a small increase in shared-rhythm and related review ceilings around some review seeds, such as the close-imitation shared-rhythm boundary moving from 814 to 817 and the review-set maximum moving from 906 to 909. This is accepted because the score-window failure was a structural exposition reset, while the changed counts are localized review signals that remain within the hard readiness model and are documented for later Phase 13Y/13Z/14 review.

Phase 13Y must not treat this bass-specific repair as a general solution. It should use the Phase 13X evidence as a baseline, then generalize entry continuity by entry voice, entry order, already-entered voices, and prepared collective articulation.

Follow-up clarification: Phase 13X repaired a real entry-boundary defect, but later review shows the original listening report was probably pointing to first-bass-answer tail thinning. Phase 13X2 handles that corrected symptom before Phase 13Y generalizes entry continuity.
