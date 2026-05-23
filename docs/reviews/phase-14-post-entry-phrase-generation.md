# Phase 14 Post-Entry And Free-Counterpoint Generation Review

This review records the Phase 14C0 / 14C1 generator response after the post-entry texture and free-counterpoint phrase review.

Reviewed seeds: `angular-answer`, `modal-dorian`, `random-listen-check`, and `seed-0zereox-1v729ih` for post-entry support and free-counterpoint phrase signatures; `contrary-motion`, `tight-stretto`, `circle-fifths`, `modal-cadence`, `dense-modal`, `random-listen-check`, and `seed-0zereox-1v729ih` for weak/offbeat and entry-dissonance tradeoffs.

## Findings

### 1. Long post-entry thin-support windows are repaired in the focused set

Affected seeds: `angular-answer`, `modal-dorian`, `random-listen-check`, and `seed-0zereox-1v729ih`.

The focused post-entry test now finds zero four-quarter-or-longer answer/stretto-like windows where the entry voice has at most one outside support voice. The generator adds a functional support line into qualifying post-entry continuation runs rather than treating the entry line plus one outside part as sufficient by default.

Theory basis: Fux-like counterpoint and fugue texture both allow reduced two-part writing when prepared, but an answer or stretto-like entry should not routinely collapse into entry-line-plus-one-support continuation without cadence, pedal, suspension, or exposed-solo function.

Project response: accept this as the Phase 14C0 generator response. Keep the signal review-required rather than CI-blocking because cadential thinning and exposed two-part rhetoric must remain possible.

### 2. Free-counterpoint phrase signatures are less concentrated, but not solved as a general phrase grammar

Affected seeds: the same focused Phase 14C0 / 14C1 set.

The strongest six-note free-counterpoint contour/duration signature across all four focused seeds is now held below the repaired ceiling of 55 occurrences. The previous coverage PR fixed the pre-repair pressure as a repeated-signature signal; the repaired run keeps the same cross-seed surface from dominating the focused set.

This is not a claim that free-counterpoint grammar is fully rich. The change introduces phrase-variation rhythm and contour alternatives in the long-form review path, but broader phrase development still depends on score-window function, counter-subject survival, and line agency.

Theory basis: repeated figuration is acceptable when it changes function, register, sequence direction, cadence target, or contrapuntal pressure. It weakens voice agency when the same short surface formula is the default across unrelated seeds.

Project response: accept this as the Phase 14C1 generator response for the focused blocker. Keep free-counterpoint phrase signatures review-required for later broad-bundle review.

### 3. Dissonance tradeoffs remain review-required

Affected seeds: `contrary-motion`, `tight-stretto`, `circle-fifths`, `modal-cadence`, `dense-modal`, `random-listen-check`, and `seed-0zereox-1v729ih`.

The post-entry support repair buys texture continuity by adding real support lines after important imitation. The accepted tradeoff is more review-visible weak/offbeat semitone pressure in some focused seeds and wider unresolved accented entry-clash ceilings:

* Batch A weak-passing semitone clash ceiling: 16,000 ticks.
* Batch B weak-passing semitone clash ceiling: 19,000 ticks.
* Batch A passing-neighbor/offbeat semitone clash ceiling: 32,000 ticks.
* Batch B passing-neighbor/offbeat semitone clash ceiling: 52,000 ticks.
* Focused unresolved accented entry-clash ceilings: 18 for `contrary-motion`, `tight-stretto`, `circle-fifths`, `modal-cadence`; 6 for `dense-modal`, `random-listen-check`, and `seed-0zereox-1v729ih`.
* Earlier planner comparison tests record the same support-line side effect with slightly wider shared-rhythm and leap-recovery deltas: Phase 10 section-local planner shared-rhythm delta 20 and leap-recovery delta 13; Phase 11/12 review batch B2 shared-rhythm delta 153 and leap-recovery delta 48; Phase 11/12 rotation batch B leap-recovery delta 28.

This is not accepted as a hidden improvement. The tradeoff remains `review-required`: future line-agency and phrase-development work must not treat extra semitone friction as a cheap source of variety.

## Profile Notes

`organ-default`: repaired post-entry windows should no longer sound like all but one part has withdrawn after answer or stretto-like imitation in the focused seeds. Remaining risk is local semitone friction where added support is audible as harmonic pressure rather than prepared counterpoint.

`strict-counterpoint`: the support-continuity repair is acceptable only as review-required strict-style evidence. Added support lines improve texture density, but unresolved accented entry clashes and weak/offbeat semitone windows remain strict-counterpoint review items rather than CI acceptance.

No broad human listening pass was completed for this PR. These notes are score-window and diagnostics based, following the Phase 14 policy that generator changes may proceed with agent-side music-theory review while recording listening gaps explicitly.

## CI / Review Scope

* Post-entry thin-support windows: `review-required`; deterministic focused repair evidence, not a permanent CI blocker.
* Free-counterpoint phrase signatures: `review-required`; useful for cross-seed formula pressure, but function-bearing repetition needs score-window review.
* Weak-passing / passing-neighbor / offbeat semitone ticks: `review-required`; widened ceilings document the tradeoff and must be re-reviewed before any CI promotion.
* Unresolved accented entry clashes: `review-required`; accepted only as visible tradeoff after the texture repair, not as Phase 14 beauty acceptance.
* Earlier planner comparison deltas: `review-required`; widened only to record the new support-line behavior and not promoted as a quality gate.

## Handoff

Phase 8 may proceed with the Phase 14 evidence baseline only if it keeps these review-required signals visible. Infinite playback, visual smoothing, or profile changes must not hide post-entry thinning, repeated free-counterpoint formulas, or unresolved semitone friction.
