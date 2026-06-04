# Generator Constraint Rebuild Continuation-Local Solver Review

Status: accepted for the current target. Manual listening remains open.

## Scope

This review covers the `continuous-fugue` segment-continuation solver trace slice. The target was to add continuation-local deterministic candidate evidence for hidden segment boundaries, without changing the normal generated score surface or hiding weak carry / hard-restart boundary evidence.

The review compares the TARGET baseline bundle in `samples/generator-constraint-rebuild-continuation-target` with the regenerated current bundle in `samples/generator-constraint-rebuild-continuation-current`.

## Findings

The normal 22 seed path is stable against the TARGET baseline:

* ScoreEvent JSON matches for all 22 seeds.
* Review-policy hard failures remain 0.
* Review-policy hard-constraint failures remain 0.
* Adoption-ready seeds remain 22 / 22.
* Baseline beauty passed seeds remain 15 / 22.
* Quality-vector status remains `quality-review-required`.
* Local sentinel count remains 13.
* Reference-profile outside seeds remain 3.
* Aggregate entry-support instability remains 1856.
* Aggregate unresolved severe entry interval count remains 884.
* Aggregate severe entry interval count remains 1130.
* Unsupported solo runs and abrupt texture drops remain 0.

The normal path also preserves the existing trace evidence:

| Bundle | Solver seeds | Evaluated candidates | Exposition rows | Section rows | Score rows | Segment rows |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| TARGET baseline | 22 | 911 | 44 | 671 | 196 | 0 |
| Current normal path | 22 | 911 | 44 | 671 | 196 | 0 |

The focused `continuous-fugue` segment 1 bundle now exposes hidden-boundary candidate evidence:

* 22 / 22 segment 1 seeds use `generatorSearchTrace.mode = solver`.
* 22 / 22 segment 1 seeds emit at least one `segment-1-boundary-continuation-*` row.
* Segment-boundary rows total 23: 21 adopted `candidate-0` rows, plus one before / after pair for a repaired boundary.
* All segment-boundary rows have `hardFailures` arrays, `hardFailureCount = 0`, and numeric soft costs.
* Stable ids observed: `segment-1-boundary-continuation-candidate-0`, `segment-1-boundary-continuation-unrepaired-evidence`, and `segment-1-boundary-continuation-solver-repaired`.
* Continuity classifications are 14 `developmental-episode` and 8 `prepared-subject-return`; no seed restarts as `exposition`.
* Boundary carry classifications are 7 `carried-line-continuation` and 15 `prepared-reentry`; no seed remains `generator-response-required-hard-restart`.
* Hard-contract failure total remains 0; voice crossings, all-voice silence gaps, and fallback passages remain 0 in the focused segment 1 bundle.

The generated boundary summaries expose the target dimensions even when a dimension has zero soft cost in the selected row: carried / resolving voices, pedal voices, staggered voices, restarted voices, first-attack density, role mix, and prior-tail harmonic continuity are present in `continuousBoundaryCarry`. Positive segment-boundary soft-cost reasons appeared for carry, staggered re-entry, prior-tail harmonic support, and hard-restart risk in the focused bundle. Pedal support, first-attack density, and role mix were represented in the boundary summary but did not incur positive costs in this seed set.

Representative boundary evidence:

| Seed | First state | Form continuity | Carry classification | Segment candidate evidence |
| --- | --- | --- | --- | --- |
| `fugue-smoke` | `episode` | `developmental-episode` | `carried-line-continuation` | `candidate-0`, hard failures 0, soft cost 67.028, prior-tail support cost |
| `tight-stretto` | `episode` | `developmental-episode` | `prepared-reentry` | `candidate-0`, hard failures 0, soft cost 58.5, staggered re-entry cost |
| `restless-line` | `subject-return` | `prepared-subject-return` | `carried-line-continuation` | unrepaired hard-restart-risk evidence rejected; solver-repaired row selected, both with hard failures 0 |

## Musical Review

The change satisfies the musical target because hidden continuous-fugue boundaries are no longer represented only by diagnostics after the score is built. Segment 1 starts with continuation material, and the solver trace now shows whether the boundary was accepted as audible carry, prepared re-entry, or repaired from weaker hard-restart evidence.

The theory basis is the same as the previous continuous-fugue reviews: a hidden boundary may be a generation boundary, but it should not read as a new exposition unless the planner explicitly marks a later formal re-exposition. Carry, suspension or resolution, pedal support, staggered support, and role-visible first attacks are acceptable ways to prepare a boundary; an all-voice dense restart after a thin tail remains generator-response evidence.

## CI / Review Scope

`continuousBoundaryCarry` and segment-boundary candidate rows remain `review-required`. The generated evidence is stable enough for the current target, but it is still a review surface rather than a CI hard gate because false positives around emphatic prepared returns need more listening evidence.

## Remaining Gaps

No human listening pass was performed. The acceptance is based on ScoreEvent JSON equality for the normal path, diagnostics, trace rows, and score-window musical inspection.
