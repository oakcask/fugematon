# Phase 13S: Music-Beauty-First Rewrite

Phase 13S is inserted after Phase 13R and before Phase 8. Its purpose is to treat musical beauty as the project core, not as a compatibility-constrained quality lane. The phase starts from the score review in [Phase 13S music beauty review](../reviews/phase-13s-music-beauty-review.md).

Status: planned. Phase 8 and Phase 9 stay deferred until this phase has either repaired the confirmed score-level problems or explicitly rejected a finding with score-window and listening evidence.

## Rationale

The Phase 13R baseline is operationally usable, but the 22 seed score review shows that it is not yet musically strong enough to be the foundation for infinite playback.

Main blockers:

* all initial subject families use the same rhythm pattern and the same local climax index;
* the top subject-fragment family still appears on 15 of 22 seeds;
* entry-local 2度/7度 pressure remains widespread, with 306 unresolved entry severe interval sentinels;
* voice-pair lockstep and pitch-class unison are outside quality-vector expectations for all 22 seeds;
* modal and angular seeds still weaken counter-subject identity;
* form metrics and reference-profile pass signals overstate the musical result.

This phase may make breaking generator changes. Existing model compatibility, old guardrail margins, old expected values, and previous default output shape are not adoption requirements when they conflict with musical beauty. Hard constraints such as range, voice crossing, subject identity, answer plan, and deterministic reproducibility remain useful safety checks, but they are not allowed to override score-level musical judgement.

## Scope

### 1. Subject and counter-subject rhetoric

Expand subject and counter-subject generation beyond pitch-degree variants:

* rhythmic profiles: longer/shorter opening values, anacrusis-like starts, held structural tones, and syncopation only when style profile supports it;
* accent and metrical placement: avoid every subject having the same equal-pulse accent pattern;
* local climax: vary early, middle, late, and double-climax shapes;
* cadence tail: vary descending, ascending, neighbor, suspension-like, and answered-tail shapes;
* modal identity: preserve characteristic tones without losing counter-subject recognizability.

### 2. Entry-local counterpoint and harmony

Replace generic entry severe-interval pressure with role-aware treatment:

* classify 2度/7度 events as prepared suspension, passing tone, neighbor, appoggiatura-like event, accented clash, or unresolved friction;
* record subject voice, support voice, section state, local key, beat strength, and resolution direction;
* prefer generation repairs that change support line, answer transform, register, or entry spacing before changing thresholds;
* allow style-profile differences, but do not let hybrid or popular-tolerant profiles hide unresolved strict-classical entry defects.

### 3. Voice independence and texture

Improve the musical surface, not only aggregate counts:

* reduce duration-based lockstep through rhythmic stratification and complementary motion;
* prefer contrary or oblique motion near exposed entries and cadences;
* review pitch-class unison by voice pair, register, duration, and function;
* preserve the Phase 13R repair for abrupt texture drops and lower-voice vocality.

### 4. Fugal form and long-run development

Make sections function musically:

* episodes must show a transformation role: sequence, inversion, fragmentation, cadence preparation, modulation, or density change;
* stretto-like sections must show audible intensification, not just overlapping entries;
* repeated subject fragments must change function, direction, cadence goal, or contrapuntal tension;
* phrase labels and perfect form scores are not sufficient adoption evidence.

### 5. Metric truthfulness

Recalibrate metrics from score evidence:

* add rhythm/climax diversity to subject-family review;
* add counter-subject family diagnostics parallel to subject-family diagnostics;
* treat current reference-profile pass as evidence-only until real reference ingestion exists;
* connect every quality-vector axis to representative score windows and listening notes;
* remove or demote metrics that remain perfect while score review finds obvious musical weakness.

## Review Seeds

Use the 22 seed review set from Phase 13S as the minimum bundle. Focus manual and score-window review on:

* representative: `bach-001`, `fugue-smoke`;
* entry-harmony risk: `minor-entry`, `sparse-cadence`, `restless-line`, `ornament-test`, `modal-cadence`;
* modal / counter-subject risk: `modal-answer`, `dense-modal`, `modal-cadence`, `modal-dorian`;
* voice-independence risk: `modal-dorian`, `circle-fifths`, `tight-stretto`, `wide-key`, `contrary-motion`;
* subject rhetoric risk: all 22 seeds, because rhythm pattern and climax placement currently collapse across the bundle.

## Adoption Criteria

Phase 13S is complete only when:

* generated review bundles show more than one initial subject rhythm pattern and more than one local climax index across the 22 seed set;
* top subject-fragment family share is either below the collapse threshold or explicitly accepted as function-bearing recurrence with score-window and listening evidence;
* entry-local severe interval sentinels decrease or are reclassified as prepared/resolved contrapuntal events with representative windows;
* voice-pair lockstep and pitch-class unison movement improve or any regression has a concrete musical rationale;
* modal and angular seeds preserve counter-subject identity strongly enough for a listener to recognize it on return;
* episode and stretto-like sections have phrase-function evidence, not only state labels;
* `organ-default` and `strict-counterpoint` listening templates are filled for the focused seeds;
* metrics that claim improvement are backed by score-window examples and do not contradict manual listening notes.

## Implementation Order

1. Add score-window extraction for subject rhythm/climax, counter-subject identity, entry severe intervals, voice-pair lockstep, and phrase-function examples.
2. Extend diagnostics so subject-family review flags rhythm-pattern and climax-index collapse.
3. Add counter-subject family diagnostics.
4. Repair subject and counter-subject generators, allowing breaking generator changes when musical evidence supports them.
5. Repair entry-local support and answer handling using role-aware dissonance classification.
6. Improve voice-pair rhythmic stratification and contrary/oblique motion selection.
7. Rework episode and stretto-like phrase-function scoring.
8. Re-run the 22 seed review bundle and focused `organ-default` / `strict-counterpoint` listening templates.
9. Update quality metric docs and regression expectations to match the new musical baseline.

## Handoff To Phase 8

Phase 8 may resume only after Phase 13S records score-window evidence, metric movement, focused listening notes, and any accepted tradeoffs. Phase 8 must not use infinite playback controls, visualizer presentation, performance profile, Worker fallback, or UI choices to hide unresolved subject sameness, entry friction, voice lockstep, or weak fugal development.
