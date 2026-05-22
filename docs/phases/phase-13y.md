# Phase 13Y: Generalized Entry Continuity

Phase 13Y is inserted after Phase 13X2 and before Phase 13Z. Its purpose is to generalize the entry-boundary continuity model so it is not tied to the current `alto -> soprano -> tenor -> bass` exposition order or to bass entries only.

Status: complete. Phase 8 is still deferred until Phase 13Z records long-run phrase-development evidence and Phase 14 records score-led beauty evidence.

Planning review: [Phase 13Y entry-continuity generalization review](../reviews/phase-13y-entry-continuity-generalization.md).
Completion review: [Phase 13Y completion review](../reviews/phase-13y-completion-review.md).
Prerequisite correction: [Phase 13X2](phase-13x2.md).

## Rationale

Phase 13X should remain a narrow repair for the deterministic first-bass-answer blocker found in the current generator. That blocker is real, but it should not become a permanent music-model assumption that bass is the only voice requiring entry-boundary continuity.

Phase 13X2 completed first because the clarified user symptom points to post-bass-answer tail thinning and review observability, not only entry-boundary reset. Phase 13Y should preserve the new bass-answer-tail evidence while it generalizes entry continuity.

The durable problem is broader:

* an important subject or answer entry should enter a living contrapuntal fabric, not trigger a mechanical outside-voice reset;
* already-entered voices should normally preserve line agency through carry, suspension, prepared resolution, oblique support, or staggered continuation unless a cadence or tutti articulation is prepared;
* future exposition orders, stretto plans, or alternate entry rotations must be judged by entry role, entry order, and already-entered voice context rather than by the entering voice name alone.

## Scope

* Generalize `entryBoundaryContinuity` beyond first-bass and post-exposition bass windows.
* Add entry-continuity windows keyed by `entryVoice`, `entryOrderIndex`, `sectionState`, `entryForm`, and already-entered voices.
* Separate entry-local continuity from `soloTexture` and `functionalThinning`: thin texture remains a density/function issue, while synchronized boundary reset remains an entry-local line-agency issue.
* Add diagnostics for outside voices ending at the entry, carried voices, suspended or resolving voices, delayed voices, staggered continuation, and prepared collective articulation.
* Generalize support candidates and scoring so held, suspended, resolving, and staggered outside-voice support can be evaluated for any important entry.
* Review whether the current fixed exposition order can remain an implementation detail, or whether alternate entry orders need explicit candidate support before Phase 8.

## Out Of Scope

* Replacing Phase 13X. The first-bass-answer repair stays as the immediate blocker because it is confirmed across the current 22 seed review bundle.
* Treating all same-tick outside-voice onsets as failures. Prepared cadential or tutti articulation remains allowed when the score window explains it.
* Playback smoothing, envelope changes, visualizer boundary design, or UI controls as substitutes for score-level continuity.
* Full redesign of fugue exposition strategy unless the generalized review shows that fixed entry order itself is the blocker.

## Completion Conditions

* `entryBoundaryContinuity` exposes generalized windows for important subject and answer entries, not only bass-entry windows.
* Representative, boundary, rotation, modal, and adversarial seeds show that non-bass entries and alternate entry-order assumptions are reviewed for line continuity.
* The current first-bass-answer repair from Phase 13X remains intact.
* The Phase 13X2 bass-answer-tail thinning repair remains intact and visible as a separate review signal.
* Post-exposition entries remain reviewed for prepared delayed support, not only for absence of three-outside-voice synchronized reset.
* Diagnostics distinguish synchronized reset, prepared collective articulation, carried support, suspension/resolution, delayed support, and unsupported entry-local thinning.
* Focused `organ-default` and `strict-counterpoint` listening notes include at least one non-bass entry-continuity window and one repaired first-bass-answer window.

## Completion Evidence

Phase 13Y is complete as of the completion review.

* `entryBoundaryContinuity` schema version 3 records `entryVoice`, `entryOrderIndex`, `alreadyEnteredVoices`, carried support, suspension/resolution, delayed support, staggered continuation, prepared collective articulation, unsupported entry-local thinning, and classification for important subject and answer entries.
* The 22 seed review set reports 666 important entry windows, including 478 non-bass windows, with 0 synchronized resets and 0 unsupported entry-local thinning windows.
* The Phase 13X first-bass repair remains intact with 0 `firstBassEntrySynchronizedReset` seeds.
* The Phase 13X2 tail repair remains intact with 0 `bassAnswerTailTexture.reviewRequired` seeds.
* Focused profile notes in the completion review cover repaired first-bass-answer windows and non-bass entry windows.

## Implementation Order

1. Rename or supplement first-bass-specific diagnostic fields with generalized entry-continuity windows while preserving compatibility fields for existing review artifacts.
2. Derive `entryOrderIndex` and already-entered voice context for exposition and later important entries.
3. Add non-bass entry-window tests that fail when all already-entered outside voices cut and restart without preparation.
4. Generalize continuity-preserving support candidates and scoring beyond bass entries.
5. Re-run the 22 seed review bundle and record score-window examples for first-bass, non-bass exposition, and post-exposition entries.
6. Update Phase 13Z handoff only after the generalized model shows that future entry-order changes will not hide the same boundary-reset symptom under another voice name, and after the Phase 13X2 tail-thinning evidence remains clean.

## Phase 13Z Handoff

Phase 13Z may start only after Phase 13Y records generalized entry-continuity evidence. Phase 13Z must preserve entry-continuity diagnostics as review signals while it repairs long-run phrase convergence. Infinite playback and visualizer work remain deferred until Phase 13Z also records phrase-development evidence.
