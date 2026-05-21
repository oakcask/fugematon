# Phase 13W: Entry-Boundary Continuity Repair

Phase 13W is inserted after Phase 13V and before Phase 8. Its purpose is to fix the audible reset at bass entries where the three outside voices restart together instead of carrying independent continuity into the entry.

Status: complete. Phase 8 may resume using the entry-boundary review signals added here.

Starting review: [Phase 13W entry-boundary review](../reviews/phase-13w-entry-boundary-review.md).
Completion review: [Phase 13W completion review](../reviews/phase-13w-completion-review.md).

## Rationale

Phase 13V improved entry rhetoric, line-agency scoring, and counter-subject survivability, but it did not model continuity across entry boundaries. A focused 22 seed inspection showed that the first bass entry window has all three outside voices starting a new support note at the same tick. The texture is therefore not silent in event data, but it sounds like a stop because all non-bass voices re-articulate together when the bass enters.

The source is structural:

* continuation candidates build entry support from the section start without using the previous section's active notes as generation input;
* `addCounterpointTexture` starts the counter-subject and all free-counterpoint support at `entry.startTick`;
* candidate evaluation can compare against `previousNotes`, but the candidate generator cannot create held, delayed, prepared, or tied-over outside voices;
* MIDI export and WebAudio playback render same-tick note boundaries as fresh attacks, so synchronized outside-voice onsets become audible.

## Scope

### 1. Entry-boundary continuity diagnostic

Add focused evidence for entry windows:

* count non-entering voices whose note starts exactly at an entry tick;
* distinguish synchronized reset from legitimate counter-subject onset, cadence arrival, stretto compression, or prepared suspension;
* report the affected seed, section state, entry voice, entry form, tick, and outside-voice onset pattern;
* expose bundle-level summaries so the issue cannot hide behind line-agency or formula-novelty aggregate improvements.

### 2. Previous-note-aware entry support

Make entry support generation aware of the immediately preceding texture:

* pass relevant previous notes or a boundary context into continuation candidate construction;
* allow one or two outside voices to hold through, delay by half a beat, or resolve into the bass entry instead of all restarting;
* keep the counter-subject recognizable when it is the musically necessary onset;
* preserve hard constraints, subject identity, answer plan, range, voice crossing, and unresolved dissonance.

### 3. Candidate and review model update

Score the audible boundary, not only the entry sonority:

* penalize unprepared three-outside-voice synchronized onset at bass subject or bass answer entries;
* separate acceptable rhetorical tutti entry from a mechanical section reset;
* compare the repair against Phase 13V line-agency, entry-formula novelty, counter-subject survivability, and long-window development evidence;
* keep any metric regression tied to a concrete score-window symptom.

### 4. Rendering sanity check

Do not fix the composition problem by masking it in playback:

* MIDI and WebAudio may keep normal articulation semantics;
* performance profile changes are not an acceptable substitute for score continuity;
* playback review should confirm whether the score-level fix reduces the perceived stop in `organ-default` and `strict-counterpoint`.

## Review Seeds

Use the 22 seed review set from Phase 13V as the minimum bundle. Focused windows should include:

* representative controls: `bach-001`, `fugue-smoke`, `minor-entry`, `wide-key`;
* early bass-return risk: `bright-answer`, `circle-fifths`, `angular-answer`, `long-arc`;
* modal and dense risk: `modal-dorian`, `modal-answer`, `modal-cadence`, `dense-modal`;
* adversarial and long-run checks: `contrary-answer`, `restless-line`, `tight-stretto`, `sparse-cadence`.

## Adoption Criteria

Phase 13W is complete only when:

* the 22 seed bundle no longer has unprepared three-outside-voice synchronized onset at the first bass entry window;
* focused score-window review shows at least one outside voice carrying, delaying, resolving, or preparing across the bass entry in representative and risk seeds;
* counter-subject identity does not regress into generic support;
* Phase 13V review summaries remain visible and any regressions are explained as musical tradeoffs;
* `organ-default` and `strict-counterpoint` focused listening notes confirm that the bass entry no longer sounds like the other voices stopped;
* Phase 8 handoff explicitly states the remaining entry-boundary review signals, if any.

## Completion Evidence

Phase 13W is complete as of the completion review.

* `entryBoundaryContinuity` diagnostics report bass subject/answer entry windows, outside-voice onsets, delayed outside voices, carried voices, and synchronized-reset classification.
* The 22 seed review bundle has `unpreparedSynchronizedResetSeedCount: 0` and `continuitySupportedSeedCount: 22`.
* Focused windows for `bach-001`, `fugue-smoke`, `bright-answer`, `contrary-answer`, and `dense-modal` keep the bass entry while delaying at least one upper voice by half a beat, so the entry is no longer a three-outside-voice mechanical restart.
* `organ-default` and `strict-counterpoint` review bundles were generated for the same 22 seed length. The score-level onset pattern is the same in both profiles; playback articulation still uses normal note attacks, so the repair is in the score rather than hidden by rendering.
* Phase 13V review summaries remain visible through `qualityVector.phase13VReview`; any remaining line-agency, entry-formula, counter-subject, or long-window review signal remains Phase 8 input rather than a Phase 13W blocker.

## Phase 8 Handoff

Phase 8 should treat `entryBoundaryContinuity` as a segment-boundary review signal. Infinite playback and visualizer work may proceed, but segment design must not hide a future `synchronized-reset` finding behind playback smoothing or UI boundary effects.
