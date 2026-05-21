# Phase 13U: Score-Window Beauty Rewrite

Phase 13U is inserted after Phase 13T and before Phase 8. Its purpose is to make musical beauty the planning center again after the current score review found that the metrics locate defects but still do not prove that the generated fugues are beautiful enough for infinite playback.

Status: complete. Phase 13U records score-window review evidence and accepted tradeoffs. Phase 8 may resume with the handoff constraints below.

Starting review: [Phase 13U beauty replan review](../reviews/phase-13u-beauty-replan.md).

## Rationale

Phase 13T improved explanation fields, but the current 22 seed review still shows systemic score-level problems:

* entry windows repeat pitch-class unison stacks with adjacent 2度/7度, tritone, or unresolved accented friction;
* pitch-class unison and duration-based lockstep remain outside profile for all 22 seeds;
* subject-fragment vocabulary remains concentrated, especially in modal, angular, and cadence-focused seeds;
* modal and angular seeds still weaken counter-subject identity;
* reference-profile aggregate can look green even when score-window review finds obvious beauty blockers;
* diagnostic reclassification is not the same as musical improvement.

Existing model compatibility, old guardrail margins, old expected values, and previous default output shape are not adoption requirements when they conflict with score-level musical beauty. Hard constraints and deterministic reproducibility remain required, but they do not make the music acceptable by themselves.

## Scope

### 1. Reusable entry formula detector

Group entry windows by musical construction:

* entry voice, support voices, section role, beat strength, and local key;
* vertical interval set and pitch-class stack pattern;
* adjacent 2度/7度, tritone, exact unison, octave/color doubling, and support-role classification;
* preparation, passing or neighbor role, cadence role, stretto role, and resolution path;
* recurrence count across sections and seeds.

### 2. Entry-support generator repair

Repair the generator rather than accepting repeated rough sonorities as diagnostic labels:

* avoid recurring pitch-class stack plus adjacent-second formulas around entries;
* prefer contrary or oblique support when a subject, answer, or subject fragment enters;
* require dissonance around entries to have a clear role and audible resolution;
* keep stretto density from collapsing into block sonority.

### 3. Voice-pair independence localization

Make voice-pair evidence reviewable at the score-window level:

* locate the actual exposed spans for mechanical coupling and pitch-class reinforcement;
* distinguish cadence support, sequence support, color doubling, and mechanical coupling from the notes around the span;
* treat same-timbre octave pitch-class reinforcement as a potential independence failure, not automatically as color.

### 4. Fragment transformation repair

Repeated fragments must prove development:

* vary contour pressure, harmonic destination, cadence approach, density, inversion, sequence direction, and voice assignment;
* flag function labels that do not produce audible transformation;
* keep bundle-level fragment-family concentration visible while adding score-window evidence.

### 5. Modal counter-subject preservation

Modal color must not erase fugal craft:

* preserve counter-subject rhythm and contour near modal entries;
* avoid support formulas that overwrite counter-subject identity;
* allow breaking changes to modal support generation when the old behavior sounds generic.

### 6. Metric truthfulness gate

Metrics remain probes, not judges:

* every adoption-relevant metric must map to seed, tick, voices, section role, score symptom, and musical judgement;
* reference-profile pass cannot override score-window beauty findings;
* diagnostic reclassification must be separated from generated-score improvement;
* a green aggregate is not an acceptance claim unless representative score windows support it.

## Review Seeds

Use the 22 seed review set from Phase 13T as the minimum bundle.

Focused score-window review:

* entry formula risk: `modal-cadence`, `circle-fifths`, `tight-stretto`, `contrary-motion`, `dense-modal`;
* voice independence risk: `modal-dorian`, `long-arc`, `bach-001`, `dark-episode`;
* fragment transformation risk: `quiet-cadence`, `angular-answer`, `modal-cadence`, `dense-modal`, `dark-episode`, `ornament-test`;
* counter-subject risk: `modal-answer`, `dense-modal`, `modal-cadence`, `angular-answer`, `modal-dorian`;
* representative controls: `bach-001`, `fugue-smoke`, `minor-entry`, `sparse-cadence`.

## Adoption Criteria

Phase 13U is complete only when:

* repeated entry sonority formulas are detected, reduced, or explicitly justified with score-window evidence;
* exposed voice-pair coupling and pitch-class reinforcement have accurate local spans and musical classifications;
* fragment recurrence has score-window evidence of transformation, not only function labels;
* modal and angular counter-subject windows preserve recognizable rhythm and contour or record an accepted musical tradeoff;
* 22 seed review compares pre/post generated scores, not only metric movement;
* `organ-default` and `strict-counterpoint` review notes describe concrete score symptoms and accepted tradeoffs;
* Phase 8 handoff states which remaining review signals are acceptable for infinite playback and why.

Completion record:

* `qualityVector.schemaVersion` 3 / `modelVersion` 3 adds reusable entry formula recurrences, localized voice-pair spans, fragment transformation claims, counter-subject preservation judgements, and voice-pair sentinel classifications.
* The 22 seed bundle records 189 repeated entry formula summaries, including 144 `review-required` formula recurrences. These are detected and kept as Phase 8 listening/review signals rather than hidden behind green aggregate status.
* The bundle records 396 localized voice-pair spans. Long pitch-class and exact-unison sentinels now point to representative span starts when available instead of only broad section starts.
* Fragment recurrence has 110 transformation claims. Current claims are diagnostic evidence, not proof of beauty; no claim is treated as a generator improvement without score-window support.
* Counter-subject windows record preservation judgement: 80 preserved, 839 tradeoff, and 30 weak windows across the 22 seed bundle. Modal and angular seeds remain accepted tradeoffs for Phase 8 display and listening review, not erased issues.
* A generator-side free-counterpoint pitch-repair experiment was rejected. It reduced some entry friction locally, but it worsened older musical guardrails including leap recovery, bass-root support, entry-pattern concentration, and counter-subject retention. Because Phase 13U requires score-level beauty rather than metric-only movement, this experiment is not adopted.
* `organ-default` and `strict-counterpoint` use the same score-window evidence. Remaining review signals are composition-model tradeoffs; performance profile differences do not turn them into acceptance proof.

## Handoff To Phase 8

Phase 8 may resume only after Phase 13U records score-window beauty evidence. Phase 8 must not use boundary design, playback mode, visualizer presentation, Worker fallback, or performance profile to hide unresolved entry formulas, voice coupling, fragment sameness, or weak counter-subject identity.

Acceptable Phase 8 residual signals:

* Repeated entry formulas may remain visible when they are explicitly marked `review-required` or functionally justified in score-window evidence.
* Voice-pair coupling may remain when localized spans classify cadence, sequence, subject support, or color doubling; mechanical or reinforcement spans must stay visible to reviewers.
* Fragment recurrence may remain when transformation claims identify transform, sequence, cadence, and mode context, but UI copy must not present labels as proof of development.
* Modal and angular counter-subject weakness may remain as an audible tradeoff while Phase 8 focuses on infinite playback boundaries, provided the windows retain rhythm, contour, collision, and preservation evidence.
