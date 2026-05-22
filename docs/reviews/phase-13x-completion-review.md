# Phase 13X Completion Review

This review records the Phase 13X repair for the first exposition bass answer. It uses the standard 22 seed review set and a regenerated review bundle at `samples/phase-13x-completion-review`.

Source family basis: Fux/species counterpoint for line independence, preparation, suspension, and oblique motion; common-practice fugue for exposition pacing, answer entry rhetoric, and counter-subject continuity. Specific editions were not rechecked in this pass, so the theory basis remains source-family level.

## Findings

### 1. First bass answer reset is repaired

Across all 22 review seeds, `firstBassEntrySynchronizedReset` is now 0. The first bass answer remains at quarter 12, but the outside voices no longer all end and restart together. Representative windows:

| Seed | Outside voice behavior at first bass answer |
| --- | --- |
| `bach-001` | soprano carries across the bass answer; alto and tenor rearticulate. |
| `fugue-smoke` | soprano carries across the bass answer; alto and tenor rearticulate. |
| `modal-dorian` | soprano carries across the bass answer; alto and tenor rearticulate. |
| `contrary-answer` | soprano carries across the bass answer; alto and tenor rearticulate. |
| `dense-modal` | soprano carries across the bass answer; alto and tenor rearticulate. |

Musical judgement: the bass answer now enters into an active upper-voice fabric instead of triggering a block reset. This is a modest counterpoint repair, not a full exposition rewrite: two outside voices can still articulate with the bass, but at least one already-entered line preserves continuity through oblique support or a prepared stagger.

### 2. Post-exposition bass windows are separately clean

The expanded `entryBoundaryContinuity` evidence keeps first-bass and post-exposition bass windows separate. In the regenerated 22 seed evidence, post-exposition bass windows report 166 continuity-supported windows and 0 synchronized resets.

This matters because Phase 13W and Phase 13X answer different questions. Phase 13W fixed the post-exposition symptom first; Phase 13X fixed the exposition first-bass-answer symptom and kept the post-exposition evidence visible so the first-bass repair could not hide a regression.

### 3. Counter-subject and legacy metric tradeoffs remain review signals

The repair delays or carries outside support instead of preserving old exact expected values. The main accepted tradeoff is small movement in shared-rhythm and adjacent guardrail expectations. The review-set shared-rhythm ceiling moves from 906 to 909, `close-imitation` shared-rhythm boundary evidence moves from 814 to 817, and Phase 13S sixth-batch counter-subject identity retention moves from 2.05 to 2.03.

These are accepted as metric baseline updates because the musical target improves: the central exposition bass answer no longer has a three-voice reset, and the post-exposition windows remain continuity-supported. The affected metrics describe local coupling pressure that Phase 13Y, Phase 13Z, and Phase 14 should continue to watch; they are not hard failures that outweigh the score-window repair.

### 4. Focused profile notes

`organ-default` should make the repair audible as the absence of a single three-part upper-voice attack at the bass answer. `strict-counterpoint` should expose the remaining limitation more clearly: the carried upper line helps continuity, but two outside voices may still articulate with the bass, so Phase 13Y should generalize prepared collective articulation rather than treating one carried line as enough for every entry.

No separate human listening pass was completed. The review relies on ScoreEvent windows, diagnostics, and profile-aware listening notes derived from the generated MIDI/review bundle.

## Handoff

Phase 13X is complete. Phase 13Y should generalize entry-boundary continuity beyond bass-specific first/post-exposition windows using entry voice, entry order, already-entered voices, carried support, suspension/resolution, delayed support, and prepared collective articulation.
