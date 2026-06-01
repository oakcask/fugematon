# Endless Program Coda Quality Repair

This plan follows [Endless program terminal coda historical style repair](endless-program-terminal-coda-historical-style-repair.md) and the review gap in [Endless Program Coda Quality Gap Review](../reviews/endless-program-coda-quality-gap-review.md).

## Goal

Improve `endless-program` terminal codas from structurally stable endings into review-visible historical closing processes. Stable final sonority remains required, but accepted generated codas should also expose final-subject, pedal-supported, stretto-combination, liquidation, or cadential-echo function before the landing.

Source-family basis: `historical-fugue-endings`, `historical-terminal-cadences`, and claim `endless-program-coda-continuity` in [../reference/bibliography/claim-map.md](../reference/bibliography/claim-map.md).

## Scope

* Rebalance terminal archetype selection so `final-fragment-entry` and `pedal-entry-cadence` are reachable under structural conditions.
* Keep `stretto-compaction` for actual recent stretto, repeated recent stretto, or high contour energy instead of making it the generic dense-coda fallback.
* Preserve sparse `cadential-echo` as review-visible coda rhetoric, with listening review still required for lightweight short echoes.
* Extend `terminalClosureReview.codaContinuity` to schema version 2 with subject-derived note count, pedal root coverage ratio, and historical function coverage.
* Keep short `endless-program`, `continuous-fugue`, `regenerative-cycle`, and modal-cadence boundaries unchanged.

## Implementation Notes

The coda builder now chooses `pedal-entry-cadence` for explicit pedal evidence or medium-density authentic/modal terminal cadences when stretto is not preferred. It chooses `final-fragment-entry` after subject-return context with a usable subject stem. `stretto-compaction` remains available, but only when recent section state or contour energy supports overlapped entries.

Terminal coda notes now preserve explicit motivic derivation through the later episode-motivic annotation pass, so selected archetypes remain visible in score events and diagnostics. Modal pedal codas include a modal characteristic tone in the upper-voice cadence support instead of turning the close into a tonal cadence.

## Completion Evidence

Implemented and verified against the 22 standard coda review seeds at `30720` ticks in `endless-program`.

| Evidence | Result |
| --- | --- |
| Accepted terminal closure | 22 / 22 |
| Generated coda source | 22 / 22 |
| Unresolved boundary dissonance | 0 |
| Final-attack re-entry voices | 0 |
| `stretto-compaction` | 11 / 22 |
| `final-fragment-entry` | 4 / 22 |
| `pedal-entry-cadence` | 2 / 22 |
| `cadential-echo` | 5 / 22 |
| Seeds with subject-derived coda notes | 17 / 22 |

Controls remain stable: short `endless-program` uses `fallback-terminal-closure`, `continuous-fugue` reports terminal closure as `not-required`, `regenerative-cycle` remains `bridge-compatible-closure`, and modal focused seeds keep modal terminal cadence rhetoric.

## Remaining Gap

Archetype diversity and sparse-echo rhetorical weight remain `review-required`, not CI hard gates. Human listening was not performed in this pass; the after-pass only confirms score-event and diagnostic evidence.
