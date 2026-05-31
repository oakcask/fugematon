# Endless Program Terminal Coda Review

This review records the completion evidence for planner-visible terminal coda generation in `endless-program`.

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

## Mode Boundaries

`continuous-fugue` remains separate: the focused control reports `terminalClosureReview.classification: "not-required"`, `terminalClosureSource: "not-required"`, and has no self-contained coda section.

`regenerative-cycle` remains bridge-compatible rather than collapsed into `endless-program`: the focused control reports accepted terminal closure with `terminalClosureSource: "bridge-compatible-closure"` and has no self-contained coda section.

## CI / Review Scope

Touched metric: `terminalClosureReview`.

Scope classification: `review-required`.

Reason: generated coda source, prepared voice re-entry, and final-attack re-entry counts are deterministic score-window signals, but they are phrase-quality evidence rather than a complete listening-quality gate. They should remain visible in worker and UI snapshots before any later promotion to CI-blocking.

Human listening remains a gap. The score-window review confirms that the reported structural symptom no longer appears in the focused seed set, but it does not replace listening review of cadence rhetoric, release timing, or long-run fatigue.

## Verification

* `pnpm build`
* `node --test packages/core/dist/generate-terminal-closure-review.test.js packages/core/dist/public-contract.integration.test.js packages/core/dist/infinite-playback.test.js packages/web/dist/generation-worker.test.js`
