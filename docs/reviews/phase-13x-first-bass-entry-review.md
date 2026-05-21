# Phase 13X First Bass Entry Review

This review responds to the user-reported symptom that the first bass entry still makes the other three parts sound as if they stop.

Reviewed seed set: the standard 22 seed review set: `bach-001`, `fugue-smoke`, `minor-entry`, `wide-key`, `lyrical-line`, `modal-dorian`, `circle-fifths`, `close-imitation`, `sparse-cadence`, `bright-answer`, `dark-episode`, `ornament-test`, `long-arc`, `contrary-motion`, `restless-line`, `tight-stretto`, `quiet-cadence`, `angular-answer`, `modal-answer`, `modal-cadence`, `contrary-answer`, and `dense-modal`.

Generated evidence: `samples/phase-13x-bass-entry-review` with 129600 ticks per seed, plus direct ScoreEvent inspection of exposition and post-exposition bass-entry windows.

Source family basis: Fux/species counterpoint for line independence, preparation, suspension, oblique motion, and dissonance treatment; common-practice fugue for exposition pacing, answer entry rhetoric, counter-subject continuity, and texture continuity. Specific editions were not rechecked in this pass, so the theory basis remains source-family level.

## Findings

### 1. The reported first bass-entry problem is real

All 22 seeds place the exposition bass answer at quarter 12. At that exact tick, soprano, alto, and tenor all end their previous notes and start new support notes. No outside voice is carried across the bass entry. Some seeds add delayed notes within the following half beat, but that does not preserve line continuity because the three outside parts have already been cut and re-attacked together.

Representative windows:

| Seed | Entry | Outside voice behavior |
| --- | --- | --- |
| `bach-001` | exposition bass answer at quarter 12 | soprano, alto, and tenor all end and restart at the bass entry tick. |
| `fugue-smoke` | exposition bass answer at quarter 12 | all three outside voices re-articulate as a block. |
| `minor-entry` | exposition bass answer at quarter 12 | all three outside voices re-articulate as a block. |
| `modal-dorian` | exposition bass answer at quarter 12 | all three outside voices re-articulate as a block. |
| `dense-modal` | exposition bass answer at quarter 12 | all three outside voices re-articulate as a block. |

Musical judgement: this is not a convincing fugal exposition texture. A bass answer can be emphatic, but the upper voices should normally preserve at least one independent line through suspension, prepared resolution, oblique support, staggered continuation, or a clearly cadential reason for collective articulation. Here the three upper parts act as a single accompaniment pad that resets on the bass entrance. It weakens counterpoint, makes the bass entry feel mechanically inserted, and undermines the sense that the answer enters an already living contrapuntal fabric.

Current diagnostics coverage: inadequate before this PR. Phase 13W inspected only post-exposition bass entries by filtering out `state === "exposition"`, so its completion evidence did not cover the user-visible first bass entry.

Project response: Phase 13X must precede Phase 13Y. The first bass-entry window is now exposed in `entryBoundaryContinuity` as separate evidence, but generation still needs a repair. Phase 13Y then generalizes the entry-continuity model beyond bass-specific windows before Phase 8 resumes.

### 2. Phase 13W improved a narrower problem than its docs implied

Phase 13W correctly targeted post-exposition bass subject or answer boundaries. It did not fix the exposition bass answer. The Phase 13W completion claim should therefore be read as "post-exposition entry-boundary reset removed," not "all bass-entry reset symptoms removed."

Post-exposition review still deserves caution. The current 22 seed inspection shows 18 of 22 first post-exposition bass-entry windows have only two outside voices active at the bass attack, and 21 of 22 have no outside voice carried through the attack. Delayed outside support is present, so this is not the exact Phase 13W three-voice synchronized reset. Musically, though, it can still sound like a thin restart when delay is used as a metric escape rather than as prepared counterpoint.

Project response: keep the Phase 13W repair, but demote its completion evidence from a Phase 8 unblocker to a narrower baseline. Phase 13X should judge both the initial exposition bass answer and the later bass returns by score-window continuity, not by the absence of one old classifier. Phase 13Y should then make that judgement entry-role and entry-order aware.

### 3. The metric was truthful but scoped to the wrong question

The old `entryBoundaryContinuity.synchronizedResetCount` could report zero while the first bass entry still failed, because the relevant exposition window was excluded. This is not a case where a noisy score should be ignored in favor of listening taste. The ScoreEvent evidence and the heard symptom point to the same structural flaw.

Metric assessment:

* `entryBoundaryContinuity.synchronizedResetCount` expressed the Phase 13W post-exposition target, but not the user's first-entry complaint.
* Aggregate quality-vector readiness does not prove exposition craft, because it can miss a single structurally important entrance.
* A useful metric here must point back to a readable score window: entry state, form, tick, outside onsets, outside voices ending at the entry, carried voices, delayed voices, and whether the delay has contrapuntal function.

Project response: use metrics only as evidence locators. Adoption remains blocked until generated score windows show musically convincing first bass-entry counterpoint.

### 4. Structural hypothesis

Symptom: the first bass answer sounds as if the other three parts stop or reset.

Repeated pattern: every reviewed seed uses the same exposition bass answer timing at quarter 12 and gives all three outside voices a same-tick support restart.

Theory basis: a fugal exposition should distinguish the answering voice from the countersubject and free counterpoint while preserving continuity of the already-entered voices. Collective upper-voice reset is only convincing when prepared as a cadence, tutti gesture, or formal arrival; the generated windows do not show that preparation.

Evidence strength: confirmed across 22 seeds by ScoreEvent inspection and review bundle generation. Human listening remains a gap, but the score-level evidence is strong enough to block Phase 8.

Project response: generator change, scoring change, and diagnostic truthfulness change. Do not solve this in MIDI articulation, WebAudio envelopes, or visualizer boundary design. Do not let the bass-specific repair become the durable music-model boundary; Phase 13Y generalizes the rule after the confirmed blocker is fixed.

## Phase 13X Plan

Phase 13X is inserted after Phase 13W and before Phase 13Y. Phase 13Y is inserted before Phase 8 to generalize entry-boundary continuity beyond bass-specific windows.

Completion conditions:

* The first exposition bass answer no longer has soprano, alto, and tenor all ending and restarting at the same tick across the 22 seed review bundle.
* At least one outside voice carries, suspends, resolves, or delays as prepared counterpoint across the first bass answer in representative, modal, rotation, and adversarial seeds.
* The counter-subject remains recognizable when the bass answer enters; continuity support must not erase answer rhetoric.
* Post-exposition bass returns are reviewed for musical preparation, not only for `synchronized-reset` absence.
* `entryBoundaryContinuity` exposes first-bass-entry evidence, outside voices ending at the entry, and post-exposition evidence separately.
* Focused `organ-default` and `strict-counterpoint` listening notes compare score windows, not only aggregate diagnostics.

Implementation order:

1. Add exposition-aware first-bass-entry diagnostics and tests that keep the current blocker observable.
2. Make exposition support generation previous-note-aware before the bass answer enters.
3. Add continuation candidates for held upper voice, prepared suspension, staggered counter-subject continuation, and cadentially justified tutti.
4. Score first-bass-entry support by line continuity, counter-subject identity, dissonance preparation, and answer clarity.
5. Regenerate the 22 seed bundle and record score-window examples before handing off to Phase 13Y.

## Open Gaps

No human listening pass was completed in this review. The generated MIDI files are available in the review sample directory for focused listening, but the planning decision does not depend on completed listening because the score-level same-tick reset is deterministic across all reviewed seeds. Non-bass entry-window review and alternate entry-order stress cases remain Phase 13Y work.
