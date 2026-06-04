# Generator Constraint Rebuild Entry Support Review

This review covers implementation order item 4 in [Generator Constraint Rebuild](../phases/generator-constraint-rebuild.md).

## Findings

1. Entry-local support is now part of candidate ranking.

   The constraint-core soft cost includes unresolved entry-support instability, and continuation candidate scoring adds the same unresolved support pressure to entry-harmony cost. Counter-subject and free-counterpoint support notes also use entry-local pitch checks when the support-repair candidate path is active.

2. Prepared and passing dissonance is separated from unresolved support instability.

   Entry diagnostics and quality-vector entry severe windows now distinguish carried suspension-like support, weak passing / neighbor support, and stepwise release from unresolved severe entry friction. The quality-vector local sentinel remains for full-beat or mixed unresolved evidence; isolated half-beat friction stays in duration axes instead of becoming a local sentinel.

3. The 22 seed target bundle improves without hard-contract regressions.

   Review command: `pnpm fugematon review --out samples/generator-constraint-rebuild-entry-support-final --ticks 129600`.

   | Metric | Baseline | Final |
   | --- | ---: | ---: |
   | Review-policy hard failures | 0 | 0 |
   | Diagnostics warnings | 53 | 54 |
   | `entrySupportInstabilityCount` | 2282 | 1854 |
   | `unresolvedEntrySupportInstabilityCount` | 1935 | 1493 |
   | `severeEntryIntervalCount` | 1725 | 1131 |
   | `unresolvedSevereEntryIntervalCount` | 1360 | 886 |
   | `unresolved-entry-severe-interval` local sentinels | 117 | 11 |

   The extra warning is a review-policy warning, not a hard-contract failure. The quality-vector entry severe axis improves at median and max but has a slightly higher p90: 1.5 / 2.375 / 3.063 -> 1.438 / 2.5 / 3.0. The unresolved entry severe duration axis has lower aggregate count and far fewer local sentinels, while the normalized seed spread remains review-visible: median / p90 / max / outside seeds move 0.125 / 2.375 / 2.875 / 5 -> 0.375 / 2.375 / 3.0 / 6. This is accepted as a diagnostics-classification tradeoff because unresolved severe checkpoint count and local sentinel count both improve materially.

4. High-risk seeds still show max 4 in some local counters, but the remaining important-entry cases are continuity-classified.

   `modal-dorian`, `bach-001`, `modal-answer`, and `minor-entry` all improve aggregate entry support and unresolved severe intervals. Their remaining max-4 windows are mostly subject-fragment episode entries. Remaining important subject / answer windows in the inspected diagnostics are classified as `prepared-collective-articulation` or `continuity-supported`, with delayed or staggered outside voices rather than unexplained all-voice reset.

## Seed Notes

| Seed | Entry support | Unresolved support | Unresolved severe | Remaining max-4 explanation |
| --- | ---: | ---: | ---: | --- |
| `modal-dorian` | 132 -> 108 | 118 -> 80 | 83 -> 43 | Subject-return and stretto-like windows show delayed / staggered outside voices; subject-fragment episode windows remain future solver work. |
| `bach-001` | 131 -> 110 | 112 -> 87 | 87 -> 57 | Subject-return and stretto-like windows are prepared collective or continuity-supported; subject-fragment episode windows remain future solver work. |
| `modal-answer` | 119 -> 100 | 109 -> 91 | 81 -> 48 | Subject-return windows show prepared collective articulation; subject-fragment episode windows remain future solver work. |
| `minor-entry` | 113 -> 94 | 104 -> 85 | 75 -> 47 | The remaining max-4 sample is a subject-fragment episode entry, outside the important subject / answer entry-support target. |

## Music-Theory Basis

Theory basis remains source-family level: Fux/species counterpoint for prepared dissonance, suspension and stepwise resolution, plus common-practice fugue expectations for carried or staggered outside voices around subject / answer entries. This slice keeps those as soft ranking and diagnostic classification, not new hard failures.

## Remaining Review Gaps

Manual listening was not performed. Episode subject-fragment entry support still needs the later episode / free-counterpoint solver slice rather than broader entry-support reclassification.
