# Generator Constraint Rebuild Harmonic Continuity Support Review

This review covers the harmonic-continuity support part of implementation order item 6 in [Generator Constraint Rebuild](../phases/generator-constraint-rebuild.md). It compares the target baseline with the current default `section-local-planner` output at 129600 ticks.

## Findings

1. Harmonic-continuity support cleanup now has score-level solver evidence.

   Short pivot-episode support is no longer applied as an invisible final cleanup in `buildFugueScore` or continuous continuation generation. The score-level solver snapshots the unrepaired score, applies the short-episode harmonic-continuity support cleanup, rejects repairs that increase hard failures or worsen harmonic-continuity support cost, and then emits:

   | Trace candidate | Purpose |
   | --- | --- |
   | `score-harmonic-continuity-unrepaired-final-repair-evidence` | before evidence; shows the unrepaired harmonic-continuity support surface |
   | `score-harmonic-continuity-solver-repaired` | after evidence; shows the score adopted by generation |

   The repaired candidate is accepted only when the score shows stronger bass-root / chord-tone support, lower mismatch / thinning pressure, or fewer review-required harmonic-continuity windows without adding hard failures.

2. The 22 seed target bundle keeps the baseline score and metric surface stable while adding solver evidence.

   | Metric | Target baseline | Current |
   | --- | ---: | ---: |
   | Seed count | 22 | 22 |
   | Length ticks | 129600 | 129600 |
   | Hard-contract failures | 0 | 0 |
   | Review signals | 11 | 11 |
   | Reference-profile outside seed count | 3 | 3 |
   | Reference-profile max distance | 0.033 | 0.033 |
   | Unsupported solo runs | 0 | 0 |
   | Abrupt texture drops | 0 | 0 |
   | Entry support instability count | 1856 | 1856 |
   | Unresolved severe entry interval count | 884 | 884 |
   | Quality-vector local sentinels | 13 | 13 |
   | `harmonicContinuity.focusedWindowCount` | 239 | 239 |
   | `harmonicContinuity.reviewRequiredWindowCount` | 36 | 36 |
   | `harmonicContinuity.audibleProgressionWindowCount` | 203 | 203 |
   | Seeds with harmonic-continuity before / after trace rows | 0 | 13 |

   Current before / after rows appear for `bach-001`, `minor-entry`, `wide-key`, `modal-dorian`, `circle-fifths`, `sparse-cadence`, `bright-answer`, `dark-episode`, `long-arc`, `contrary-motion`, `restless-line`, `quiet-cadence`, and `contrary-answer`.
   The representative ScoreEvent JSON for `bach-001`, `wide-key`, `tight-stretto`, and `modal-cadence` matches the target baseline, so this slice preserves the audible score surface and moves the previously invisible support cleanup into traceable solver evidence.

3. Review-required harmonic-continuity windows remain review-visible.

   The implementation does not reclassify every review-only continuity window as solved. `close-imitation`, `tight-stretto`, and `angular-answer` still have review-required windows without harmonic-continuity score-level trace rows, because the local support cleanup did not improve the scored support surface enough to justify adoption. This preserves the rule that `audible-progression` requires generated score support rather than diagnostic optimism.

4. The solver replacement is a support-surface downgrade, not a new hard gate.

   The musical basis stays source-family level. Common-practice fugue episode practice supports using pivot / modulatory episodes as connective material only when bass-root, chord-tone, or motivic support makes the intended progression audible. Fux/species counterpoint supports rejecting repairs that introduce voice crossing or unsupported dissonant texture. The project response remains a soft-cost solver and review-evidence surface, not a CI hard failure.

## Verification

* `pnpm build`
* `pnpm fugematon review --out samples/generator-constraint-rebuild-harmonic-continuity-current/review --ticks 129600`
* Current ScoreEvent JSON generated under `samples/generator-constraint-rebuild-harmonic-continuity-current/scores`
* `node --test packages/core/dist/generate-harmonic-continuity-review.test.js packages/core/dist/generate-harmonic-stasis-rearticulation.test.js`
* 22 seed diagnostics comparison against `samples/generator-constraint-rebuild-next-target/review` over `REPRESENTATIVE_REVIEW_SEEDS` and `ROTATION_REVIEW_SEEDS` at `REVIEW_LENGTH_TICKS`.

Manual listening was not performed. The evidence is enough to downgrade harmonic-continuity support cleanup because the repaired rows are visible in `generatorSearchTrace`, hard failures remain at 0, and the remaining review-required windows are not hidden.

CI follow-up: the short 80-quarter focused harmonic-continuity sentinel now treats `bach-001` as the clean control with 0 focused windows. The remaining focused seeds keep audible-progression windows equal to focused windows, 0 review-required windows, 0 hard failures, and 0 subject-identity violations; score-level trace rows are not required in this short focused slice.
