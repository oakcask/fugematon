# Stretto Entry Harmony Repair

Status: planned quality blocker before Infinite playback MVP.

This plan responds to a user-reported harmony failure in `seed-1db5j19-1nhjtae` measures 7-8. The follow-up scan found the same structural issue across the focused seed set: post-exposition `stretto-like` and entry windows often stack subject or answer tones against fixed counter-subject/free-counterpoint support, producing exposed adjacent seconds or semitones that the score window cannot explain.

Planning review:

* [Stretto entry harmony repair plan](../reviews/stretto-entry-harmony-repair-plan.md): focused ScoreEvent evidence, cross-seed scan, structural hypothesis, repair workstreams, verification seed set, and CI / review scope.

## Scope

* Treat the reported seed as regression evidence, not as the repair boundary.
* Add focused review evidence for first-stretto and important-entry sonority windows.
* Strengthen candidate selection against unresolved accented entry clashes and unexplained harmonic-sonority child windows.
* Make `stretto-like` support construction aware of entry role, beat strength, harmonic anchor, adjacent-second or semitone friction, and resolution deadline.
* Preserve real stretto tension when it is prepared, passing, neighboring, suspended, cadential, or otherwise function-bearing.
* Avoid fixes that depend on a literal seed, key, measure, pitch name, chord name, voice, or current ordering artifact.

## Out Of Scope

* UI, playback, WebAudio profile, visualizer, or segment-boundary changes that hide score-level harmony defects.
* Treating all close intervals in stretto as failures.
* Retagging subject or counter-subject notes as harmonic support only to satisfy diagnostics.
* Promoting aggregate beauty-sensitive metrics to PR CI blockers without score-window context.

## Workstreams

### 1. Focused Evidence Harness

Add a review helper or focused test surface that reports first-stretto and important-entry harmony evidence by seed, section state, entry role, tick, voices, interval class, classification, and response. It should include representative vertical sonorities without depending on literal bar numbers or pitch names.

### 2. Candidate Scoring

Add local selection pressure for unresolved accented entry clashes, unresolved severe entry intervals, and child harmonic-sonority review windows. The score should prefer candidates that reduce entry-local defects while preserving counter-subject identity, line agency, and phrase-development evidence.

### 3. Stretto Support Generation

Change support construction so fixed counter-subject and free-counterpoint degree patterns do not blindly collide with strong subject or answer tones. Prefer nearby chord tones, carried support, prepared suspensions, staggered continuation, contrary or oblique support, or a visible review-required window when the generator has no explainable alternative.

### 4. Cross-Seed Review

Review the reported seed, high-risk subject-family seeds, representative controls, lower-risk controls, modal controls, and thin-support controls. The minimum set is listed in the planning review.

### 5. Listening Evidence

Record focused `organ-default` and `strict-counterpoint` listening notes before using the repair as Infinite playback handoff evidence.

## Completion Conditions

* `seed-1db5j19-1nhjtae` measures 7-8 no longer have unresolved accented entry clash or unexplained harmonic-sonority child-window failures.
* High-risk seeds such as `long-arc`, `dark-episode`, `ornament-test`, and `bach-001` improve their first-stretto entry-harmony windows without hard-constraint regressions.
* The repair does not trade entry clashes for pitch-class unison stacks, lockstep, or long thin support.
* Counter-subject survivability, line agency, and phrase-development review surfaces stay truthful.
* Lower-risk controls retain explainable stretto tension.
* Focused listening gaps are recorded before Phase 8 handoff.

## Handoff

Infinite playback MVP must not resume as if this is only a rendering or segment-boundary problem. Segment semantics, playback smoothing, and UI presentation should not hide unresolved stretto entry harmony, unrooted support, or review-required accented entry clashes.
