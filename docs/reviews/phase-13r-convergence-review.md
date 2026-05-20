# Phase 13R Convergence Review

This review records why Phase 13R is inserted after Phase 13Q and before Phase 8/9. It is based on user listening feedback plus a focused diagnostics check of the normal default path versus the current planner path.

The check compared `generateScore` with no `selectionModel` against explicit `phase10-section-local-planner` at the Phase 5 review length. It inspected `phase11Review.stateGrammarRepetition` and `phase12Review.entryPatternFamilyConcentration`. This was a focused diagnostics check, not a generated review bundle and not a full manual listening pass.

## Findings

The listening symptom is confirmed as plausible and seed-crossing: later continuation material can sound as if it converges toward the same phrase family. The strongest immediate cause is that the normal entry points still use the legacy default. `generateScore` falls back to `baseline` when `selectionModel` is omitted, and CLI/Web UI normal playback omit it. That means a listener can hear the pre-Phase-12/13Q path even though later review docs adopted `phase10-section-local-planner` as the quality baseline.

Focused diagnostics show the difference:

* `bach-001`: default path most repeated 4-section pattern / unique 4-section patterns were `7 / 4`; explicit current planner was `2 / 21`.
* `fugue-smoke`: `7 / 6` versus `4 / 16`.
* `modal-cadence`: `7 / 4` versus `5 / 9`.
* `dense-modal`: `7 / 4` versus `5 / 12`.
* `random-listen-check`: `6 / 5` versus `5 / 11`.

This evidence means Phase 8 should not proceed under the assumption that Phase 13Q quality is what the product path currently plays. The product boundary must make the adopted baseline explicit before infinite playback work extends the same behavior over longer sessions.

The second cause remains inside the generator. Even under the current planner, subject stem and subject-fragment families stay concentrated. Examples include repeated `subject-fragment:0-1-2-3`, `subject-fragment:0-2-1-3`, and subject stems such as `0-1-2-3-4-3-1-2` or `0-2-1-3-4-3-2-1`. Phase 12 improved section-cycle repetition by guarded phrase-unit planning, but the alternate phrase-family oracle candidates were not generally selected because local guardrails did not predict full-score voice-leading costs well enough.

## Structural Hypothesis

The convergence has two layers:

* product-boundary layer: normal CLI/Web/Core generation routes omit the adopted selection model, so they play the older narrow continuation cycle;
* generator layer: the selected candidate pool still relies on a small number of subject stems and leading fragments, so even the improved planner can return to similar audible material.

Evidence strength: confirmed for the product-boundary layer by code path and focused metrics; plausible for the generator layer by subject-family concentration and previous Phase 12 rejected-selection evidence. Manual pairwise listening is still missing.

## Theory Basis

Fugue repetition should be functional. Subject returns, episodes, sequences, cadential extensions, and stretto-like compression may reuse material, but the listener should hear a changed role, direction, tension, or cadence goal. Repeating the same short fragment or 4-section cycle without that changed function reads as mechanical continuation rather than fugal development.

The repair must still respect counterpoint. More phrase variety is not acceptable if it causes unresolved seconds/sevenths, long exposed unison, poor leap recovery, or loss of subject/counter-subject identity.

## Project Response

Insert [Phase 13R](../phases/phase-13r.md) before Phase 8. Phase 13R should first align normal generation entry points with the adopted quality baseline, then add default-path convergence diagnostics and guarded phrase-family / fragment-derivation selection.

Phase 8/9 remained deferred until the default path and focused convergence seeds passed review. The Phase 13R follow-up repair has now completed that precondition. UI controls, rendering profiles, or Web Worker fallback must still not be used to hide any future convergence symptom.

Initial guardrail response: diagnostics now expose `phase13RReview` so CI and agent self-review can detect this failure mode before the repair is complete. The signal is `review-required`, not a hard failure. It should become an adoption gate for default-path changes once Phase 13R starts changing selected output.

Remaining gaps:

* no full 22 seed `review-ab` bundle was generated for Phase 13R yet;
* no manual listening templates were filled for the focused convergence seeds;
* the current check did not inspect exact ScoreEvent windows around late-score phrase boundaries.

Planning update: these gaps are no longer only post-adoption caveats. Focused manual listening, cross-seed subject-diversity evidence, and repair of musical problems found by that follow-up must be completed before Phase 8/9 resume, because infinite playback and Worker fallback would otherwise extend the same unreviewed subject-family behavior or newly detected musical defects over longer sessions.

Post-Phase-13R listening update: human playback still hears the original convergence symptom after the automatic adoption and subject-diversity follow-up. The report covers similar structure and phrase material both within a score and across seeds, so the current `subjectFamilyDiversity` aggregate is not enough to prove musical variety. The same playback pass also reports abrupt three-part silence that still sounds unnatural. That symptom is not only `allVoiceSilenceGapCount`; it needs focused texture evidence for active voice count drops, cadence distance, section state, phrase-boundary proximity, and whether the remaining solo or duo line has a functional continuation role.

Updated structural hypothesis: Phase 13R reduced one product-boundary error and one initial-subject vocabulary collapse, but later phrase-family selection, section-state cycling, and texture-thinning decisions can still converge on recognizably similar audible material. The three-part silence report suggests that functional thinning is still under-specified or under-scored: multiple voices may rest together without a strong cadence, staged reduction, or phrase function that makes the texture change sound intentional. Evidence strength is confirmed as a human-listening blocker, but affected seeds and exact ScoreEvent windows remain missing.

## Detection Audit After Automatic Adoption

A follow-up seed sweep checked the adopted default path against the 22 seed review set plus extra ad hoc seeds chosen to exercise subject-family similarity. The current detector correctly keeps the product-boundary failure visible: explicit legacy `baseline` reported three or four Phase 13R findings on every checked seed, while the omitted/default path reported `phase10-section-local-planner`.

For within-score phrase convergence, `phase13RReview` is useful but scoped. On the 22 seed review set, 15 seeds still reported review-required convergence findings under the adopted default path: 9 `subject-stem-family-concentration`, 6 `subject-fragment-family-concentration`, and 1 `entry-pattern-family-concentration`. The no-finding seeds were `bach-001`, `lyrical-line`, `circle-fifths`, `close-imitation`, `long-arc`, `restless-line`, and `modal-answer`. This means the detector catches many cases where one family dominates a single generated score, but it intentionally treats the remaining findings as review signals rather than hard failures.

The same sweep also showed a distinct seed-crossing subject-similarity gap. The top subject stem across 29 checked seeds collapsed into only three degree patterns: `0-2-1-3-4-3-2-1` on 15 seeds, `0-1-2-3-4-3-1-2` on 11 seeds, and `0-1-2-3-4-3-2-1` on 3 seeds. Top subject fragments collapsed into only two patterns: `0-2-1-3` on 15 seeds and `0-1-2-3` on 14 seeds. Several seeds with no Phase 13R findings still belonged to these cross-seed top-family clusters, so the current detector does not detect "different seeds keep generating similar subjects" unless the repeated family also exceeds the per-score concentration threshold.

The implementation explained that gap: `buildSubject` chose from three subject degree shapes before later phrase-family variation. The follow-up added corpus-level subject-family diversity summaries, A/B subject-family deltas, and a broader guarded subject generator. Later focused listening exposed mechanical subject-fragment convergence and abrupt three-part silence; those were fixed and re-reviewed before returning to Phase 8.
