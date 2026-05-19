# Phase 13Q Planning Review

This review records the evidence for inserting Phase 13Q before Phase 8/9 UI and operational work. It is based on the Phase 13 quality vector model and a focused A/B score review comparing `phase10-oracle-selection` with the current `phase10-section-local-planner` baseline.

Review command used for the focused planning pass:

```sh
pnpm fugematon review-ab --out samples/phase-recent-seed-review --ticks 129600 --baseline-label phase11-current --baseline-model phase10-oracle-selection --variant-label phase12-plus-current --variant-model phase10-section-local-planner --performance-profile organ-default
```

The generated bundle is review evidence, not source. Manual MIDI listening is still incomplete.

## Findings

The current baseline preserves the main Phase 12 gain. Across the 22 seed set, most repeated 4-section patterns changed `145 -> 76`, unique 4-section patterns changed `112 -> 378`, and unsupported functional thinning changed `46 -> 22`.

The phrase-repetition blocker was mainly a generator/planner diversity issue, not only a selection-weight issue. Phase 11 review recorded the remaining blocker as generator/planner-sided, and Phase 12 improved it by changing phrase-unit planning rather than by only retuning selection. The remaining risk is that the current candidate pool can still fall back to narrow phrase families when voice-leading guardrails reject alternatives.

The tradeoff remains concentrated in voice independence and entry harmony. Across the same set, unison overlap changed `14241 -> 14699`, shared rhythm changed `18536 -> 18952`, leap recovery misses changed `402 -> 473`, and total counter-subject identity retention changed `18.204 -> 17.925`. Unresolved severe entry intervals improved in aggregate, `1055 -> 979`, but remain high enough to require entry-local review.

Phase 13 quality-vector aggregate on the current baseline reports `quality-review-required`. The strongest axes are pitch-class unison duration, duration-based lockstep, entry severe interval duration, and unresolved entry severe interval duration. Local sentinels are dominated by unresolved entry severe intervals and long pitch-class unison.

## Focused Seed Evidence

* `bach-001`: phrase repetition improves strongly, `7 -> 2`, and unique pattern count improves `4 -> 21`. The tradeoff is more unison and shared rhythm, with tenor-bass and soprano-tenor pitch-class unison pressure.
* `fugue-smoke`: phrase repetition improves `7 -> 4`, leap recovery improves `27 -> 17`, and unresolved severe intervals improve `72 -> 54`. Entry-local severe sentinels remain frequent.
* `modal-cadence`: phrase repetition improves `7 -> 5`, but unresolved severe intervals regress `70 -> 76`. This is the highest-risk entry-harmony seed.
* `dense-modal`: phrase repetition improves `7 -> 5`, and unison/shared rhythm improve, but leap recovery and unresolved severe intervals regress. Alto-bass pitch-class unison remains a local sentinel.
* `tight-stretto`: phrase repetition improves `7 -> 4`, and unresolved severe intervals improve, but unison, shared rhythm, and leap recovery regress.
* `sparse-cadence`: phrase repetition improves `6 -> 3`, but duration-based lockstep is high around cadence support.
* `angular-answer`: phrase repetition improves `7 -> 5` while counter-subject identity is preserved. Alto answer unresolved severe intervals repeat in stretto-like sections.
* `modal-answer`: phrase repetition improves `6 -> 5`, but counter-subject identity drops `0.631 -> 0.534`.

## Structural Hypothesis

Guarded phrase-unit planning reduced mechanical repetition and made thinning more functional, but it increased the amount of aligned support motion. That support improves continuity and closure, while exposing longer pitch-class unisons and duration-based lockstep. Entry-local severe intervals remain because the current planner can choose phrase-functional support that is formally useful but not always harmonically resolved within the entry window.

The candidate-diversity hypothesis is that current selection is not simply choosing repetition because repetition is rewarded. It often lacks enough diverse, viable, voice-leading-safe alternatives. Phase 13Q should measure viable diversity explicitly, then add phrase-family and derivation candidates as evidence-only before making any guarded subset selectable.

Evidence strength: plausible and seed-crossing. It is supported by the 22 seed aggregate, the focused seed deltas, and Phase 13 local sentinels. It is not yet confirmed by manual pairwise listening.

## Project Response

Insert Phase 13Q before Phase 8. The work should first expose candidate diversity and bridge Phase 13 quality-vector evidence into candidate explanations, then add guarded phrase-family, entry-harmony, and voice-pair planner changes. Adoption should require A/B review, focused seed score inspection, and manual listening notes under the default and strict-counterpoint performance profiles.

Do not make UI controls the next phase. The current issues are generator and planner quality problems, not interaction problems.
