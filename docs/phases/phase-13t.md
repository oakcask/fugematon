# Phase 13T: Voice Independence And Entry Sonority Rewrite

Phase 13T was inserted after Phase 13S as a quality phase before the operational lane. Its purpose was to treat the then-current remaining beauty problems as generator problems, not as Phase 8 visualization or playback risks. The phase starts from [Phase 13T current beauty audit](../reviews/phase-13t-current-beauty-audit.md).

Status: completed, superseded for handoff. Phase 13T evidence is recorded in [Phase 13T completion review](../reviews/phase-13t-completion-review.md), but later score-window review inserted [Phase 13U](phase-13u.md) before Phase 8.

## Rationale

Phase 13S improved initial subject rhetoric and reduced entry friction, but the current 22 seed audit shows that the default generator is still not musically beautiful enough for infinite playback.

Main blockers:

* entry windows repeatedly combine pitch-class unison stacks with adjacent 2度/7度 friction;
* duration-based lockstep and pitch-class unison remain outside the quality profile for all 22 seeds;
* subject-fragment vocabulary remains concentrated across the bundle;
* modal and angular seeds still weaken counter-subject identity;
* current metrics locate defects, but they do not yet explain whether the generated score is beautiful;
* some current metrics need to be split, demoted, renamed, or replaced when score-window review shows that their aggregate values hide the musical cause.

Existing model compatibility, old guardrail margins, old expected values, and previous default output shape are not adoption requirements when they conflict with score-level musical beauty. Hard constraints such as range, voice crossing, subject identity, answer plan, and deterministic reproducibility remain safety checks, but they do not make the current music acceptable by themselves.

## Scope

### 1. Entry-window sonority classification

Add evidence that describes entry windows musically:

* entry voice, support voices, section state, local key, beat strength, and role;
* exact pitch-class unison stacks;
* adjacent 2度/7度 friction and tritone exposure;
* whether dissonance is prepared, passing, neighboring, appoggiatura-like, accented friction, or unresolved;
* resolution direction and deadline.

### 2. Voice-pair independence repair

Repair independence by generation, not by hiding review signals:

* avoid reusing the same rhythmic grid across all active voices near entries;
* prefer contrary or oblique support around subject, answer, cadence, and stretto starts;
* track voice-pair lockstep by function: support, cadence, sequence, pedal, or mechanical coupling;
* review pitch-class unison by register, duration, and voice pair before accepting it as color.

### 3. Fragment-function repair

Repeated subject fragments must earn their recurrence:

* vary sequence direction, inversion, cadence approach, density, and voice assignment;
* distinguish function-bearing recurrence from filler;
* keep subject-fragment family concentration visible at bundle level;
* reject repeated fragments that do not change harmonic or contrapuntal function.

### 4. Modal counter-subject identity

Modal and angular seeds must preserve counter-subject recognition:

* keep modal characteristic tones without flattening rhythm or contour identity;
* record counter-subject windows alongside aggregate retention;
* avoid support formulas that overwrite the counter-subject during modal entries;
* allow breaking generator changes when the old formula weakens fugal craft.

### 5. Metric reconstruction and truthfulness

Metrics remain probes, not judges, and Phase 13T may change the probes themselves:

* every adoption claim must cite representative score windows;
* all-seed review signals cannot be downgraded to Phase 8 display concerns;
* split broad axes when they mix different musical causes, such as functional held support and mechanical lockstep;
* replace duration-only or count-only axes with role-aware axes when score windows show that the same number covers different musical meanings;
* promote local sentinels that identify entry voice, support voice, voice pair, section role, beat strength, sonority type, and resolution path;
* demote or remove metrics that remain green while score review finds obvious musical weakness;
* update review bundle summaries so metric changes can be compared against old bundles without pretending the old and new axes are equivalent;
* reference-profile pass remains evidence-only until real reference ingestion exists;
* focused listening notes must agree with the claimed metric movement or explain the mismatch.

Candidate metric changes:

* replace the single unresolved entry severe interval duration signal with entry-window sonority classes: pitch-class unison stack, adjacent-second friction, exposed seventh, tritone exposure, prepared suspension, passing/neighbor motion, and unresolved accented clash;
* split duration-based lockstep into function-aware categories: subject support, cadence support, sequence pattern, pedal-like support, and mechanical coupling;
* split pitch-class unison by exact same-pitch unison, octave/color doubling, register-separated functional reinforcement, and mechanical duplication;
* extend subject-family diversity with fragment-function diversity, not only fragment degree-pattern concentration;
* add counter-subject window identity evidence alongside aggregate retention, covering rhythm, contour, register, modal alteration, and collision with support formulas;
* add a metric-explanation summary that maps each adoption-relevant axis to representative seed, tick, voice pair, section role, and musical symptom.

## Review Seeds

Use the 22 seed review set from Phase 13S as the minimum bundle.

Focused score-window review:

* entry sonority risk: `modal-cadence`, `circle-fifths`, `contrary-motion`, `tight-stretto`;
* voice independence risk: `modal-dorian`, `long-arc`, `bach-001`, `dark-episode`;
* fragment-function risk: `angular-answer`, `bach-001`, `dense-modal`, `modal-cadence`, `modal-dorian`, `sparse-cadence`;
* counter-subject risk: `modal-answer`, `dense-modal`, `modal-cadence`, `angular-answer`, `modal-dorian`;
* representative controls: `bach-001`, `fugue-smoke`, `minor-entry`, `sparse-cadence`.

## Adoption Criteria

Phase 13T is complete. Completion evidence:

* representative entry windows are classified by `entrySonorities`, including pitch-class unison stacks, adjacent 2度/7度 friction, tritone exposure, beat strength, support voices, and resolution direction;
* step-resolution-aware metric reconstruction reduces unresolved entry sentinels from 161 to 97 across the 22 seed bundle;
* duration-based lockstep and pitch-class unison remain visible as broad review axes, but `voicePairFunctions` splits them into subject support, cadence support, sequence support, pedal-like support, mechanical coupling, color doubling, and functional reinforcement;
* dominant subject-fragment recurrence remains visible at 12 of 22 seeds, but `fragmentFunctionEvidence` records transformation, sequence, cadence, and target-mode function so recurrence can be reviewed as development rather than accepted as filler;
* modal and angular seeds record `counterSubjectWindows` with rhythm, contour, support collision, and retention kind, so aggregate counter-subject retention is no longer the only evidence;
* `qualityVector.schemaVersion` and `qualityVector.modelVersion` are both 2, and `metricExplanations` mark whether a movement is a musical improvement, diagnostic reclassification, or remaining review signal;
* `organ-default` and `strict-counterpoint` focused listening notes are recorded in the completion review;
* metrics used for adoption now explain representative score windows and do not claim the old broad axes are green when they are still review-required.

## Handoff To Phase 8

Phase 13T no longer hands directly to Phase 8. The next phase is [Phase 13U](phase-13u.md), based on the score-window replan review in [Phase 13U beauty replan review](../reviews/phase-13u-beauty-replan.md).

Phase 8 may resume only after Phase 13U records repaired score-window beauty evidence and accepted tradeoffs. Phase 8 must use the Phase 13T and Phase 13U evidence fields when reviewing long-running playback and must not use ring buffers, boundary semantics, visualizer presentation, performance profile, Worker fallback, or UI choices to mask unresolved entry friction, voice lockstep, pitch-class unison, mechanical fragments, or weak counter-subject identity.
