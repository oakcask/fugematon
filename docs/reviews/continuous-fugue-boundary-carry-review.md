# Continuous Fugue Boundary Carry Review

This review covers the `continuous-fugue` hidden boundary after audible boundary-carry diagnostics and repair were added. It does not change `endless-program` terminal coda or audible-boundary behavior.

## Findings

Reported focused seed `seed-1f6nfdt-0sv4of6`: segment 1 still starts as `prepared-subject-return` from a carried snapshot, not exposition. The new `continuousBoundaryCarry` summary classifies the hidden boundary as `prepared-reentry`: the previous tail has one sounding voice near the boundary, a 480 tick all-voice gap, first attack density 4, and bass pedal support at the segment start. Hard constraints stay visible and remain 0 for range violations, voice crossings, subject identity violations, answer plan violations, and all-voice silence gaps.

Control seeds:

* `bach-001`: `carried-line-continuation`, with alto carry, bass pedal support, and staggered soprano / tenor support.
* `tight-stretto`: `prepared-reentry`, with the previous thin tail no longer reported as `generator-response-required-hard-restart`; soprano and bass support are staggered.
* `modal-cadence`: `prepared-reentry`, with bass pedal support.
* `sparse-cadence`: `prepared-reentry`, while the first section remains `developmental-episode` rather than a forced subject return.

Theory basis: a hidden boundary may support a strong subject return, but the listener should hear line agency, pedal support, suspension/resolution, staged re-entry, or a clear prepared break. The implemented repair treats the reported symptom as a score-continuity problem, not playback smoothing, silence insertion, or UI masking.

## Project Response

`continuousBoundaryCarry` separates audible carry from `continuousSegmentContinuity`. It records previous sounding voice count, per-voice last end and first start, all-voice boundary gap, carried / resolving / pedal / staggered / restarted voices, prior tail harmonic-continuity classification, first attack density, role mix, and a review classification.

The generator now repairs thin-tail hidden boundaries for `continuous-fugue` segment 1 and later by preserving a structurally chosen support line and staggering support attacks before an emphatic return. The repair uses previous tail events, cadence preparation, density, first-section state, and entry role; it is not keyed to a seed, voice name, pitch, key, or measure.

## CI / Review Scope

`continuousBoundaryCarry` is `review-required`. The reported seed and focused controls are regression evidence for review bundles, not permanent CI blockers until false positives are better known.

Manual listening remains incomplete. Current acceptance is based on ScoreEvent diagnostics and agent-side musical review across the focused seed set.

## Revalidation 2026-06-01

Regenerated the major 22-seed review bundle with `pnpm fugematon review --out samples/continuous-fugue-boundary-carry-current/review-22 --ticks 129600 --performance-profile organ-default` and compared it with the TARGET baseline bundle. The review-policy totals are unchanged: 22 seeds, 0 hard failures, 0 hard-constraint failures, 9 review-required signals, and 22 adoption-ready seeds. No seed-level review-policy metric changed.

Regenerated the focused `continuous-fugue` segment bundle by generating segment 0, then generating segment 1 from segment 0 `nextSegmentSnapshot` with mode `continuous-fugue`. Compared with the TARGET focused bundle, segment-continuity classifications are preserved while the current diagnostics expose the new audible-carry surface:

* `seed-1f6nfdt-0sv4of6`: remains `prepared-subject-return`; current audible carry is `prepared-reentry` with bass pedal support, one near-boundary sounding voice, a 480 tick all-voice gap, and 0 hard-constraint failures.
* `bach-001`: remains `prepared-subject-return`; current audible carry is `carried-line-continuation` with alto carry / resolution, bass pedal support, staggered soprano / tenor support, no all-voice gap, and 0 hard-constraint failures.
* `tight-stretto`: remains `prepared-subject-return`; current audible carry is `prepared-reentry` with staggered soprano / bass support and 0 hard-constraint failures.
* `modal-cadence`: remains `prepared-subject-return`; current audible carry is `prepared-reentry` with bass pedal support, no all-voice gap, and 0 hard-constraint failures.
* `sparse-cadence`: remains `developmental-episode`; current audible carry is `prepared-reentry` with bass pedal support, no all-voice gap, and 0 hard-constraint failures.

Finding: the target completion conditions are satisfied by generated score-event and diagnostics evidence. Segment 1 keeps carried-snapshot form continuity, audible boundary carry is now diagnosed separately from form continuity, the reported seed no longer presents an unexplained thin-tail all-voice hard restart, prepared strong returns remain allowed in focused controls, and hard constraints remain visible. Manual listening remains the only open review gap.
