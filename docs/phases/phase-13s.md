# Phase 13S: Music-Beauty-First Rewrite

Phase 13S is inserted after Phase 13R and before Phase 8. Its purpose is to treat musical beauty as the project core, not as a compatibility-constrained quality lane. The phase starts from the score review in [Phase 13S music beauty review](../reviews/phase-13s-music-beauty-review.md).

Status: complete, superseded for handoff. Phase 13S repaired the confirmed subject-rhetoric collapse and reduced entry friction, but the later Phase 13T audit found that remaining voice-pair independence, pitch-class unison, entry-sonority, fragment-function, and modal counter-subject risks must be repaired before Phase 8 resumes.

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

## Completion Record

Phase 13S completed with a breaking default-generator update and `generatorVersion` 4. The old default score shape is not preserved because Phase 13S treats score-level beauty ahead of model compatibility.

Review evidence:

* Review bundles were regenerated for the 22 seed set with `organ-default` and `strict-counterpoint`.
* Initial subject rhetoric now has 4 rhythm patterns, 3 local climax indexes, and 7 initial subject families across the 22 seeds.
* Top initial subject family share moved to 0.227. Top subject-fragment family share moved from 0.682 to 0.545; this remains above the old collapse threshold, but the dominant fragment is accepted as function-bearing recurrence because it now appears inside a wider subject-rhythm and climax vocabulary instead of being the only subject rhetoric.
* Unresolved entry severe interval duration moved from 306 quarter notes in the Phase 13S planning review to 151 quarter notes in the completion evidence.
* Counter-subject identity total across the 22 seeds moved from 17.946 to 18.196. The focused modal and angular seeds preserve their pre-rewrite recognition floor: `modal-answer` 0.545, `dense-modal` 0.571, `modal-cadence` 0.573, `modal-dorian` 0.632, and `angular-answer` 0.591.
* The completion regression test records these expectations in `packages/core/src/generate-phase13s-music-beauty.test.ts`.

Accepted tradeoffs:

* Duration-based lockstep and pitch-class unison remain outside the quality profile for all seeds. The subject rewrite uses held openings and shifted climaxes, which can expose longer simultaneous support spans even while reducing unresolved entry friction. This is not accepted as final musical quality; it is now a Phase 13T input because the Phase 13S blocker was subject sameness and entry friction, not a full voice-independence rewrite.
* Reference-profile pass remains evidence-only until real reference ingestion exists.
* Focused listening notes for both performance profiles found the rewrite preferable for subject memorability and entry clarity, but still marked voice-pair lockstep and pitch-class unison as needs-work for long-run listening.

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

## Handoff To Phase 13T

Phase 13S no longer hands directly to Phase 8. The next phase is [Phase 13T](phase-13t.md), based on the current beauty audit in [Phase 13T current beauty audit](../reviews/phase-13t-current-beauty-audit.md).

Phase 8 may resume only after Phase 13T records repaired score-window evidence, metric movement, focused listening notes, and any accepted tradeoffs.
