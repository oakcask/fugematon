# Continuous fugue boundary carry planning

Status: completed.

This plan follows the completed [Continuous fugue segment continuity planning](continuous-fugue-segment-continuity-planning.md). The earlier plan fixed hidden-boundary exposition reset and piano-roll reset. This follow-up treats a narrower musical defect: a segment can be classified as a prepared continuation while still sounding like a new attack because no sounding line or harmonic preparation carries through the boundary.

## Goal

Make `continuous-fugue` hidden boundaries sound like continuation boundaries, not only pass form-reset diagnostics.

Segment 1 and later should inherit the previous segment snapshot, preserve deterministic PRNG continuation, and use the carried tail context to keep at least one musically justified line, suspension, pedal, or cadential preparation audible into the next segment when the prior tail does not already make a clear break. A strong subject return at the new segment start is acceptable only when the prior tail prepares it through harmony, texture, or staged voice activity.

## Reported Symptom

Human feedback: `continuous-fugue` generated from `seed-1f6nfdt-0sv4of6` sounds unnatural between the first segment and the next segment.

Focused score review found that the boundary is not a literal exposition reset. Segment 1 starts as `prepared-subject-return`, carries subject-family evidence, preserves tonal and density continuity, and does not repeat the full initial alto / soprano / tenor / bass exposition order.

The audible defect is still plausible from the score: the prior segment tail thins and stops before the hidden boundary, then the next segment begins with a strong all-voice tonic subject-return texture. The result can sound like a fresh downbeat even though the formal state is continuation.

## Structural Hypothesis

The current continuation model carries enough snapshot data to choose a non-exposition first state, but the opening texture of the next segment does not yet spend the carried `unresolvedVoiceContinuity`, bounded past events, cadence preparation, and harmonic-continuity evidence.

Evidence strength: plausible from one user-reported focused seed and consistent with earlier texture-continuity findings. It is not yet confirmed across the standard review seed set.

Theory basis: fugue continuity can support later subject returns, episodes, and stretto-like entries, but a hidden boundary should preserve line agency, harmonic expectation, or cadential preparation. Counterpoint and fugue practice tolerate rests and re-entries, but an unprepared all-voice restart after thinning reads as a new beginning rather than continuous development.

Project response: generator and diagnostics change. Do not fix this with playback smoothing, boundary silence, envelope changes, or UI presentation.

## PRNG And Seed Policy

Do not treat this as a derived-seed bug unless new evidence shows a regression.

Current intent remains:

* `continuous-fugue` keeps the visible session seed across segments.
* Segment 1 and later use the previous segment snapshot, including `prngInternalState`, for continuation randomness.
* The subject family may remain tied to the session seed so the fugue retains identity across segments.
* Tests should prove that a snapshot-based segment 1 is deterministic from the same previous snapshot and that changing the previous snapshot changes continuation choices even when the session seed is unchanged.

If implementation finds any path where `continuous-fugue` segment 1 or later falls back to a derived per-segment seed without a visible fallback status, classify it as `generator-response-required-reset` and repair it before texture work continues.

## Scope

* Add boundary-carry generation behavior for `continuous-fugue` segment 1 and later.
* Use the previous snapshot tail to decide whether the next segment needs a carried line, suspension, pedal, staggered re-entry, or explicit cadence-preparation resolution before a strong subject return.
* Add diagnostics that distinguish form continuation from audible carry continuity.
* Re-review the user-reported seed and a small control set before completion.
* Keep `endless-program` terminal coda and audible-boundary behavior separate.

## Out Of Scope

* Replacing the completed exposition-reset repair.
* Making every segment boundary legato.
* Banning all all-voice attacks, subject returns, or strong tonic returns.
* Hiding the boundary with playback smoothing, release envelopes, reverb, silence, or piano-roll crossfade.
* Hard-coding behavior for one seed, key, time signature, voice, pitch, measure, or boundary tick.
* Changing `endless-program` or `regenerative-cycle` semantics unless a shared helper must remain mode-aware.

## Workstreams

### CFB-C1: Boundary carry review surface

Add or extend diagnostics so a boundary can pass `continuousSegmentContinuity` while still exposing weak audible carry.

The review surface should include:

* previous sounding voice count near the boundary;
* per-voice last end before boundary and first start after boundary;
* all-voice gap duration;
* carried, suspended, resolving, pedal, staggered, and restarted voices;
* prior tail harmonic-continuity classification;
* next first attack density and role mix;
* classification such as `carried-line-continuation`, `prepared-reentry`, `review-required-thin-boundary`, and `generator-response-required-hard-restart`.

Initial CI / review scope: `review-required`. The user-reported seed is a focused regression seed for review, not a permanent CI blocker until false positives are known.

### CFB-C2: Snapshot-to-texture handoff

Teach continuation generation to spend the carried tail context before selecting the first audible texture.

Candidate behavior:

* If the prior tail ends with unresolved cadence preparation or weak harmonic-continuity evidence, start with a resolving support line or pedal before the subject return.
* If all outside voices ended shortly before the boundary, prefer one carried or staggered voice at the next segment start instead of a full all-voice restart.
* If the previous tail already prepares a strong return, allow an emphatic subject-return downbeat but record why it is prepared.
* If density fatigue is high, thin texture by staged release rather than dropping all voices before the hidden boundary.

The repair should be expressed in structural terms: tail function, active voice count, unresolved cadence state, harmonic function, role continuity, and first-section intent.

### CFB-C3: Boundary-aware first section scoring

Update continuation candidate scoring so the first section after a hidden boundary pays a cost for hard restart symptoms:

* all voices silent immediately before the boundary followed by all-voice attack;
* previous episode classified as harmonic-continuity generator response followed by tonic subject-return without preparation;
* no carried or staggered outside voice into the first important entry;
* same attack-grid lockstep across all active voices when the prior tail had thinned.

Reward:

* one or more prepared carry voices;
* bass-root or chord-tone support that resolves the prior tail;
* staggered continuation into the first subject or fragment;
* audible relation to prior fragment, counter-subject tail, or cadence preparation.

### CFB-C4: Tests and review

Core tests:

* `continuous-fugue` segment 1 still consumes the previous snapshot PRNG state and remains deterministic for the same snapshot.
* A synthetic thin-tail snapshot does not produce an unclassified all-voice hard restart.
* A prepared-tail snapshot may produce a strong subject return only when diagnostics classify the preparation.
* `endless-program` terminal closure behavior is unchanged.

Review seeds:

* user-reported focused seed: `seed-1f6nfdt-0sv4of6`;
* one representative default seed;
* one dense or stretto-heavy seed;
* one modal seed;
* one control where a strong prepared subject return is acceptable.

Record missing human listening if completion relies only on ScoreEvent and diagnostics review.

## Completion Conditions

* Segment 1 and later in `continuous-fugue` still do not restart exposition or mutate the visible session seed into a derived segment seed.
* Boundary diagnostics expose audible carry continuity separately from form-state continuity.
* The user-reported seed no longer has an unexplained thin-tail plus all-voice hard restart at the first hidden boundary.
* Focused control seeds show that prepared strong returns are still allowed.
* Hard constraints remain visible: range, voice crossing, subject identity, answer plan, all-voice silence, unresolved dissonance, and score-window acceptance signals are not hidden by the new classification.
* Documentation and review evidence separate generator response from playback or UI masking.

## Handoff Notes

This is a follow-up to completed segment continuity work, not a rollback. The previous repair made the next segment structurally continue from a snapshot. This plan makes the hidden boundary musically continuous at the sounding-score level.

The expected implementation order is diagnostics first, then snapshot-to-texture repair, then scoring, then focused review. If diagnostics show that the reported seed is isolated and controls already behave well, keep the final response narrow and document why the issue does not generalize.

## Completion Notes

Implemented `continuousBoundaryCarry` in `GenerationDiagnostics` so hidden-boundary audible carry is separate from `continuousSegmentContinuity`. The summary records previous tail density, per-voice timing, all-voice boundary gap, carried / resolving / pedal / staggered / restarted voices, prior tail harmonic-continuity, first attack density, role mix, and `generator-response-required-hard-restart` versus accepted carry classifications.

Continuation generation now uses the previous snapshot tail before the first audible texture of `continuous-fugue` segment 1 and later. Thin-tail hard restarts are repaired with a structurally selected support carry plus staggered support re-entry, while preserving snapshot PRNG continuation and visible session seed behavior.

Focused review evidence is recorded in [Continuous Fugue Boundary Carry Review](../reviews/continuous-fugue-boundary-carry-review.md). The reported seed `seed-1f6nfdt-0sv4of6` remains `prepared-subject-return` at the form level and now classifies audible carry as `prepared-reentry` with bass pedal support, no hard constraint failures, and no all-voice silence gap. Control seeds keep prepared strong returns allowed, including `bach-001` as `carried-line-continuation`, `tight-stretto` as staggered `prepared-reentry`, `modal-cadence` as pedal-supported `prepared-reentry`, and `sparse-cadence` as a developmental episode boundary.

Manual listening remains incomplete; acceptance is based on ScoreEvent diagnostics and agent-side music-theory review.
