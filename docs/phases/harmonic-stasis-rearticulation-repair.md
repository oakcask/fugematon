# Harmonic Stasis Rearticulation Repair

Harmonic stasis rearticulation repair is inserted after Episode motivic development and before Infinite playback MVP. Its purpose is to stop motivically labeled free counterpoint from falling into short same-pitch rearticulation when the local harmony is not creating audible tension, release, pedal, suspension, or cadence preparation.

Status: planned. This is a score-led quality blocker, not an operational playback task. It follows from the review that `seed-07mwf08-1te3e2o` uses subject / answer / counter-subject-derived rhythm after the first bass answer, but the generated free-counterpoint voices still settle into short same-pitch rearticulation over a weak harmonic arc. A later focused inspection of `seed-1db5j19-1nhjtae` adds a second path: final post-processing can add a functional support line whose pitches are harmonically safe but mechanically rearticulated.

Planning review:

* [Harmonic stasis rearticulation replan](../reviews/harmonic-stasis-rearticulation-replan.md): user-reported seed evidence, structural hypothesis, diagnostic gap, and CI / review scope.

## Rationale

Episode motivic development made subject-free material derivation-visible. That is necessary but not sufficient: a phrase can be correctly labeled as `answer-form`, `subject-head`, or `counter-subject-tail` and still sound static if the pitch choices do not participate in harmonic tension and release.

The specific failure is not repeated notes in general. Pedal tones, suspensions, cadence preparation, echo figures, and deliberate rhetorical repetition can be valid. The blocker is short same-pitch rearticulation inside free-counterpoint texture when the harmony is also static, thin, or mislabeled as structural support.

Theory basis: contrapuntal repetition is acceptable when it has voice-leading, harmonic, or rhetorical function. Rearticulating the same support pitch across weak harmonic motion can read as mechanical filler, especially after the exposition bass answer when all active voices turn into free counterpoint and the listener expects a directed transition into the first episode.

## Scope

* Add a diagnostic surface for same-voice short rearticulation in free-counterpoint spans, with the local harmonic context attached.
* Focus the first pass on first-bass-answer tail / first episode handoff and all-free texture windows, then verify that the predicate generalizes across later episodes.
* Distinguish accepted same-pitch behavior from defects:
  * accepted: pedal, suspension preparation / resolution, cadence preparation, subject / answer material, deliberate echo, or stable long support with another voice carrying motion;
  * review-required: short same-pitch rearticulation where harmonic function changes are weak or only nominal;
  * generator-response: short same-pitch rearticulation paired with `non-chord-structural-support`, thin unrooted support, or repeated root support that does not create tension / release.
* Run the diagnostic on the final post-processed score, not only on candidate sections, because support repair can introduce rearticulation after candidate selection.
* Add candidate scoring for harmonic-stasis rearticulation when the symptom is already present in selectable sections.
* Add a functional-support guard for post-processing paths that create short same-pitch support after selection.
* If scoring or support guards cannot find better pitches, generate melodic alternatives first: nearby chord tones, prepared neighbor tones, or passing tones that match the planned harmonic function. Use tie-like merging only as a local fallback, not as the primary repair.

## Out Of Scope

* Banning repeated notes globally.
* Turning every same-pitch rearticulation into a longer note.
* Hiding the symptom with playback envelope, articulation, instrument choice, piano-roll rendering, or segment boundary smoothing.
* Hard-coding the repair to `seed-07mwf08-1te3e2o`, `seed-1db5j19-1nhjtae`, a key, a meter, the bass or tenor voice, or the current measure numbers.

## Workstreams

### HSR-A: Diagnostic and score-window evidence

Add a review summary that can report same-voice immediate rearticulation in context. Each window should include seed, tick, section state, entry / handoff role, voice, role, pitch, durations, metrical intent, harmonic function, active voices, whether all active voices are free counterpoint, and the matching harmonic-sonority classification when present.

The diagnostic should be role-aware. It should treat subject / answer identity differently from free counterpoint, and it should not punish a held pedal or prepared suspension only because the pitch repeats. It should also record whether the window existed in the selected candidate or was introduced by final support repair.

### HSR-B: Functional-support rearticulation guard

Handle post-processing paths before broadening candidate costs. For functional support lines added by texture thinning, post-entry support, bass-answer tail support, and short harmonic-continuity repair:

* avoid short repeated attacks on the same pitch when the support line can use another chord tone without crossing, semitone friction, or pitch-class unison;
* prefer retaining harmonic support through a longer note when rearticulation is purely mechanical and another voice carries motion;
* preserve cadential, pedal, suspension, and echo contexts when the repeated pitch has a clear function;
* keep `cadential-tonic` as a harmonic function, not as a special-case repair trigger.

`seed-1db5j19-1nhjtae` is the focused evidence for this slice: the tenor G3 rearticulation in measure 7 is a final functional-support artifact, not a selected-candidate repeated-pitch run.

### HSR-C: Candidate scoring

Add a soft cost to candidate evaluation for review-required and generator-response rearticulation windows. Weight it higher for:

* first-bass-answer tail and the first episode handoff;
* all-free texture windows;
* duration of 1 quarter or less;
* repeated root-support labels without a harmonic-function change;
* windows already classified as non-chord structural support or thin unrooted support.

Keep the cost weaker or zero for subject / answer material, deliberate pedal, cadence preparation, and windows where another voice carries clear harmonic motion. Candidate scoring is not sufficient by itself for windows introduced after the selected section is evaluated.

### HSR-D: Generator response only where scoring and support guards are insufficient

If candidate scoring and support guards cannot reduce the windows without harming hard constraints, add generator alternatives in free-counterpoint texture:

* prefer a nearby chord tone when the note claims structural support;
* prefer prepared neighbor or passing motion when the note is weak / offbeat;
* prefer contrary or oblique motion against a repeated bass support;
* use a short tie-like merge only when alternate pitches would create a worse counterpoint or harmony defect.

The repair should preserve the Episode motivic development baseline: derivation metadata must still name the source motive and transformation, but the chosen pitch must also serve the local harmonic function.

### HSR-E: Review and handoff

Review at least the reported seed, fixed controls, modal / rotation controls, and one texture-tail control:

* `seed-07mwf08-1te3e2o`: reported representative for first-bass-answer handoff rearticulation with weak harmonic direction.
* `seed-1db5j19-1nhjtae`: reported representative for post-processing functional-support rearticulation in the tenor around measure 7.
* `fugue-smoke`: fixed control with known first-bass-answer and short-episode history.
* `modal-cadence`: modal rotation control where all-free windows can expose support stasis.
* `dark-episode`: episode texture control.
* `tight-stretto`: rotation control with dense handoff risk.

For each meaningful metric movement, record the concrete musical tradeoff: reduced rearticulation, changed harmonic-sonority windows, leap recovery, counter-subject identity, weak dissonance, and repeated-stock formula pressure.

## Completion Conditions

* The first reported seed exposes first-bass-answer handoff rearticulation as a score-window diagnostic, not only as a note-list observation.
* The second reported seed exposes post-processing functional-support rearticulation as final-score evidence, including whether the selected candidate already had the run.
* Focused seeds reduce generator-response rearticulation windows without new hard failures, voice crossings, subject identity violations, or answer-plan violations.
* The repair does not replace short rearticulation with widespread long-note stasis. Review windows must distinguish reduced reattack from lost line agency.
* `episodeMotivicDevelopment` remains derivation-visible, with `genericFreeCounterpointDurationTicks` at the repaired baseline for the focused set.
* Harmonic-sonority and harmonic-continuity diagnostics do not hide the affected windows. If they classify a window as accepted while rearticulation remains audible, record the diagnostic gap.
* Remaining same-pitch behavior is classified as accepted context, review-required, or generator-response rather than hidden by Infinite playback MVP semantics.

## Phase 8 Handoff

Infinite playback MVP may resume only after the first-bass-answer handoff and all-free texture windows do not hide mechanical same-pitch rearticulation behind motivic derivation labels. Segment snapshots, playback smoothing, and rendering profiles must preserve the diagnostic evidence for harmonic stasis, not mask it.
