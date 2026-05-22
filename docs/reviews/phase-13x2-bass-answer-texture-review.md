# Phase 13X2 Bass Answer Texture Review

This review records the reinterpretation of the user-reported symptom: "the remaining parts unnaturally rest at the bass answer" is likely not only the first-bass-entry boundary reset repaired by Phase 13X. The more likely audible problem is post-bass-answer texture thinning during the following free-counterpoint tail.

Reviewed seed set: the standard 22 seed review set used by Phase 13X.

Source family basis: Fux/species counterpoint for line independence and continuity; common-practice fugue for answer rhetoric, countersubject continuity, episode pacing, and texture continuity. Specific editions were not rechecked in this pass, so the theory basis remains source-family level.

## Findings

### 1. Phase 13X fixed the entry tick, but not the likely reported symptom

Phase 13X repaired the exact bass-entry boundary: all 22 reviewed seeds now keep the first bass answer at quarter 12 with no three-outside-voice synchronized reset.

However, a follow-up ScoreEvent inspection of the first bass answer tail shows a different problem after the bass answer ends around quarter 19. In the following continuation or episode, the texture frequently thins to one upper voice, and several seeds thin to bass-only free counterpoint.

Affected first-continuation evidence:

| Seed | Symptom |
| --- | --- |
| `wide-key` | bass-only free counterpoint around quarters 26-27 after an alto-only lead-in. |
| `modal-dorian` | bass-only free counterpoint around quarters 26-27 after an alto-only lead-in. |
| `contrary-motion` | bass-only free counterpoint around quarters 26-28 after the first bass answer tail. |
| `tight-stretto` | bass-only free counterpoint around quarters 26-27 after an alto-only lead-in. |
| `modal-cadence` | bass-only free counterpoint around quarters 26-28 after the first bass answer tail. |

Bundle-level observation: 5 of 22 seeds have bass-only free counterpoint in the first continuation after the first bass answer. 21 of 22 seeds thin to one or zero outside voices somewhere in that first continuation window. `sparse-cadence` is the only reviewed seed that keeps three outside voices throughout this focused window.

Musical judgement: this can plausibly sound like the other parts stop after the bass answer even when no total silence occurs. The issue is texture continuity and line agency after a structurally important bass answer, not just a same-tick entry reset.

Project response: insert Phase 13X2 before Phase 13Y. Keep the Phase 13X entry-boundary repair, but add a generator-side repair and diagnostic for post-bass-answer tail thinning.

### 2. Current diagnostics do not block the symptom clearly enough

The affected seeds report `allVoiceSilenceGapCount` as 0 because the score is not fully silent. Existing `soloTexture` and `phase11Review.functionalThinning` see thin texture, but they can classify the runs as supported by entry preparation, cadential preparation, or pedal-like behavior. That classification is too broad for the reported symptom because the local score window can still sound as if upper-line agency disappears.

Project response: add a focused bass-answer-tail review signal. It should distinguish:

* full silence from bass-only free counterpoint;
* prepared cadential thinning from unsupported post-answer thinning;
* one-outside-voice continuation from a convincing contrapuntal fabric;
* entry-boundary reset from post-entry phrase-tail dropout.

### 3. Piano-roll role visibility likely made the feedback harder to report

The current piano-roll view makes it difficult to tell which notes are subject, answer, counter-subject, or free counterpoint. That makes a listener's report naturally refer to the nearest recognizable event, such as "bass answer," even when the objection is in the free-counterpoint tail after the answer.

Project response: Phase 13X2 should include role visibility in review or piano-roll output before or alongside the generator repair. This is not a substitute for musical repair. It is observability needed so future human feedback can identify whether a symptom belongs to entry, counter-subject, free counterpoint, episode, or cadence.

## Structural Hypothesis

Symptom: after the first bass answer, the upper voices appear to stop or lose agency while bass continues free counterpoint.

Repeated pattern: the first continuation after the exposition commonly alternates between dense entry texture and very thin continuation texture. In the highest-risk seeds, the tail reaches bass-only free counterpoint for one to two quarters.

Theory basis: a fugue answer can be followed by an episode or thinning, but a sudden unprepared collapse from contrapuntal exposition texture into bass-only filler weakens the sense that the answer entered a living contrapuntal fabric. It is acceptable only when a cadence, formal arrival, pedal, or deliberately exposed solo line prepares the thinning.

Evidence strength: confirmed by ScoreEvent windows across the 22 seed review set. Human listening remains incomplete, but the score-level windows match the user's clarified symptom better than the Phase 13X boundary-reset interpretation.

Project response: generator change, scoring change, focused diagnostic, and role-visible review output.

## Phase 13X2 Plan

Phase 13X2 is inserted after Phase 13X and before Phase 13Y.

Completion conditions:

* No reviewed first-bass-answer tail collapses to unexplained bass-only free counterpoint.
* At least one upper voice remains active or is prepared to re-enter through the tail in representative, boundary, modal, rotation, and adversarial seeds.
* Current Phase 13X first-bass-entry synchronized reset evidence remains intact.
* Diagnostics expose the bass-answer-tail thinning window separately from `allVoiceSilenceGapCount` and entry-boundary reset.
* Piano-roll or review output shows note roles clearly enough to localize future feedback.
* Focused `organ-default` and `strict-counterpoint` notes review the repaired tail windows.

Open gaps: no separate human listening pass was completed for this review, and no implementation has yet verified the repaired output.
