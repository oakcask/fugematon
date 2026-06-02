# Generator Constraint Rebuild Support Cleanup Trace Review

This review covers the score-level support cleanup trace slice in [Generator Constraint Rebuild](../phases/generator-constraint-rebuild.md). It is an evidence-surface change, not a new hard quality gate.

## Findings

1. Score-level support cleanup now uses explicit candidate adoption.
   The score-level adoption loop snapshots the unrepaired score, builds one focused repaired candidate, evaluates both drafts with the constraint core, rejects hard-failure regressions, and then adopts the repaired notes. The emitted ids are `score-<surface>-unrepaired-final-repair-evidence` and `score-<surface>-solver-repaired`, matching the existing harmonic-continuity and harmonic-stasis trace pattern.

2. The focused 22 seed check exposes entry / texture support cleanup without claiming the support surface is solved.
   The 129600 tick review showed paired repaired rows for `functional-thinning-support`, `bass-answer-tail-texture-support`, and `long-rest-phrase-closure` in all 22 seeds, plus `post-entry-continuation-support` in 9 seeds. `texture-voice-crossing-repair` had no score delta in this bundle, so it emitted no row. The remaining review-required windows stay represented by diagnostics and the unrepaired trace rows.

3. The theory basis remains review-level counterpoint evidence.
   Fux/species counterpoint treats crossing, unsupported dissonance, and unresolved entry-local seconds / sevenths as costs, while fugue episode practice allows functional thinning and continuation support when the line has harmonic or contrapuntal purpose. This slice records before / after evidence for those support costs rather than making them new hard failures.

## Metrics Comparison

The regenerated review bundle preserves the target score and metric surface while adding solver evidence rows. All 22 regenerated MIDIs match the target bundle, and the target per-seed metrics for entry support instability, unresolved severe entry intervals, and harmonic-continuity review-required windows have zero delta.

| Metric | Target baseline | Current |
| --- | ---: | ---: |
| Seeds | 22 | 22 |
| Review-policy hard failures | 0 | 0 |
| Review-policy hard constraint failures | 0 | 0 |
| Adoption-ready seeds | 22 | 22 |
| Reference-profile outside seeds | 3 | 3 |
| Reference-profile max distance | 0.033 | 0.033 |
| Unsupported solo runs | 0 | 0 |
| Abrupt texture drops | 0 | 0 |
| Entry support instability count | 1856 | 1856 |
| Severe entry interval count | 1130 | 1130 |
| Unresolved severe entry interval count | 884 | 884 |
| Harmonic-continuity focused windows | 239 | 239 |
| Harmonic-continuity review-required windows | 36 | 36 |
| Harmonic-continuity audible-progression windows | 203 | 203 |
| Harmonic-continuity solver trace seeds | 13 | 13 |
| Harmonic-stasis solver trace seeds | 10 | 10 |

## Trace Coverage

| Score-level surface | Seeds with paired rows |
| --- | ---: |
| `functional-thinning-support` | 22 |
| `post-entry-continuation-support` | 9 |
| `long-rest-phrase-closure` | 22 |
| `bass-answer-tail-texture-support` | 22 |
| `texture-voice-crossing-repair` | 0 |

## Verification

* `pnpm build`
* `pnpm fugematon review --out samples/generator-constraint-rebuild-current-review/review --ticks 129600`
* Generated matching score-event JSON for the 22 target seeds under `samples/generator-constraint-rebuild-current-review/scores`
* `node --test packages/core/dist/generate-harmonic-continuity-review.test.js packages/core/dist/generate-harmonic-stasis-rearticulation.test.js packages/core/dist/generate-post-entry-thin-support-review.test.js`
* Focused 22 seed comparison against the target bundle
* Refreshed implementation check: the regenerated 22 seed metrics and trace coverage still match this table, and all 22 ScoreEvent JSON files exactly match `samples/generator-constraint-rebuild-next-target/scores`
* Target completion check: regenerated `samples/generator-constraint-rebuild-target-completion/review` and `samples/generator-constraint-rebuild-target-completion/scores` at 129600 ticks; both directories match the target baseline, with no ScoreEvent structural diffs.

Manual listening was not performed.
