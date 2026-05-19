# Phase 13Q: Candidate Diversity, Voice Independence, And Entry Harmony Quality Pass

Phase 13Q は、Phase 13 の quality vector review model を使って、Phase 8/9 の UI・操作機能へ戻る前に生成結果そのものを改善する品質フェーズである。

Status: planned. Phase 13Q is inserted after Phase 13 and before Phase 8. The phase should extend candidate diversity beyond the Phase 12 phrase-unit baseline, preserve the Phase 12 phrase/repetition gains, and reduce the main Phase 13 review-required signals: pitch-class unison duration, duration-based lockstep, and unresolved entry severe interval duration.

## Rationale

Phase 12 improved phrase repetition, state-pattern variety, and functional thinning. Phase 12P then separated rendering from score generation, and Phase 13 added the quality vector model without changing selected `ScoreEvent` output.

The Phase 13 review shows that the current baseline is still not good enough to put UI operations first. The strongest remaining symptoms are:

* long pitch-class unison exposure between voice pairs;
* broad duration-based lockstep even when exact same-pitch unison is shorter;
* unresolved entry-local seconds and sevenths;
* modal counter-subject identity loss on some seed variants;
* leap-recovery regressions from denser phrase-unit support;
* soprano repeated-note pressure detection that does not yet match human feedback.

These are musical-quality problems in the generator and planner. UI controls should not hide or mask them.

The similar-phrase issue is not treated as solved permanently. Phase 12 showed that the main cause was candidate and planner diversity, not only selection weighting. Phase 13Q should therefore keep improving the candidate pool while fixing the voice-leading tradeoffs introduced by denser phrase-unit support.

## Scope

### 1. Baseline and review seed set

Use `phase10-section-local-planner` as the current baseline. Keep `phase10-oracle-selection` as a comparison baseline only when a change needs Phase 11-style before/after context.

Focused seeds:

* representative: `bach-001`, `fugue-smoke`;
* boundary: `sparse-cadence`, `minor-entry`;
* rotation: `modal-cadence`, `tight-stretto`, `angular-answer`, `modal-answer`;
* adversarial: `dense-modal`;
* quality-vector contributors: `wide-key`, `circle-fifths`, `contrary-motion`.

The focused set can be narrowed per PR, but adoption needs the 22 seed review bundle.

### 2. Candidate diversity feature bridge

Expose whether a section had meaningful alternatives before changing selection:

* candidate counts by subject stem, answer transform, fragment derivation, phrase function, cadence approach, support role, and section state;
* viable candidate diversity after hard failures, range, voice crossing, subject identity, answer plan, and unresolved strong dissonance are filtered;
* selection-only upper bound for phrase diversity versus generator-needed rate;
* whether a repeated phrase is function-bearing repetition or mechanical reuse;
* whether alternate stems are evidence-only, selectable, or rejected by voice-leading guardrails.

This bridge should distinguish three cases: the pool has diverse viable alternatives and selection should change; the pool has alternatives but they fail voice-leading or identity guardrails; or the generator/planner must create new candidates.

### 3. Quality-vector feature bridge

Promote the Phase 13 local sentinel evidence into candidate-evaluation context:

* `long-pitch-class-unison` by voice pair, section role, duration, and nearest phrase or cadence boundary;
* `unresolved-entry-severe-interval` by entry voice, entry form, section state, unresolved duration, and resolution deadline;
* high-register soprano repeated-note runs with ornament or contour-release evidence.

The bridge is review and explanation infrastructure first. It should not change selection until tests prove the feature context is deterministic and visible in review summaries.

### 4. Phrase-family and derivation candidates

Add candidates that increase phrase variety without relying on random rotation:

* subject stem variants that preserve identity but alter local climax, cadence approach, or tail contour;
* answer transforms that explain local key and structural tones, including limited derived-answer alternatives when identity and support harmony remain clear;
* subject-fragment derivations by inversion, sequence, diminution or augmentation, rhythmic displacement, tail extraction, and stretto compression;
* counter-subject tail variants that keep modal characteristic tones and recognizability;
* phrase-function variants for entry preparation, episode sequence, cadence extension, restatement, echo, and stretto tension.

Candidates are not selectable merely because they are different. They need the same hard constraints, entry harmony, leap recovery, modal identity, and voice-pair guardrails as the current planner.

### 5. Entry harmony candidate scoring

Reduce unresolved entry-local seconds and sevenths without moving support notes as a local vertical patch. Candidate scoring must evaluate the tradeoff together:

* entry severe interval duration and unresolved duration;
* support voice leap recovery;
* counter-subject identity retention, especially in modal seeds;
* outer-voice contour and bass-upper contrary motion;
* chord member, non-chord-tone role, and resolution deadline around entries.

Primary regression seeds are `modal-cadence`, `fugue-smoke`, `tight-stretto`, `circle-fifths`, and `close-imitation`.

### 6. Voice-pair planner candidates

Add section-local candidates that reduce long pitch-class unison and lockstep by changing the support role, not by blindly delaying or octave-shifting a line.

Candidate families:

* contrary or oblique support against the active entry;
* short suspension preparation with explicit resolution;
* pedal support that releases before it becomes long unison;
* cadential preparation that avoids bass-tenor and bass-alto pitch-class lock;
* echo or fragment support that changes rhythm without breaking phrase function.

Each candidate must report the voice-pair risk it is meant to reduce and the musical reason it remains acceptable.

### 7. Lockstep and repeated-note calibration

Treat lockstep as section-role dependent. Shared rhythm can be acceptable in stretto tension, cadence reinforcement, or deliberate echo; it is less acceptable as long undifferentiated episode filler.

Recalibrate soprano repeated-note pressure before using it as a selection cost. The detector should consider high register, run length, duration, ornament release, contour release, and whether the repeated notes function as suspension, pedal, or filler.

## Adoption Criteria

Phase 13Q is adoptable only if the variant satisfies all of the following:

* 22 seed hard constraint failure count remains 0.
* Phase 7B readiness remains true for all 22 seeds.
* Phase 12 phrase/repetition gains are not materially reverted.
* Viable candidate diversity improves or the review explains which blocker families are still generator-needed.
* Focused repeated-phrase seeds do not regress in most repeated 4-section pattern count or unique pattern count.
* New phrase-family or derivation candidates are selected only when voice-leading and identity guardrails remain acceptable.
* `pitchClassUnisonDuration` and `durationBasedLockstep` improve in the aggregate, or any non-improvement is explained by seed-level musical tradeoff.
* `unresolvedEntrySevereIntervalDuration` improves on the focused entry-harmony seeds.
* No unexplained local sentinel regression appears in the focused seed set.
* Modal counter-subject identity and leap recovery regressions are bounded and documented by seed.
* `review-ab` records quality vector movement, local sentinel deltas, and manual listening gap.
* At least the focused seeds have manual listening notes under `organ-default` and `strict-counterpoint` before adoption.

## Non-Goals

* Phase 8 UI sliders, rewind, ring-buffer replay, parameter-change meta events, or Worker fallback.
* Turning quality-vector axes into hard absolute thresholds.
* Requiring zero unison, zero shared rhythm, zero repetition, or zero stepwise motion.
* Increasing randomness without phrase-function, identity, cadence, and voice-leading explanations.
* Learned aesthetic score adoption.
* External API or black-box generation.

## Implementation Order

1. Add deterministic candidate-diversity summaries for selected and viable alternatives without changing selected output.
2. Add deterministic feature bridge from Phase 13 local sentinel evidence to selected candidate explanations.
3. Add review-only summaries for focused seed locations: voice pair, section, entry, duration, nearest cadence or phrase boundary, and available alternate phrase families.
4. Add phrase-family and derivation candidates as evidence-only, then make a guarded subset selectable after 22 seed review.
5. Add small entry-harmony selection adjustments guarded by leap recovery, counter-subject identity, and contour.
6. Add voice-pair support candidates for long pitch-class unison and lockstep.
7. Recalibrate soprano repeated-note pressure as review-only, then decide whether it belongs in candidate scoring.
8. Generate a 22 seed `review-ab` bundle and record the score review before adoption.

## Theory Basis

Fux-style counterpoint supports treating unresolved seconds and sevenths, exposed unisons, and extended lockstep as voice-independence and dissonance-treatment concerns. Bach and common-practice fugue sources support preserving subject and counter-subject identity while using episodes, stretto, suspensions, and cadential preparation as functional explanations for repetition and overlap. Repetition is acceptable when it carries function, sequence, restatement, or tension; it is a defect when the same material recurs without a changed phrase role or goal. These rules remain style-sensitive review signals rather than zero-tolerance hard constraints.

## Next Work

The next implementation slice should build candidate-diversity summaries and the local-sentinel feature bridge without changing selected output. Scoring and planner candidate changes should follow only after the review bundle can explain the affected seed, section, voice pair, phrase family, available alternatives, and musical symptom.
