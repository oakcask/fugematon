# Phase 14 Weak-Dissonance Generation Review

## Finding

Phase 14B still had review-required weak-passing and passing/neighbor/offbeat semitone pressure after the entry-continuity and entry-local dissonance repairs. The repeated symptom was a free-counterpoint support note forming a local semitone against an already sounding voice on a weak/offbeat subdivision, especially after the opening entry span of a continuation section.

Theory basis: Fux-like counterpoint accepts passing and neighboring dissonance only when local preparation and resolution make the dissonance legible. In this project, the response is not to ban color, but to prefer a nearby chord-tone support note when the weak/offbeat support note would otherwise create an unexplained semitone stack.

## Generator Response

Free-counterpoint note creation now checks weak/offbeat starts after the first six quarters of a harmonic plan. If the new support note would create a semitone clash with an active voice, the generator may substitute a nearby chord-tone pitch within a fourth, preserving voice range and adjacent voice order. The repair intentionally skips the opening entry span so entry support is not rewritten into worse accented entry clashes.

The repair is generation-side only. An attempted candidate-evaluation cost reduced some semitone pressure further, but it also moved older planner and guardrail expectations. That scoring route is left for a later stack with broader line-agency and counter-subject review.

## Evidence

Focused seed set:

* `contrary-motion`
* `tight-stretto`
* `circle-fifths`
* `modal-cadence`
* `dense-modal`
* `random-listen-check`
* `seed-0zereox-1v729ih`

Before this change:

* weak-passing semitone clash ticks: 24,240
* passing/neighbor/offbeat semitone clash ticks: 90,240
* unresolved accented entry clashes: 9

After this change:

* weak-passing semitone clash ticks: 21,360
* passing/neighbor/offbeat semitone clash ticks: 85,440
* unresolved accented entry clashes: 9

Accepted tradeoff: the repair is deliberately conservative. It reduces weak/offbeat semitone pressure without claiming the broader Phase 14B dissonance work is complete. The high-risk entry-dissonance ceiling remains stable, but older entry-support instability review expectations move slightly for `fugue-smoke`, `lyrical-line`, and `contrary-answer` because some free-counterpoint support pitches now avoid offbeat semitone stacks. Severe and unresolved entry interval ceilings remain within the previous guardrails, so the response is documented as an accepted diagnostics-baseline update rather than a blocker.

CI / review scope:

* Focused weak-dissonance seed set: `review-required`; it records score-window pressure and repaired ceilings for Phase 14B.
* `phase14DissonanceTriage` weak-passing and passing/neighbor/offbeat semitone counts: `review-required`; they guide generation/scoring work but are not promoted to CI-blocking beauty gates.
* Candidate evaluation scoring: no scope change in this stack; scoring pressure is left as future work because the first attempt affected older planner guardrails.

## Remaining Work

The next Phase 14B/14C work should inspect remaining weak/offbeat semitone windows that survive this conservative repair, especially high-count `contrary-motion`, `tight-stretto`, and `circle-fifths` windows. Later repairs should connect the surviving windows to line agency and counter-subject survivability instead of only lowering counts.
