# Generator Constraint Rebuild Important Entry Tail Review

## Verdict

Implementation complete; agent score review accepted; manual listening not performed.

The exposition solver now evaluates the finally shaped draft, including boundary staggering and voice-order processing, before adoption. Its bounded four-candidate domain includes the finalized base, oblique continuity, alternate linear voicing, and held-or-staggered support. The selected candidate and the rejected alternatives remain visible in `generatorSearchTrace` with hard failures, soft cost, and the deterministic selection reason.

## Generated Evidence

The final 129600-tick standard bundle is `samples/generator-constraint-rebuild-important-entry-tail-final-3` and contains 22 seeds. A fresh completion rerun was byte-identical for all 22 MIDI files. The pre-slice comparison bundle is `samples/generator-constraint-rebuild-next-target`.

| Metric | Before | After |
| --- | ---: | ---: |
| Important-entry zero-outside windows | 22 | 0 |
| First-bass-answer zero-outside windows | 22 | 0 |
| Selected relaxation `none` | 22 / 22 | 22 / 22 |
| Unsupported density windows | 0 | 0 |
| Unsupported structural labels | 0 | 0 |
| Subject / answer / key-metadata violations | 0 | 0 |
| Voice crossings / range / `WritingProfile` pitch violations | 0 | 0 |
| Unresolved accented entry clashes | 23 | 23 |
| Mechanical-coupling ticks | 306960 | 307680 |
| Exact-collision ticks | 78240 | 79200 |
| Mechanical-reuse windows | 89 | 89 |
| Metrical-boundary cost | 240 | 240 |
| Leap-recovery misses | 1164 | 1169 |

Mechanical-coupling and exact-collision ticks are whole-score sums across all six voice pairs and all 22 seeds.

All 22 seeds select a finalized solver-owned support candidate: 12 select oblique continuity, 6 select held-or-staggered support, and 4 select alternate linear support. None of the four exposition candidates has a public hard failure. No score-level `entry-window-continuity-support` or `bass-answer-tail-texture-support` proposal is adopted on the normal path.

## Score Findings

1. The repeated first-bass-answer collapse is closed.

   The primary seven seeds now classify the reported exposition window as `supported-tail`: `tight-stretto` and `close-imitation` at 4320-7680, and `restless-line`, `fugue-smoke`, `wide-key`, `dense-modal`, and `modal-cadence` at 5760-9120. The former 1440-tick zero-outside tail is replaced by a selected held, oblique, or staggered outside line while the bass answer identity remains unchanged.

2. The repair is structural rather than literal.

   Candidate construction uses entry form and order, already-entered voices, the entry-local harmonic plan, available support voices, and realized voice order. Focused coverage includes non-bass important entries and episode subject fragments, so the predicate is not tied to the bass voice, a seed, key, pitch, meter, or absolute tick.

3. Deliberate thinning remains review evidence rather than a hard failure.

   `important-entry-tail-texture` remains a soft cost. The solver can retain cadence preparation, suspension release, entry handoff, or other function-bearing thinning when competing support candidates would violate stronger contracts. The implementation only prioritizes a zero-outside improvement when the candidate does not increase hard failures; it keeps mechanical coupling, exact collision, accented-entry clash, leap recovery, and phrase reuse visible as separate review controls rather than allowing the texture gain to hide their tradeoffs.

4. The added support has small voice-pair tradeoffs, but no new score blocker.

   Whole-score mechanical-coupling duration rises by 720 ticks: `circle-fifths`, `contrary-answer`, `contrary-motion`, and `modal-answer` each add 240 ticks, while `lyrical-line` removes 240 ticks. Exact-collision duration rises by 960 ticks through four isolated half-beat contacts: soprano-alto at 7920-8160 in `bright-answer` and `dark-episode`, soprano-alto at 8160-8400 in `dense-modal`, and tenor-bass at 9840-10080 in `contrary-motion`. These contacts are confined to the repaired first-bass-answer tail window, resolve after 240 ticks, and introduce no accented-entry clash, mechanical-reuse, range, crossing, identity, or profile failure. The brief unisons reduce local voice independence, so they remain `score-concern`; their evidence strength is not high enough to outweigh the removal of the repeated 1440-tick three-outside-voice collapse or to become `score-blocking`.

5. The remaining leap tradeoff is a `score-concern`, not a blocker.

   Aggregate leap-recovery misses rise by five across four control seeds: `contrary-motion` +1, `long-arc` +2, `modal-answer` +1, and `sparse-cadence` +1. The primary seven are unchanged. These are localized support-line contour warnings, with no new entry clash, mechanical reuse, identity, range, or profile failure; the accompanying voice-pair deltas are classified separately above. The target's unsupported texture collapse is closed without evidence of a high-confidence score-blocking failure, so the warnings remain review-required rather than reopening the solver slice.

## Theory Basis And Scope

The source-family basis remains Fux/species counterpoint for independent carried lines, oblique and contrary support, and prepared suspension/resolution, together with common-practice fugue expectations for continuing or staggered outside voices during a later exposition entry. These expectations rank bounded candidates; they are not promoted to a universal hard prohibition on thinning.

`importantEntryTailTexture`, `bassAnswerTailTexture`, mechanical coupling, exact collision, entry clash, leap recovery, mechanical reuse, counter-subject identity, and phrase development remain `review-required`. Manual listening remains a non-blocking `manual-listening` gap. No metric or seed is promoted to `ci-blocking` or `ci-observed` by this slice.
