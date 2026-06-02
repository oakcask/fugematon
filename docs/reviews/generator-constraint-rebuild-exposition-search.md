# Generator Constraint Rebuild Exposition Search Review

This review covers the first bounded solver adoption for implementation order item 3 in [Generator Constraint Rebuild](../phases/generator-constraint-rebuild.md).

## Findings

1. Non-continuation initial generation now reports solver-mode exposition search.

   The TARGET baseline recorded all 22 seeds as diagnostics-only single-candidate traces: `generatorSearchTrace.mode` was `diagnostics-only`, `evaluatedCandidateCount` was `1`, and `selectedCandidateId` was `legacy-generated-score`.

   A regenerated 22 seed review bundle with `pnpm fugematon review --out samples/generator-constraint-rebuild-target-current-review --ticks 129600` shows every seed with `generatorSearchTrace.mode` as `solver`, `evaluatedCandidateCount` as `2`, and a selected id from the exposition candidate set rather than `legacy-generated-score`.

2. Current-contract hard failures remain absent.

   The same 22 seed bundle has review-policy hard constraint failures at 0 for every seed, 22 / 22 adoption-ready seeds, 12 review signals, and 53 diagnostics warnings. Both exposition candidates in every checked diagnostics file have no hard failure codes, so selection is driven by soft cost and candidate id.

3. Soft-cost movement is traceable ranking evidence, not a hidden hard gate.

   The selected candidate is `exposition-a-current-contract` when soft costs tie or favor the current contract candidate. `exposition-b-counter-subject-repair` is selected when its exposition-local soft cost is lower. Across the 22 seeds, the current-contract candidate was selected 11 times and the counter-subject-repair candidate was selected 11 times. The candidate trace records each candidate id, hard failures, selected id, rejected count, and soft cost.

## Main Seed Comparison

| Seed | TARGET trace | Current trace | Current selected candidate | Candidate soft costs | Hard failures |
| --- | --- | --- | --- | --- | --- |
| `bach-001` | diagnostics-only / 1 / `legacy-generated-score` | solver / 2 / rejected 0 | `exposition-a-current-contract` | `exposition-a-current-contract`: 13; `exposition-b-counter-subject-repair`: 14 | 0 |
| `fugue-smoke` | diagnostics-only / 1 / `legacy-generated-score` | solver / 2 / rejected 0 | `exposition-b-counter-subject-repair` | `exposition-a-current-contract`: 13; `exposition-b-counter-subject-repair`: 12 | 0 |
| `minor-entry` | diagnostics-only / 1 / `legacy-generated-score` | solver / 2 / rejected 0 | `exposition-a-current-contract` | `exposition-a-current-contract`: 14; `exposition-b-counter-subject-repair`: 14 | 0 |
| `wide-key` | diagnostics-only / 1 / `legacy-generated-score` | solver / 2 / rejected 0 | `exposition-a-current-contract` | `exposition-a-current-contract`: 17; `exposition-b-counter-subject-repair`: 17 | 0 |

## Acceptance Check

The implementation meets the target for this bounded slice. Public schema and seed determinism are covered by integration tests, non-continuation generation now emits real exposition candidate ids, selected candidates preserve subject identity, answer plan, key metadata, and `WritingProfile` pitch contracts through the current-contract evaluator, and soft-cost movement is exposed as ranking evidence rather than a new hidden hard gate.

## Music-Theory Basis

Theory basis remains the source-family guidance already recorded in the phase plan: Fux/species counterpoint for consonance and voice independence, common-practice fugue expectations for subject and answer recognizability, and keyboard compass constraints through the active `WritingProfile`. This slice does not promote new musical preferences into hard gates.

## Remaining Review Gaps

Manual listening was not performed. Episode, entry-support, terminal-support, and free-counterpoint spans remain later solver boundaries.
