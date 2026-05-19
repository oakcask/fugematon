# Phase 12 Review Summary

Phase 12 compares `phase10-oracle-selection` against `phase10-section-local-planner` over the 22 Phase 5/5.11 review seeds, with focused score review on `angular-answer`, `modal-dorian`, `modal-answer`, `modal-cadence`, `dense-modal`, `bach-001`, `fugue-smoke`, and `minor-entry`.

Review command:

```sh
pnpm fugematon review-ab --out samples/phase12-review-summary --ticks 129600 --baseline-label phase11-current --baseline-model phase10-oracle-selection --variant-label phase12-phrase-unit-planner --variant-model phase10-section-local-planner
```

The review is based on ScoreEvent diagnostics and score inspection by the agent. A human MIDI listening pass is still a follow-up, not a Phase 12 completion blocker.

## Findings

The Phase 12 blocker family improved across the focused modal and angular seeds. Most repeated 4-section pattern count changed as follows: `angular-answer` 7 -> 5, `modal-dorian` 6 -> 5, `modal-answer` 6 -> 5, `modal-cadence` 7 -> 5, and `dense-modal` 7 -> 5. Unique 4-section pattern count also rose on every focused blocker seed: 4 -> 9, 5 -> 11, 5 -> 11, 4 -> 9, and 4 -> 12 respectively.

Across the 22 seed review set, phrase-family concentration and thinning also moved in the intended direction. Top entry-pattern family count fell by 15 total, total most-repeated 4-section pattern count fell by 69, unique pattern count rose by 266, and unsupported functional thinning runs fell by 24.

The adopted route keeps Phase 12 phrase-family oracle candidates as evidence-only candidates. Directly selecting those alternate stems was rejected because local section guardrails did not predict full-score voice-leading costs well enough. The accepted change instead allows modal phrase-unit planning to preserve the existing modal subject family until a 4-section pattern has repeated enough to become a structural risk, then vary the state unit while keeping the section-local planner guardrails.

## Tradeoffs

Voice independence and melodic recovery regressions remain review signals, not hard failures. Across 22 seeds, unison overlap rose by 458, shared-rhythm overlap rose by 416, leap-recovery misses rose by 71, and total counter-subject identity retention fell by 0.279. The musical symptom is not a new hard-constraint failure; it is denser phrase-unit contrast creating more doubled or rhythmically aligned support motion and some weaker recovery after leaps.

The affected focused seeds are bounded but not silent. `modal-answer` is the main counter-subject tradeoff, with counter-subject identity retention down by 0.097 while most repeated pattern count improves 6 -> 5 and unique pattern count improves 5 -> 11. `modal-cadence` and `dense-modal` keep counter-subject identity within 0.008 of baseline, while `angular-answer` preserves it and `modal-dorian` loses 0.013.

The theory basis is Fux/species counterpoint for voice independence and leap recovery, common-practice phrase rhythm for avoiding mechanical four-section loops, and fugue-form practice for treating repetition as function-bearing sequence, restatement, or stretto rather than unvaried cycling. Phase 12 accepts the phrase-level improvement because hard constraints, determinism, schema compatibility, reference diagnostics, and Phase 7B readiness remain intact, and because the unresolved tradeoff is documented as a continuing quality-lane issue.

## Human Feedback Follow-up

Human listening feedback after Phase 12 confirms that the rhythm feel and the sense of closure when a part rests improved. This is consistent with the 22 seed diagnostics: unique 4-section state patterns rose by 266 across the set, most-repeated 4-section pattern counts fell by 69, unsupported functional thinning runs fell by 24, unsupported solo runs fell by 214, and abrupt texture drops fell by 253. These improvements occur on every seed in the review set, so they should be treated as Phase 12 results rather than a single-seed artifact.

The same feedback also identifies unresolved musical costs: some high parts have unnatural repeated notes and lose brilliance, exact unison and second collisions remain visible, and bass-tenor or bass-alto motion can stay in unison too long. A follow-up pass against the same 22 seeds shows that this is a mixed picture:

* Repeated-pitch runs rose from 210 to 246 total and increased on 16 of 22 seeds. Soprano repeated-pitch runs in selected-candidate explanations rose from 157 to 179, with the clearest increases on `bach-001`, `long-arc`, `dark-episode`, `restless-line`, `sparse-cadence`, `fugue-smoke`, and `dense-modal`. This supports the listening concern that the high part issue is not isolated.
* Pitch-class unison overlap rose from 14241 to 14699 total and increased on 17 of 22 seeds. The largest seed-level increases were `contrary-motion`, `contrary-answer`, `tight-stretto`, `wide-key`, `bach-001`, `close-imitation`, `circle-fifths`, and `long-arc`. Focused selected-candidate checks also show large bass-pair increases, especially `tight-stretto` tenor-bass, `wide-key` alto-bass, `contrary-answer` tenor-bass, `minor-entry` tenor-bass, `bach-001` tenor-bass, and `sparse-cadence` alto-bass.
* Exact same-pitch overlap did not worsen globally: it fell from 239 to 211 total, decreased on 9 seeds, increased on 6, and stayed flat on 7. The issue therefore remains a local musical defect rather than a Phase 12-wide exact-unison regression. The highest remaining variant counts are `tight-stretto`, `modal-cadence`, `circle-fifths`, `contrary-motion`, `minor-entry`, `lyrical-line`, `angular-answer`, and `dark-episode`.
* Entry-local severe seconds/sevenths also did not worsen globally in their unresolved form. Total severe entry intervals changed only 1847 to 1852, while unresolved severe entry intervals fell from 1055 to 979. The remaining concern is still real because `modal-cadence` and `dense-modal` each gained 6 unresolved severe entry intervals, and several seeds still have high absolute severe-interval counts.

Structural hypothesis: guarded phrase-unit planning reduced mechanical repetition and gave rests a clearer phrase function, but it also made support motion denser and more aligned with the active phrase unit. That improves continuity while increasing pitch-class unison exposure and repeated-pitch pressure in the soprano on several seeds. The current diagnostics count overlap and entry-local severe intervals, but they do not yet distinguish long contiguous bass-pair unison spans from many short contextual doublings.

Planning response: Phase 12P should first integrate shared `PerformanceProfile` rendering for MIDI and WebAudio, so later listening evidence records profile id and version separately from `ScoreEvent` changes. Phase 13 should then add duration-based exact-unison and pitch-class-unison diagnostics by voice pair, plus a soprano repeated-note contour/ornament check, before changing the Phase 12 baseline. These should feed a `qualityVector` / `qualityProfileComparison` review model so future adoption is judged by vector distribution, local sentinel regressions, and manual listening evidence rather than another round of single-axis threshold tuning.

## Completion Decision

Adopt `phase10-section-local-planner` as the Phase 12 phrase/repetition baseline. Phase 8/9 operational work should resume only after Phase 12P integrates shared performance profiles, Phase 13 adds the quality-vector review model, and Phase 13Q uses that evidence to improve the remaining voice-independence, entry-harmony, repeated-note, unison-span, leap-recovery, and counter-subject tradeoffs.
