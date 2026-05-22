# Phase 13W Completion Review

This review records the Phase 13W post-exposition entry-boundary continuity repair. Phase 13X supersedes the direct Phase 8 handoff because the exposition first bass answer was not part of this review scope, and Phase 13Y then generalizes entry continuity beyond bass-specific windows.

Reviewed seed set: the standard 22 seed review set from Phase 13V.

Source family basis: Fux/species counterpoint for independent line continuity, preparation, suspension, and oblique motion; common-practice fugue for bass-entry rhetoric and counter-subject continuity. Specific editions were not rechecked in this pass, so the theory basis remains source-family level.

## Findings

### 1. The unprepared bass-entry reset is removed

The new `entryBoundaryContinuity` diagnostic distinguishes a mechanical reset from a bass entry that has delayed or carried outside-voice support.

22 seed aggregate:

| Metric | Result |
| --- | --- |
| Review seeds | 22 |
| Unprepared synchronized reset seeds | 0 |
| Continuity-supported seeds | 22 |

Representative windows:

| Seed | Bass entry | Outside onset pattern |
| --- | --- | --- |
| `bach-001` | `stretto-like` subject at quarter 25 | Alto and tenor start at the entry; soprano and tenor provide delayed support. |
| `fugue-smoke` | `subject-return` subject at quarter 45 | Alto and tenor start at the entry; soprano enters after the attack. |
| `bright-answer` | `subject-return` subject at quarter 19 | Alto and tenor start at the entry; soprano and tenor are delayed. |
| `contrary-answer` | `subject-return` subject at quarter 43 | Alto and tenor start at the entry; soprano is delayed. |
| `dense-modal` | `stretto-like` subject at quarter 41 | Alto and tenor start at the entry; soprano and tenor are delayed. |

Theory basis: a bass entry may be emphatic, but at least one outside voice should imply line continuity through delay, preparation, or suspension unless a full tutti reset is musically prepared. The repaired windows no longer make all three outside voices attack as an unprepared block.

Project response: keep `entryBoundaryContinuity.synchronizedResetCount` visible as a Phase 13X, Phase 13X2, Phase 13Y, and Phase 8 review signal.

### 2. Counter-subject identity remains reviewable

The repair delays free support before delaying the counter-subject, so the counter-subject remains the preferred recognizable onset when it is needed for entry rhetoric. Phase 13V evidence remains exposed through `qualityVector.phase13VReview`; remaining counter-subject tradeoff windows are not hidden by the new diagnostic.

Project response: treat future counter-subject loss as a Phase 13V/Phase 13X/Phase 13Y/Phase 8 review issue, not as evidence that entry-boundary continuity should be disabled.

The accepted tradeoff is local: in one Phase 11/12 review batch, delayed support around the inspected post-exposition bass entry slightly lowers the accumulated bass-root-support margin and raises shared rhythm / leap-recovery review counts. The score-window symptom is not a new hard failure; it is the cost of breaking the unprepared outside-voice attack block while keeping the bass entry and counter-subject review evidence visible.

### 3. Playback profiles confirm a score-level repair

Review bundles were generated for `organ-default` and `strict-counterpoint`. Both profiles render the same repaired score windows; the outside-voice delay is present before playback scheduling, so the perceived boundary improvement is not a MIDI or WebAudio smoothing workaround.

Manual human listening is still a Phase 13X/Phase 13Y/Phase 8 follow-up. The agent-side focused review was sufficient for the post-exposition Phase 13W target, but it no longer unblocks Phase 8 because Phase 13X found an unreviewed exposition bass-answer reset and Phase 13Y must generalize the model beyond bass-specific windows.

## Hypothesis

Symptom: bass entries sounded like the other parts stopped because all three outside voices re-articulated exactly at the entry tick.

Repeated pattern: pre-repair score inspection found the same synchronized reset across the standard 22 seed set.

Theory basis: fugue texture should make important entries audible while preserving independent line agency through oblique, delayed, prepared, or suspended support.

Evidence strength: confirmed by score diagnostics across 22 seeds, with focused review bundles for `organ-default` and `strict-counterpoint`. Human listening remains pending.

Project response: Phase 13W remains complete for post-exposition bass entries. Phase 13X must complete the first-bass-entry repair, and Phase 13Y must generalize entry continuity, before Phase 8 resumes.
