# Generator Constraint Rebuild Density and Structural Support Review

## Decision

Continuation section-CSP の density-floor と non-chord structural-support の対象 slice は完了とする。標準 22 seed、各 129600 ticks の再生成では、全 seed が relaxation `none` を選び、unsupported density window、min-active-voice violation、unsupported solo、all-voice silence、long unplanned silence violation、unsupported structural label、non-chord structural-support hard failure はすべて 0 だった。

`constraintSatisfactionReview` は schema 6 とし、機能で説明できる薄化と真の density collapse、正当な non-chord support と誤った structural label を別々に記録する。今回の evidence は `ci-observed` 昇格を検討できる false-positive 分離を持つが、手動聴取を行っておらず、metrical-boundary と voice-independence の review signal も残るため、この変更では `review-required` を維持する。

## Implementation Review

Density classification は required active-voice floor を割った window だけを hard-failure 対象にする。`cadence-breath`、`entry-handoff-delay`、`pedal-thinning`、`suspension-resolution`、`register-relief` で説明できる不足は accepted function として残し、それ以外だけを unsupported collapse とする。単一声部の長い休止も、残る声部が必要密度を維持する場合は texture collapse と数えない。

Structural-support classification は実 pitch と local harmony を照合し、chord support、passing、neighbor、suspension、unsupported structural label を分ける。subject / answer の主題音は structural support label の検査対象から外し、support role に structural intent が付いているのに実音が非和声音である場合だけを hard failure とする。候補生成では support voice、音高、開始、長さを section 採用前に決定的に補い、最終的な実 pitch に合わせて intent を再分類する。

Score-level functional thinning、entry continuity、harmonic continuity、stasis、sustained dissonance、voice-order cleanup は通常経路で提案譜面を採用しない。再生成では cleanup trace 194 rows が残ったが、selected cleanup row は 0 であり、no-op または failure evidence としてのみ機能した。Section candidate trace は stable candidate id、hard failure、soft cost、選択 relaxation level を保持する。

## Before and After

| Evidence | Before | After |
| --- | ---: | ---: |
| relaxation `none` seeds | 3 / 22 | 22 / 22 |
| density / structural review or infeasible seeds | 19 / 22 | 0 / 22 |
| section windows | 718 | 692 |
| explained density classifications | not separated | 1315 |
| unsupported density windows | not separated | 0 |
| min-active-voice violations | 208 | 0 |
| unsupported-solo windows | 22 | 0 |
| all-voice-silence windows | 0 | 0 |
| long-unplanned-silence violations | 5 | 0 |
| legitimate non-chord support classifications | not separated | 6 |
| unsupported structural labels | not separated | 0 |
| non-chord structural-support hard failures | 77 | 0 |
| structural chord / root misses | 154 / 103 | 141 / 180 |
| metrical boundary cost | 3270 | 3340 |
| unprepared transitions / prepared pickups | 76 / 723 | 71 / 823 |

Structural chord / root misses are retained as soft harmonic-anchor evidence: eliminating false structural labels does not imply every anchor has ideal root coverage. The maximum raw per-voice unplanned silent run increased from 2880 to 3360 ticks, but every such span retained the required texture density and therefore did not represent the multi-voice collapse targeted by this slice.

The public note/meta event envelope, known voices, deterministic generation, subject identity, answer plan, key metadata, range, voice crossing, and active `WritingProfile` pitch contracts remained at 0 hard failures across the regenerated set. The `wide-key` control remained at relaxation `none`.

## Musical Tradeoffs

Aggregate shared-rhythm overlap improved from 20098 to 18579, leap-recovery misses from 2763 to 2447, unresolved accented entry clashes from 125 to 120, and mechanical-reuse windows from 284 to 245. Aggregate unison overlap worsened from 13161 to 13593, so density repair is not treated as an unconditional aesthetic improvement.

* `angular-answer`, section 67680-72000 (`subject-return`): voice-pair lockstep rose from 19 to 25 and unison pressure from 16 to 17, although aggregate leap recovery improved for the seed. This belongs to candidate scoring and voice-pair independence review, not to weakening the density floor.
* `dense-modal` and `modal-cadence`: unison overlap and leap-recovery misses rose after added support. These remain review-required support-line contour and register-allocation work.
* `quiet-cadence`: aggregate unison overlap rose while lockstep and leap-recovery misses improved. The cadence function explains thinning decisions but does not excuse prolonged doubling; response belongs in candidate scoring.
* `circle-fifths`: unresolved accented entry clashes increased, with representative `subject-return` windows around ticks 12480 and 18240. Response belongs in entry-support pitch and resolution scoring.
* `modal-dorian`: mechanical-reuse windows increased, including representative `subject-return` cadence-extension windows around ticks 28800 and 46080. Response belongs in phrase development and candidate-family scoring.
* `wide-key`: the no-relaxation control remained at relaxation `none` with 0 hard-contract failures, but it was not metric-identical. Unison overlap rose from 559 to 657 and metrical-boundary cost from 140 to 228, while leap-recovery misses fell from 181 to 74, unresolved accented entry clashes from 14 to 1, and mechanical-reuse windows from 16 to 11. The `subject-return` window at ticks 16800-20640 is representative of the unison tradeoff, with section-local unison pressure rising from 19 to 22. This mixed result does not reopen the completed density / structural hard-failure slice, but it remains manual-listening and candidate-scoring evidence for the next target.

These are score-derived review findings. Manual listening remains open, so no aesthetic gate is promoted in this slice.

## Theory Basis and Scope

The design reuses bibliography claim `section-constraint-csp-local-first` and source family `music-constraint-programming` for bounded local hard/soft search. Passing, neighbor, and suspension classification follows the existing `species-dissonance-treatment` source family. The sources justify separating structural constraints from contextual dissonance; the exact thresholds and observed tradeoffs remain project inferences verified against generated score windows.

Next work should address metrical-boundary cost and the documented voice-independence / phrase-development tradeoffs. It should not restore score-level cleanup as a normal mutation path or promote `constraintSatisfactionReview` before listening and false-acceptance review.
