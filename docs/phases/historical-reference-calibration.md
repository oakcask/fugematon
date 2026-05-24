# Historical Reference Calibration

Historical reference calibration is inserted after Texture continuity repair and before Infinite playback MVP. Its purpose is to use historical score evidence to tune the generator away from persistent voice-pair coupling and unresolved entry friction, without treating a placeholder reference profile as musical acceptance.

Status: complete. The review bundle exposes a Historical reference calibration summary that keeps placeholder reference-profile success as context only, excludes entry-local historical thresholds until subject entries are matched or annotated, and classifies historical normalized metrics as review evidence. The generator response reduces aggregate voice-pair coupling and entry severe-interval pressure while keeping remaining score-window blockers visible for Infinite playback MVP.

Planning review:

* [Historical reference observation](../reviews/historical-reference-observation.md): exploratory Bach WTC diagnostics, generated bundle comparison, structural hypothesis, and CI / review scope.
* [Historical reference calibration completion review](../reviews/historical-reference-calibration-completion.md): generator/scoring response evidence, focused and full seed comparison, CI / review scope, and listening gap classification.

## Rationale

Recent historical-score observation shows that the current generated bundle has much higher shared-rhythm and pitch-class-unison density than the imported WTC fugue sample, while generated `qualityVector` still reports broad local sentinel pressure. The same generated bundle keeps entry severe-interval duration as a high-risk score-window blocker.

The current reference profile is metadata-only and too broad to certify beauty. Historical evidence should therefore drive two separate workstreams: generator repair using current local sentinel evidence, and corpus ingestion so future reference bands come from annotated score data.

Theory basis: species counterpoint and Bach/fugue practice both require independent line agency and explained dissonance treatment. Lockstep, pitch-class reinforcement, and entry friction can be valid when they have local function, but they should not be the default way to maintain texture.

## Scope

* Add or formalize a historical-reference review harness for Humdrum/MusicXML-derived score events, source metadata, and normalized metrics.
* Add subject-entry annotation or matching before historical entry metrics affect thresholds.
* Reclassify `referenceDiagnostics.outsideReferenceSeedCount` as context only for beauty handoff; score-window evidence remains required.
* Reduce persistent `durationBasedLockstep` and `pitchClassUnisonDuration` through planner and scoring changes that preserve functional support.
* Reduce generated entry severe-interval duration by improving carried support, prepared suspension, delayed support, and harmonic support around subject/answer entries.
* Keep leap-recovery comparison style-aware. Do not tune toward historical keyboard leap density until the diagnostic explains sequence, arpeggiation, and subject function.

## Out Of Scope

* Shipping historical score files as source artifacts without source metadata and redistribution review.
* Treating the exploratory import output as a permanent reference corpus.
* Making `outsideReferenceSeedCount: 0` a beauty handoff criterion.
* Fixing only one generated seed, one voice pair, one pitch class, one time signature, or one historical score.
* Hiding score-window blockers with playback smoothing, segment boundaries, instrumentation, or UI presentation.

## Workstreams

### HRC-A: Historical import review harness

Create a repeatable review path for historical Humdrum/MusicXML scores that preserves voice identity, timing, source metadata, and redistribution policy. Keep raw score redistribution out of committed docs unless licensing is verified.

Implemented baseline: `reference-diagnostics` now exposes `summarizeHistoricalReferenceReview` for normalized historical diagnostic records and `summarizeHistoricalReferenceCalibration` for source readiness, metric roles, and handoff classification. The first output remains `review-required`. It may become `ci-observed` after import determinism, source metadata, and runtime are stable.

### HRC-B: Subject-entry annotation

Add an annotation or matching layer for historical subject entries before deriving entry-local severe-interval bands. Until then, historical entry metrics remain incomplete evidence and cannot set thresholds.

Implemented baseline: calibration source records carry subject-entry annotation method and entry count. `severeEntryIntervalPerEntry` and `unresolvedSevereEntryIntervalPerEntry` stay `threshold-excluded` unless the source has `pattern-matched` or `manual-annotated` entries.

### HRC-C: Reference readiness reclassification

Update adoption language and review summaries so reference-profile aggregate pass is not treated as beauty acceptance. It can remain context for compatibility and coarse profile drift.

Implemented baseline: review summaries include `historicalReferenceCalibration.referenceProfileAggregate`, which marks `referenceDiagnostics.outsideReferenceSeedCount` as `context-only` with `beautyHandoffAccepted: false`.

### HRC-D: Voice-pair independence repair

Adjust generation and candidate scoring so long duration lockstep and pitch-class reinforcement require a local function from `voicePairFunctions`, such as cadence support, prepared suspension, subject support, sequence support, pedal, or deliberate color doubling.

The repair should preserve texture continuity and avoid reverting to exposed free-counterpoint solo.

Completed response: candidate selection weighs voice-pair coupling risk more strongly. The 22 seed aggregate lowered `pitchClassUnisonDuration` and `durationBasedLockstep` without new hard failures or subject/answer identity regressions; remaining mechanical-coupling and exposed-solo review signals stay visible in the completion review.

### HRC-E: Entry support repair

Improve support around subject and answer entries. Prefer prepared or carried contrapuntal support over same-tick resets and unexplained seconds or sevenths.

Focused seeds include `circle-fifths`, `contrary-motion`, `modal-cadence`, and `tight-stretto`, plus representative and rotation controls.

Completed response: the full 22 seed bundle lowered unresolved entry severe-interval duration and unresolved-entry local sentinel count. Focused high-risk seeds remain classified as score-window review targets rather than being accepted through the reference-profile aggregate.

### HRC-F: Review and handoff

Generate an A/B review bundle after HRC-D and HRC-E. Record improvements, regressions, concrete score-window symptoms, and whether each tradeoff belongs in generation, scoring, diagnostics, docs, or manual listening.

Completed response: generated `organ-default` and `strict-counterpoint` review bundles are recorded in the completion review. Human listening remains an explicit manual-listening gap for Infinite playback MVP follow-up.

## Completion Conditions

* Historical-reference review can be reproduced from a documented source manifest and does not depend on committed raw score files without metadata.
* Historical entry-local metrics remain excluded from thresholds until subject-entry annotation or matching is implemented.
* Current docs and handoff criteria no longer use reference-profile aggregate pass as beauty acceptance.
* Generated review seeds show lower persistent duration lockstep or pitch-class reinforcement without new hard failures, exposed-solo regressions, or subject/answer identity regressions.
* Entry severe-interval and unresolved-entry severe-interval evidence improves or each remaining high-risk seed has a score-window explanation and repair target.
* Leap-recovery comparison is classified as style-aware review evidence rather than a direct scoring target.
* Focused `organ-default` and `strict-counterpoint` listening notes are recorded or explicitly left as a manual-listening gap.

## Phase 8 Handoff

Infinite playback MVP may resume. Segment boundaries, regeneration modes, performance profiles, and playback UI must not hide remaining persistent lockstep, long pitch-class reinforcement, or unresolved entry friction; these remain review-required score-window signals rather than reference-profile acceptance criteria.
