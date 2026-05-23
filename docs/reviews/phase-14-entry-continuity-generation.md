# Phase 14 Entry Continuity Generation Review

This records the first Phase 14B generator-side entry-continuity repair.

## Finding

The Phase 14A acceptance summary showed that important entries could still be classified as `one-voice-carry-with-outside-reset`: one outside voice carried through the entry, but another outside voice still ended and restarted at the entry boundary. This is better than the old all-voice reset, but it is not real contrapuntal continuity.

Theory basis: Fux/species counterpoint for oblique motion, preparation, and independent support; common-practice fugue source family for entry rhetoric and preserving audible outside-line continuity around subject and answer entries.

## Evidence

Before this repair, the focused one-voice carry counts were:

* `contrary-motion`: 8
* `tight-stretto`: 5
* `circle-fifths`: 1
* `modal-cadence`: 7
* `dense-modal`: 1
* `random-listen-check`: 1
* `seed-0zereox-1v729ih`: 3

After carrying/delaying two outside support voices at all-outside-voice entry resets, all seven counts are 0. The focused review also kept range violations, voice crossings, and unresolved dissonance at 0 for the checked seeds.

Accepted regression-test deltas: the extra carried support slightly changes voice-pair counting because one more outside line now overlaps the entry instead of restarting exactly on the boundary. Phase 5/7 unison ceilings move from 762 to 763, and the exact Phase 7 blocker snapshots update by at most +1 unison overlap while shared-rhythm overlap drops by 7 in the affected seeds. Phase 11/12 aggregate windows also move within the same musical tradeoff: A2 shared rhythm delta 30 to 36, B2 leap-recovery delta 44 to 47, and rotation-A shared rhythm delta 165 to 170. These are accepted because the score symptom being removed is a hard entry-continuity reset, while the new overlaps come from prepared/carried support rather than hidden range, crossing, or unresolved-dissonance failures.

## Project Response

The generator now softens all-outside-voice entry resets by delaying two outside support notes in priority order instead of only one. When a previous note ends exactly at the entry boundary, that previous note is extended into the delay, making the continuity visible in the score rather than relying on playback smoothing.

This is accepted as a generator-side improvement because it removes the concrete score-window symptom without changing the subject entry plan or hiding the remaining dissonance and counter-subject review signals.

## Remaining Work

This does not complete Phase 14B. Entry adjacent-second friction and unresolved accented entry clashes still need candidate construction or scoring responses, and line-agency, counter-subject survival, phrase-development, metric-scope cleanup, and listening evidence remain in later Phase 14 workstreams.

## CI / Review Scope

The one-voice carry review test is `review-required`: it checks the focused seed set and keeps the score-window symptom visible, but it does not promote every individual entry window to a hard CI blocker.
