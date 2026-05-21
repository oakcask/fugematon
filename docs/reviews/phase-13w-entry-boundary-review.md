# Phase 13W Entry-Boundary Review

This review explains why Phase 13W is inserted after Phase 13V and before Phase 8.

Reviewed seed set: the standard 22 seed review set: `bach-001`, `fugue-smoke`, `minor-entry`, `wide-key`, `lyrical-line`, `modal-dorian`, `circle-fifths`, `close-imitation`, `sparse-cadence`, `bright-answer`, `dark-episode`, `ornament-test`, `long-arc`, `contrary-motion`, `restless-line`, `tight-stretto`, `quiet-cadence`, `angular-answer`, `modal-answer`, `modal-cadence`, `contrary-answer`, and `dense-modal`.

Source family basis: Fux/species counterpoint for independence of parts, preparation, suspension, and oblique motion; common-practice fugue for entry rhetoric, counter-subject continuity, and bass-entry support. Specific editions were not rechecked in this pass, so the theory basis remains source-family level.

## Findings

### 1. Bass entries are active but still sound like a stop

Event inspection shows that the first bass entry window is not literally silent. In the initial exposition bass answer, all 22 seeds have four active voices throughout the entry window. For the first bass `subject` return or bass answer fallback, the minimum number of outside active voices is at least two in the checked 22 seed set.

The audible problem is different: all three outside voices start a new note exactly at the bass entry tick. This happened in 22 of 22 checked seeds. Representative examples:

| Seed | Bass entry | Outside voice behavior |
| --- | --- | --- |
| `bach-001` | `stretto-like` subject at quarter 25 | soprano, alto, and tenor all start support at the bass entry tick. |
| `fugue-smoke` | `subject-return` subject at quarter 45 | all three outside voices restart at the bass entry tick. |
| `bright-answer` | `subject-return` subject at quarter 19 | the preceding upper-voice notes end at quarter 16, then all three outside voices restart with the bass entry. |
| `contrary-answer` | `subject-return` subject at quarter 43 | all three outside voices restart at the bass entry tick. |
| `dense-modal` | `stretto-like` subject at quarter 41 | all three outside voices restart at the bass entry tick after uneven preceding gaps. |

Theory basis: a bass entry can be rhetorically strong, but contrapuntal texture normally earns that emphasis through preparation, suspension, oblique support, stretto pressure, or cadence. A mechanical reset of all outside voices at the same tick weakens line continuity.

Current diagnostics coverage: incomplete. Existing line-agency and entry-formula summaries can expose lockstep or repeated sonorities, but they do not specifically detect an entry-boundary reset where outside voices all re-articulate together.

Project response: add an entry-boundary continuity diagnostic and make entry-support generation previous-note-aware.

### 2. The generator cannot currently create tied-over entry support

Continuation candidate generation builds a fresh section candidate, then evaluation compares it with previous notes. The generator can be judged against history, but it cannot use history to construct a continuity-preserving entry plan.

The relevant pattern is:

* subject-return candidates set support duration to the subject duration;
* `buildContinuationSection` places the entry and immediately calls `addCounterpointTexture`;
* `addCounterpointTexture` starts the counter-subject and free-counterpoint support at `entry.startTick`;
* previous section notes are passed to `evaluateCandidate`, not to entry-support generation.

This explains why the symptom repeats across seed families: it is a section-template behavior, not only a bad random choice.

Theory basis: a fugue entry should sound like a line entering an ongoing contrapuntal fabric unless a cadence, stretto arrival, or explicit tutti rhetoric justifies the restart.

Project response: add boundary context to continuation candidate generation and support at least three alternatives: held outside voice, delayed outside voice, and prepared/resolving support into the entry.

### 3. Rendering makes the composition flaw more audible

The playback layer treats same-tick note boundaries as fresh attacks. MIDI export writes note-off before note-on at the same tick, and WebAudio starts each scheduled note from zero gain with a short attack. This behavior is reasonable for rendering, but it makes the synchronized outside-voice reset obvious.

Project response: do not solve this by hiding attacks in the performance profile. The score should contain continuity where the music needs continuity. Playback review should only confirm that the score-level fix works in both normal and strict listening profiles.

## Hypothesis

Symptom: the first bass subject or bass answer window sounds as if the other three parts stop.

Repeated pattern: all 22 checked seeds place new outside-voice support onsets exactly at the bass entry tick.

Theory basis: independent contrapuntal lines need continuity, preparation, and oblique or contrary support around important entries; synchronized unprepared outside-voice restart reads as a mechanical texture reset.

Evidence strength: confirmed from ScoreEvent inspection across the standard 22 seed set. Human listening is still pending.

Project response: Phase 13W should change generator behavior and diagnostics before Phase 8 resumes.

## Implementation Order

1. Add a focused diagnostic for synchronized outside-voice entry onsets.
2. Thread previous-note boundary context into continuation candidate generation.
3. Add continuity-preserving entry-support candidates: held support, delayed support, and prepared/resolving support.
4. Add selection cost or guardrails that reject unprepared three-outside-voice reset when an alternative preserves hard constraints.
5. Review 22 seeds plus focused listening in `organ-default` and `strict-counterpoint`.
6. Update Phase 8 handoff only after the entry-boundary review passes.
