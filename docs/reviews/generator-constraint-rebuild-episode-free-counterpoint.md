# Generator Constraint Rebuild Episode Free-Counterpoint Review

This review covers implementation order item 5 in [Generator Constraint Rebuild](../phases/generator-constraint-rebuild.md).

## Findings

1. Episode and free-counterpoint behavior is now explained by section-local candidate ids.

   Review command: `pnpm fugematon review --out samples/generator-constraint-rebuild-target/episode-free-counterpoint-current/review --ticks 129600 --performance-profile organ-default`.

   ScoreEvent JSON command: `pnpm fugematon generate --seed <seed> --ticks 129600 --out samples/generator-constraint-rebuild-target/episode-free-counterpoint-current/scores/<seed>.score.json`.

   Across the 22 target seeds, `generatorSearchTrace` stayed in solver mode and emitted 671 section-local candidate rows. Every section-local row used a real `section-<tick>-<state>-<band>-candidate-<index>` id and included episode / free-counterpoint soft-cost reasons. The reason coverage was:

   | Reason family | Rows |
   | --- | ---: |
   | `episode-motivic-derivation` | 671 |
   | `episode-cadence-entry-preparation` | 589 |
   | `free-counterpoint-independent-contour-rhythm` | 671 |
   | `free-counterpoint-clash-resolution` | 254 |
   | `free-counterpoint-harmony-realization` | 54 |
   | `free-counterpoint-entry-handoff-support` | 24 |

2. The 22 seed target bundle keeps hard failures at 0 while adding structural window evidence.

   | Metric | TARGET baseline | Current |
   | --- | ---: | ---: |
   | Seed count | 22 | 22 |
   | Length ticks | 129600 | 129600 |
   | Review-policy hard failures | 0 | 0 |
   | Hard-contract failures | 0 | 0 |
   | `entrySupportInstabilityCount` | 1854 | 1856 |
   | `unresolvedEntrySupportInstabilityCount` | 1493 | 1492 |
   | `severeEntryIntervalCount` | 1131 | 1130 |
   | `unresolvedSevereEntryIntervalCount` | 886 | 884 |
   | `unsupportedSoloRunCount` | 0 | 0 |

   The small aggregate entry-support count increase is not used as the adoption reason. The target is accepted because subject-fragment support is now structurally classified, severe entry friction is still review-visible, and hard failures remain absent.

3. Representative windows classify the target symptoms instead of relying on aggregate metrics.

   Aggregate `scoreWindowAcceptance` counters across the 22 seeds now include 915 important-entry windows, 239 harmonic-continuity windows, 388 harmonic-stasis rearticulation windows, 1056 dissonance windows, 3032 accepted-context windows, 2291 review-required windows, and 810 generator-response windows.

   Representative examples:

   | Concern | Seed / tick | Classification | Response |
   | --- | --- | --- | --- |
   | Subject-fragment episode entry support | `fugue-smoke` / 16800 | prepared collective articulation | accepted context |
   | Free-counterpoint solo / thinning | `angular-answer` / 15360 | cadential preparation | accepted context |
   | Harmonic stasis rearticulation | `bach-001` / 11760 | accepted context | accepted context |
   | Harmonic stasis rearticulation | `angular-answer` / 8640 | review required | review required |
   | Harmonic continuity | `angular-answer` / 7200 | audible progression | accepted context |
   | Harmonic continuity | `angular-answer` / 34560 | review required | generator response |
   | Entry severe interval | `angular-answer` / 40320 | unresolved accented entry clash | review required |

4. The remaining review signals are visible, not hidden by the solver slice.

   Subject-fragment episode entries in the inspected high-risk seeds are classified as prepared collective articulation or continuity-supported context, with unsupported entry-local thinning at 0 in the checked windows. Harmonic stasis and entry-severe windows still emit review-required evidence where the musical symptom remains, so terminal-support and repair-pass downgrade work should stay in implementation order item 6.

## Music-Theory Basis

Theory basis remains source-family level. Fux/species counterpoint supports the distinction between prepared or resolving dissonance and unresolved entry friction. Common-practice fugue episode expectations support motivic derivation, sequence, imitation, inversion, cadence preparation, and entry handoff as local evidence that a subject-free span is functioning as episode rather than filler. These are solver soft costs and review classifications, not new hard gates.

## Remaining Review Gaps

Manual listening was not performed. Terminal-support and repair-pass downgrade work remain open until the corresponding solver guarantee directly replaces each repair pass.
