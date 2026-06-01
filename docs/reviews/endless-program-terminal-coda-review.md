# Endless Program Terminal Coda Review

This review records the completion evidence for planner-visible terminal coda generation in `endless-program`.

Update: the historical style repair extends this evidence from generated coda existence to coda continuity. `TerminalClosureReviewSummary` schema version 3 now records context-aware coda archetype selection and pre-cadence derivation evidence so stable final sonority cannot hide all-voice static coda preparation.

## Findings

The previous terminal-boundary sonority repair was stable but too short as phrase form. It could make the final chord acceptable while still letting resting voices reappear only at the last attack. The implemented repair reserves a terminal section with `terminalIntent: "self-contained-coda"` for `endless-program`, generates cadence preparation before the final sonority, and keeps `applyTerminalClosureIntent` as a fallback rather than the normal success path.

Theory basis: fugue and common-practice cadence source families treat a full final texture as acceptable when it is prepared by cadence function, bass/root support, or phrase liquidation. Modal source-family policy still applies: modal seeds keep modal cadence labels and are not forced into tonal authentic-cadence semantics.

## Focused Evidence

Focused generation used `mode: "endless-program"` and `lengthTicks: 129600` for `fugue-smoke`, `modal-cadence`, `sparse-cadence`, `dense-modal`, `tight-stretto`, `circle-fifths`, `bach-001`, and `minor-entry`.

The TARGET baseline artifacts for the same seeds already had stable terminal sonority metrics: all 8 seeds reported accepted terminal closure, root-supported low voice, stable outer-voice landing, and 0 unresolved boundary dissonances. They did not satisfy the coda target because `TerminalClosureReviewSummary` was schema version 1, no focused seed had a `self-contained-coda` section, and the review surface did not expose coda source, prepared voice re-entry, or final-attack re-entry counts. The last section remained ordinary continuation material such as `episode`, `subject-return`, or `stretto-like`, so the baseline could prove final-chord stability but not phrase-level coda generation.

All 8 seeds produced:

* `terminalClosureReview.classification: "accepted"`;
* `terminalClosureReview.terminalClosureSource: "generated-coda"`;
* `terminalClosureReview.preparedVoiceReentry: "prepared"`;
* `terminalClosureReview.finalAttackReentryVoiceCount: 0`;
* `lowVoiceSupport: "root-supported"`;
* `outerVoiceLandingStatus: "stable"`;
* `unresolvedBoundaryDissonanceCount: 0`;
* `allVoiceSilenceGapCount: 0`;
* `subjectIdentityViolations: 0`;
* `answerPlanViolations: 0`;
* `rangeViolations: 0`;
* `voiceCrossings: 0`.

The coda duration is two meter-aware measures or more. The 4/4 focused seeds reserve 10 quarter-note beats because the requested segment length falls between measure downbeats; `tight-stretto` is in 3/4 and reserves 6 quarter-note beats.

Current regenerated score evidence places coda voice starts before the final attack. In the 4/4 focused seeds, bass starts at coda start, tenor one beat later, alto two beats later, and soprano three beats later before the terminal sonority. In `tight-stretto`, bass starts at coda start, tenor one beat later, and alto / soprano before the final attack. This removes the TARGET symptom where final closure could be accepted without proving prepared voice return.

## Historical Style Repair Evidence

The follow-up repair replaces the fixed preparation-degree recipe with context-aware archetypes selected from the recent score and section context. The planner-visible `terminalCodaContext` records recent state sequence, recent subject stem, rhythmic cell, texture density, contour energy, local mode, cadence kind, and whether a pedal is implied. The generator then chooses from `final-fragment-entry`, `stretto-compaction`, `pedal-entry-cadence`, `liquidation-cadence`, and `cadential-echo`.

Focused generation for `fugue-smoke`, `modal-cadence`, `sparse-cadence`, `dense-modal`, `tight-stretto`, `circle-fifths`, `bach-001`, and `minor-entry` now reports:

* `terminalClosureReview.schemaVersion: 3`;
* `terminalClosureReview.codaContinuity.classification: "accepted"`;
* selected coda archetypes including `stretto-compaction`, `cadential-echo`, and `liquidation-cadence`;
* nonzero `derivationCount` before the cadence target;
* at least one moving voice before the terminal landing;
* root-supported, stable terminal closure with 0 unresolved boundary dissonances.

The diagnostic control case is a synthetic generated coda with stable final sonority but all voices sustained as generic long tones. It is `review-required` through `codaContinuity`, proving that the final chord acceptance surface no longer hides style-disconnected coda material.

Theory basis: the source-family claim remains `historical-fugue-endings` mapped through `endless-program-coda-continuity`. The repair treats final subject fragments, stretto-like compaction, pedal support, liquidation, and cadential echo as functional ending processes rather than universal Bach-style requirements. No metric regression was accepted as a musical tradeoff in the focused review; remaining release timing and cadence rhetoric concerns require listening review.

## Completion Refresh

The target completion review regenerated the TARGET focused seeds at `30720` ticks in `endless-program`, `segmentIndex: 1`, with the short fallback control at `3840` ticks, and compared them with the TARGET baseline artifacts. The baseline was already cadence-stable but had `TerminalClosureReviewSummary` schema version 2 and no `terminalCodaContext` or `codaContinuity` surface. The refreshed output uses schema version 3 for every seed, preserving accepted terminal closure while exposing continuity evidence.

| Seed | Baseline pre-cadence coda notes | Current pre-cadence coda notes | Current archetype | Derivations | Moving voices | Hard failures |
| --- | ---: | ---: | --- | ---: | ---: | ---: |
| `fugue-smoke` | 8 | 20 | `liquidation-cadence` | 20 | 4 | 0 |
| `modal-cadence` | 8 | 22 | `stretto-compaction` | 22 | 4 | 0 |
| `sparse-cadence` | 8 | 22 | `stretto-compaction` | 22 | 4 | 0 |
| `dense-modal` | 8 | 22 | `stretto-compaction` | 22 | 4 | 0 |
| `tight-stretto` | 8 | 10 | `cadential-echo` | 10 | 4 | 0 |
| `circle-fifths` | 8 | 22 | `stretto-compaction` | 22 | 4 | 0 |
| `bach-001` | 8 | 22 | `stretto-compaction` | 22 | 4 | 0 |
| `minor-entry` | 8 | 22 | `stretto-compaction` | 22 | 4 | 0 |

The comparison supports completion: the coda is no longer only the fixed two-note preparation pattern before a stable final chord. Current codas add context-selected terminal process, keep at least one moving voice before the landing, and record recent-material or cadence-function derivation evidence. The short control remains `fallback-terminal-closure` with `codaContinuity.classification: "not-applicable"`, which preserves the planned fallback boundary rather than forcing a full coda into insufficient time.

## Mode Boundaries

`continuous-fugue` remains separate: the focused control reports `terminalClosureReview.classification: "not-required"`, `terminalClosureSource: "not-required"`, and has no self-contained coda section.

`regenerative-cycle` remains bridge-compatible rather than collapsed into `endless-program`: the focused control reports accepted terminal closure with `terminalClosureSource: "bridge-compatible-closure"` and has no self-contained coda section.

## CI / Review Scope

Touched metric: `terminalClosureReview`.

Scope classification: `review-required`.

Reason: generated coda source, prepared voice re-entry, final-attack re-entry counts, and coda-continuity metrics are deterministic score-window signals, but they are phrase-quality evidence rather than a complete listening-quality gate. They should remain visible in worker and UI snapshots before any later promotion to CI-blocking.

Human listening remains a gap. The score-window review confirms that the reported structural symptom no longer appears in the focused seed set, but it does not replace listening review of cadence rhetoric, release timing, or long-run fatigue.

## Verification

* `pnpm --filter @fugematon/core build`
* `node packages/core/dist/generate-terminal-closure-review.test.js`
* `node packages/core/dist/public-contract.integration.test.js`
* `node --test --test-timeout=240000 packages/core/dist/generate-terminal-closure-review.test.js packages/core/dist/public-contract.integration.test.js`
* `pnpm test`
