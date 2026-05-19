# Phase 13Q Voice-Pair Support Review

This review records the Phase 13Q automatic adoption pass for oblique voice-pair support candidates and quality-vector-aware candidate selection. It compares the prior `phase10-section-local-planner` output with the variant in this slice across the 22 seed review bundle under `organ-default`.

Generated bundle:

```sh
pnpm fugematon review-ab --out samples/phase13q-after-voice-pair-support-v3-ab --ticks 129600 --baseline-label phase10-oracle-selection --baseline-model phase10-oracle-selection --variant-label phase13q-after-v3 --variant-model phase10-section-local-planner --performance-profile organ-default
```

The generated bundle is evidence, not source. Manual MIDI listening is still not reviewed.

## Findings

* Symptom: viable candidate diversity improved. Total candidates changed `27228 -> 34220`, and viable candidates changed `2140 -> 2687`. The new candidates add oblique support lines that can be selected only when hard constraints, voice-leading guardrails, Phase 13 quality-vector lockstep axes, and unresolved entry duration do not regress against the local baseline candidate.
* Symptom: voice-pair pressure improved in aggregate. `pitchClassUnisonDuration` changed `1892 -> 1872.5`; `durationBasedLockstep` changed `2375 -> 2315`. Improvements were spread across `wide-key`, `lyrical-line`, `sparse-cadence`, `ornament-test`, `restless-line`, and other seeds. `fugue-smoke`, `close-imitation`, `angular-answer`, `quiet-cadence`, and `contrary-answer` had seed-local tradeoffs on one axis while the aggregate improved.
* Symptom: focused entry harmony improved where the current pool had selectable alternatives. `unresolvedEntrySevereIntervalDuration` changed `223 -> 212`, with improvements in `modal-cadence` and `dense-modal`. The blocker is not gone: many entry-harmony sections remain classified as generator-needed, so later work still needs stronger entry-harmony candidate generation.
* Symptom: Phase 12 repetition gains were preserved for the focused repetition seeds. `modal-dorian`, `angular-answer`, `modal-answer`, `modal-cadence`, and `dense-modal` kept the same most repeated 4-section pattern count and unique pattern count as the prior Phase 13Q baseline.

## Structural Hypothesis

The previous Phase 13Q bridge showed that selection-only pressure on the old pool could not safely improve voice independence. The new oblique support candidates change the support rhythm and pitch contour instead of only retuning cost weights. That gives the selector viable alternatives for long pitch-class unison and duration lockstep without reopening the Phase 12 repetition blocker.

Evidence strength: confirmed for automatic diagnostics across the 22 seed bundle. It is not confirmed by manual listening.

## Tradeoffs

`fugue-smoke` and `close-imitation` accepted small pitch-class unison regressions while reducing duration lockstep. `modal-cadence` improved unresolved entry duration and pitch-class unison while increasing duration lockstep. `dense-modal` improved unresolved entry duration and pitch-class unison while increasing duration lockstep. These are accepted automatic-review tradeoffs because the aggregate voice-pair axes improved, hard constraints stayed at 0, and Phase 7B readiness stayed true for all 22 seeds.

The full 22 seed aggregate changed the Phase 12 repetition totals from `76 -> 77` most repeated 4-section patterns and `378 -> 375` unique patterns, but the focused Phase 12 blocker seeds did not regress. The small aggregate movement is treated as a review signal, not a blocker for this automatic adoption slice.

## Project Response

Adopt this as the Phase 13Q automatic generator baseline before Phase 13R. Keep manual MIDI listening as an explicit follow-up: the generated `listening-review.json` and pairwise preference template remain `not-reviewed`, so this adoption is diagnostics-backed rather than human-listening-backed. Later listening and default-path diagnostics inserted [Phase 13R](../phases/phase-13r.md) before Phase 8 operational work.
