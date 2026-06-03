# Generator Constraint Rebuild Continuation CSP Review

Status: implementation slice accepted for focused tests and standard review evidence. Manual listening remains open, score-level support cleanup remains fallback evidence, and `constraintSatisfactionReview` remains `review-required`.

## Findings

1. Continuation selection now uses section-CSP evidence before accepting a section.

   `buildContinuationCandidates` adds deterministic `section-csp` variants derived from the existing section-local, grammar, and phrase-family candidate pool. These variants reuse the existing support cleanup surfaces for functional thinning, post-entry continuation support, long-rest phrase closure, bass-answer tail texture support, harmonic-continuity support, and voice-order repair inside section-local candidate construction.

   `chooseContinuationSection` evaluates every continuation candidate with `sectionConstraintProblem: true`. If the current musical-choice winner has `section-voice-coverage` or `structural-harmonic-support` hard failures, the selector first looks for feasible candidates; if all candidates remain infeasible, it deterministically relaxes by hard-failure count, soft cost, and candidate id.

   Theory basis: the source-family policy for local-first finite-domain music constraints supports separating hard coverage/support failures from soft ranking while deferring external solver dependencies.

2. The trace surface now exposes real section-CSP candidate rows.

   Standard review bundle: `samples/generator-constraint-rebuild-continuation-csp`, 22 seeds, 129600 ticks.

   Aggregate trace evidence: 33714 `section-csp` candidate rows; 889 rows had zero hard failures. All standard seeds emitted section-CSP rows. Public events still emitted no `kind: "rest"` events; rests remain internal CSP slots.

   Focused generated seeds also emitted section-CSP rows and preserved hard contracts: `fugue-smoke`, `angular-answer`, `seed-0zereox-1v729ih`, `lyrical-line`, `contrary-answer`, `modal-dorian`, and `seed-0i335vx-1n54a1x` all kept range, voice crossing, subject identity, answer plan, key metadata, and writing-profile pitch failures at 0.

3. CSP counters improved, but the section model is not adoption-ready.

   Compared with the previous section-CSP standard review, the new bundle reduced unsupported-solo tick windows from 1557 to 775, all-voice-silence tick windows from 97 to 6, long-unplanned-silence violations from 656 to 424, structural chord-support misses from 776 to 457, and structural root-support misses from 630 to 568. Unplanned silent runs fell from 1356 to 1207. Min-active-voice violations fell from 2086 to 1940.

   However, all 22 standard seeds still selected `infeasible` as the final CSP relaxation level. The longest unplanned silent run remained 4320 ticks, with `angular-answer`, `tight-stretto`, and `close-imitation` at that maximum in the standard bundle.

4. Score-level support cleanup is still fallback evidence, not retired behavior.

   The standard bundle still emitted 144 score-level support cleanup trace rows across all 22 seeds for the focused support surfaces. This means section-local CSP variants are now part of candidate selection, but they do not yet make the score-level fallback no-op on the standard path.

   Project response: keep the score-level rows as audit fallback. Do not report the support cleanup surfaces as retired until the normal generated bundle shows no-op behavior or failure evidence without adopted score-level repairs.

## Verification

Focused tests:

* `section CSP backtracking prefers a feasible continuation variant over coverage failures`
* `section CSP backtracking chooses deterministic relaxation when every candidate is infeasible`
* `generated continuation exposes section-CSP candidate rows without public rest events`
* Existing section-CSP tests for allowed rest reasons, unsupported solo / long unplanned silent runs, structural root / chord support, and deterministic diagnostics
* Existing score-level support cleanup trace tests

Commands run:

* `pnpm build`
* `pnpm test -- --test-name-pattern "section CSP backtracking|generated continuation exposes section-CSP|score-level support cleanup|section CSP"`
* `pnpm fugematon review --out samples/generator-constraint-rebuild-continuation-csp --ticks 129600`

Standard generated bundle:

* Bundle: `samples/generator-constraint-rebuild-continuation-csp`.
* Scope: 22 standard review seeds, `organ-default` performance profile version 3, `four-voice-default` writing profile version 1, 129600 ticks.
* Hard contract failures: 0 range violations, 0 voice crossings, 0 subject identity violations, 0 answer plan violations, 0 key metadata mismatches, and 0 writing-profile pitch violations.
* CSP aggregate: 671 section windows, 1536 intentional rest spans, 1207 unplanned silent runs, 775 unsupported-solo tick windows, 6 all-voice-silence tick windows, 1940 min-active-voice violations, 424 long-unplanned-silence violations, 457 structural chord-support misses, 568 structural root-support misses, and 68517 deterministic local candidate-count units.
* Relaxation: 22 / 22 seeds selected `infeasible`.

Focused seed notes:

| Seed | Relaxation | Unsupported solo | Max unplanned silence | Structural chord misses | Structural root misses | Section-CSP rows |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| `fugue-smoke` | `infeasible` | 33 | 2880 | 7 | 28 | 1718 |
| `angular-answer` | `infeasible` | 72 | 4320 | 37 | 27 | 1354 |
| `seed-0zereox-1v729ih` | `infeasible` | 62 | 4320 | 28 | 27 | 1294 |
| `lyrical-line` | `infeasible` | 77 | 2880 | 34 | 29 | 1522 |
| `contrary-answer` | `infeasible` | 34 | 3360 | 16 | 26 | 1524 |
| `modal-dorian` | `infeasible` | 33 | 3360 | 8 | 30 | 1726 |
| `seed-0i335vx-1n54a1x` | `infeasible` | 36 | 2880 | 5 | 26 | 1718 |

## Musical Classification

Structural hypothesis: the new variants reduce obvious unsupported collapse and anchor-support misses, especially all-voice silence and unsupported solo exposure, but the continuation planner still often leaves a section with too few active voices or with weak low-voice root support at structural anchors. This is no longer just an evaluator problem; the solver path now exposes alternate candidate evidence, but the candidate domains are still too narrow or too weakly connected to section function.

Remaining infeasible windows should be classified in the next slice as cadence breath, entry handoff, pedal thinning, section-local support gap, or true unsupported collapse. The current data supports keeping the CSP model as planner pressure, not promoting it to a CI hard gate.

## CI / Review Scope

`constraintSatisfactionReview` remains `review-required`. The improvement is meaningful but incomplete: all standard seeds still reach infeasible relaxation, and score-level support cleanup still adopts repairs in the normal path. CI promotion waits for lower false-positive risk, no-op score-level fallback evidence, and score-window classification for remaining infeasible windows.

## Remaining Gaps

No manual listening pass was run. The next implementation should expand section-local candidate domains for cadence breath, entry handoff, pedal thinning, and structural bass/root support, then rerun the standard bundle and the focused seeds above.
