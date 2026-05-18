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

## Completion Decision

Adopt `phase10-section-local-planner` as the Phase 12 phrase/repetition baseline. Phase 8/9 operational work can resume from this baseline, with the remaining voice-independence, leap-recovery, and counter-subject tradeoffs carried as quality-lane review signals rather than blockers.
