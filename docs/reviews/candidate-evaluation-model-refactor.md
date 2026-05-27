# Candidate Evaluation Model Refactor Review

This review records the evidence for refactoring selected-candidate evaluation weights before the next implementation lane.

## Findings

1. The old upper-neighbor fifth-climb selection cost was too literal.

Affected seeds: standard 22 seed review bundle, with focused guardrail checks for `fugue-smoke`, `lyrical-line`, `contrary-answer`, `modal-dorian`, `modal-answer`, and fifth-climb rotation seeds.

Theory basis: species-counterpoint voice independence and fugue texture both prefer independent lines and usable contrary or oblique support over long bass-upper similar motion. The relevant symptom is not one exact degree string; it is an entry subject that climbs stepwise to the fifth, turns back, then recovers upward while the bass and upper support remain coupled in the same direction.

Project response: replace the literal degree-pattern predicate with `ascendingFifthTurnbackContourCost`, a structural contour predicate plus existing eight-beat bass-upper same-direction evidence. Keep it as candidate scoring evidence, not a new CI gate. Selected-candidate evaluation moves to `featureVersion` 7 / `evaluationModelVersion` 13 because the public feature map changed.

2. Several candidate-evaluation weights were placeholders rather than real musical selection signals.

Affected metrics: counter-subject survivability windows, entry-boundary reset count, strong-beat dissonance count, harmonic-function mismatch counts, structural-intent mismatch counts, weak-beat unresolved non-chord-tone count, and harmonic-function match count.

Theory basis: these are useful review surfaces only when localized to seed, tick, role, section function, and resolution path. Tiny or zero weights made the model look more parameterized without materially guiding selection.

Project response: keep the diagnostics and selected-candidate features visible for review, but remove inert weights from `totalCost`. Harmonic and counter-subject review acceptance still belongs to score-window review and manual listening, not placeholder selection costs.

## Before / After Evidence

Generated review bundles:

* Baseline: `samples/refactor-evaluation-baseline`
* Variant: `samples/refactor-evaluation-variant`

Both bundles used the standard 22 seed review set at 129600 ticks.

Summary comparison:

| Signal | Baseline | Variant |
| --- | ---: | ---: |
| seed count | 22 | 22 |
| adoption-ready seeds | 22 | 22 |
| outside reference seed count | 0 | 0 |
| unresolved-entry-severe-interval local sentinels | 218 | 218 |
| long-pitch-class-unison local sentinels | 67 | 67 |
| top subject-fragment family share | 0.227 | 0.227 |

No seed-level review-signal, local-sentinel, leap-recovery, unison-overlap, shared-rhythm, or selected-candidate total-cost regression appeared in the summary comparison. MIDI hashes were identical for all 22 generated files, so the refactor did not change the generated score output.

Focused checks:

* `generate-contour-continuation.test.js`
* `generate-contour-guardrails.test.js`
* `generate-stepwise-fifth-climb.test.js`
* `generate-stepwise-fifth-climb-rotation.test.js`
* `generate-protected-fifth-climb.test.js`
* `generate-texture-phrase-planning-rotation-b.test.js`
* `public-contract.integration.test.js`

## Structural Hypothesis

Symptom: literal candidate-scoring patches make the model harder to reason about and can hide which musical structure is actually at risk.

Repeated pattern: a subject contour that reaches the fifth by step, turns downward, then recovers upward can invite same-direction bass-upper support if the candidate selector does not price contour coupling.

Evidence strength: confirmed as a guardrail-preserving refactor. A naive removal and a broad bass-upper same-direction weight both caused focused-test regressions; the structural contour predicate preserved the score output and focused gates.

Project response: keep candidate scoring tied to contour, voice independence, and entry-local evidence. Do not promote the standard 22 seed bundle or the contour predicate itself to CI blocking; use existing focused tests for CI and review bundle evidence for score quality.

## CI / Review Scope

| Item | Classification | Reason | Action |
| --- | --- | --- | --- |
| `ascendingFifthTurnbackContourCost` | `ci-observed` | It is a selected-candidate feature and versioned evaluation-model signal, but its musical value depends on score context. | Assert through existing focused guardrail tests and public contract versioning. |
| Standard 22 seed before/after bundle | `review-required` | Broad score quality and metric truthfulness evidence, too expensive and aesthetic for PR CI blocking. | Keep as generated review evidence under `samples/`; do not commit bundle files. |
| Removed placeholder weights | `remove-or-archive` | They added parameter surface without meaningful selection effect. The underlying diagnostics remain. | Keep diagnostics as review signals; remove selection-cost parameters. |

Remaining gap: no broad human listening pass was completed. This review uses generated MIDI availability, diagnostics summaries, focused guardrails, and agent-side score review.
