# Phase 13Z: Long-Run Phrase Development Repair

Phase 13Z is inserted after Phase 13Y and before Phase 14. Its purpose is to repair the long-run phrase convergence that remains after initial subject diversity improved: later continuation sections can still sound like repeated phrases because subject returns, stretto-like entries, and episode fragments reuse a small set of subject-stem families.

Status: planned. Phase 8 is deferred until Phase 13Z records score-window, diagnostics, and focused listening evidence for long-run phrase development, then Phase 14 records score-led beauty evidence that current metrics actually explain the accepted score windows.

Planning review: [Phase 13Z long-run phrase review](../reviews/phase-13z-long-run-phrase-review.md).

## Rationale

The reported symptom is not the old cross-seed initial-subject collapse. `seed-0zereox-1v729ih` starts from a more distinctive subject, but later sections repeatedly return to the same subject stem and shortened stretto stem. A focused seed sweep shows the same risk across representative, boundary, rotation, modal, and adversarial seeds.

Fugue material should recur recognizably, but recurrence needs a changed role: new voice assignment, contour transformation, answer treatment, harmonic target, cadence preparation, density arc, stretto pressure, or contrapuntal tension. A long-running generator cannot rely on section labels alone if the audible subject family keeps returning unchanged.

## Scope

* Add long-run phrase-development diagnostics that localize subject-stem, stretto-stem, subject-fragment, phrase-function, and entry-voice recurrence over continuation windows.
* Make subject-return and stretto-like sections eligible for guarded stem variation, not only episodes.
* Add history-aware selection penalties or novelty budgets for repeated subject stems, repeated stretto voice pairs, repeated phrase functions, and repeated fragment derivations.
* Revisit the section-local planner scoring so solo-texture repair does not accidentally reward thin or fatiguing continuations.
* Preserve subject identity, answer-plan validity, entry harmony, voice crossing, range, leap recovery, counter-subject survivability, entry-boundary continuity, and Phase 13V-13Y review evidence.
* Re-review representative, boundary, rotation, modal, adversarial, and user-reported seeds at a length long enough to expose late continuation behavior.

## Out Of Scope

* Reopening initial subject-family diversity as the primary problem unless new evidence shows it regressed.
* Replacing Phase 13X or Phase 13Y entry-continuity work. Entry-boundary continuity remains a prerequisite baseline.
* Hiding repeated phrases through UI boundaries, playback profiles, segment breaks, Worker fallback, or visualizer treatment.
* Forcing zero repetition. Function-bearing subject return, sequence, stretto compression, and cadence extension remain valid when their role and score window explain the recurrence.

## Completion Conditions

* `seed-0zereox-1v729ih` no longer shows late continuation dominated by one subject-stem family without functional contrast.
* A focused seed set including `bach-001`, `fugue-smoke`, `modal-cadence`, `dense-modal`, `angular-answer`, `modal-answer`, `minor-entry`, `sparse-cadence`, `random-listen-check`, and `seed-0zereox-1v729ih` is reviewed at long-run length.
* The 22 seed review set keeps hard constraint failures at 0 and preserves Phase 7B readiness.
* Subject-return, episode, and stretto-like recurrence is reported by function and score window, not only by aggregate top-family share.
* Diagnostics distinguish function-bearing recurrence from mechanical phrase reuse.
* Focused `organ-default` and `strict-counterpoint` listening notes include at least one repaired long-run phrase window and one control seed where recurrence is accepted as functional.
* Phase 8 handoff states which remaining phrase-recurrence review signals, if any, are acceptable during infinite playback.

## Implementation Order

1. Add focused diagnostics for continuation-window subject-stem and phrase-function recurrence, including section state, entry form, entry voice, cadence kind, fragment transform, sequence pattern, and local key.
2. Add failing or review-required tests for `seed-0zereox-1v729ih` and a small cross-seed set that currently exposes subject-stem concentration over long-run length.
3. Extend continuation candidate generation so subject-return and stretto-like sections have guarded stem, rhythm, voice-pair, and harmonic-target alternatives.
4. Add selection penalties or novelty budgets for repeated subject stems, repeated stretto pair formulas, and repeated phrase-function chains while preserving Phase 13V-13Y guardrails.
5. Correct or justify the section-local planner scoring around solo texture before accepting any long-run phrase improvement that increases thinning fatigue.
6. Re-run focused and 22 seed review evidence, then record accepted tradeoffs and focused listening notes in the completion review.

## Phase 14 Handoff

Phase 14 may start only after Phase 13Z records long-run phrase-development evidence. Phase 14 must preserve phrase-recurrence diagnostics as review signals while it checks whether entry continuity, line agency, counter-subject survivability, and phrase development are beautiful in the generated score. Phase 8 may resume only after Phase 14 records that score-led evidence.
