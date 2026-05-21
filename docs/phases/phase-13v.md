# Phase 13V: Line-Agency And Long-Run Beauty Rewrite

Phase 13V is inserted after Phase 13U and before Phase 8. Its purpose is to make musical beauty the planning center again after the post-13U score review showed that truthful metrics still do not prove beautiful fugue writing.

Status: planned. Phase 8 is deferred until Phase 13V records generator-side improvement and focused listening evidence.

Starting review: [Phase 13V score beauty audit](../reviews/phase-13v-score-beauty-audit.md).

## Rationale

Phase 13U improved score-window truthfulness, but the current 22 seed review still shows systemic score-level problems:

* all 22 seeds remain outside profile for pitch-class unison duration and duration-based lockstep;
* 18 of 22 seeds remain outside profile for entry severe interval duration;
* 144 repeated entry formula summaries remain `review-required`;
* localized voice-pair spans mostly classify as pitch-class reinforcement or color doubling, not independent line agency;
* fragment transformation claims exist, but the top subject-fragment family still appears in 12 of 22 seeds;
* counter-subject windows are dominated by accepted tradeoffs rather than preserved returns.

Existing model compatibility, old guardrail margins, old expected values, and previous default output shape are not adoption requirements when they conflict with score-level musical beauty. Determinism and hard constraints remain required, but they do not make the music acceptable by themselves.

## Scope

### 1. Line-agency model

Evaluate and generate voice pairs as independent lines:

* rhythmic stratification rather than shared duration grids;
* contrary or oblique support around entries and cadences;
* independent contour and leap recovery by voice;
* register separation that supports clarity rather than pitch-class reinforcement;
* local exceptions for cadence, sequence, pedal, or color only when the score window supports that role.

### 2. Entry-formula novelty budget

Treat repeated entry formulas as composition material, not only diagnostics:

* group formulas by entry voice, support voices, beat strength, section role, pitch-class stack, adjacent friction, tritone exposure, and resolution direction;
* limit repeated pitch-class-stack plus second/seventh/tritone formulas across a score;
* require repeated formulas to change function, spacing, preparation, resolution, density, or voice assignment;
* prefer alternative support-line candidates when formula recurrence exceeds the novelty budget.

### 3. Counter-subject survivability

Make counter-subject craft a generation objective:

* preserve recognizable rhythm and contour in enough returns that tradeoffs do not dominate;
* separate modal color from counter-subject erasure;
* reject support formulas that overwrite the counter-subject near entries;
* record preserved, tradeoff, and weak windows by seed and section role.

### 4. Long-window development

Make fragment transformation audible over time:

* compare adjacent sections for contrast in fragment family, harmonic goal, cadence approach, density, inversion, sequence direction, and voice assignment;
* detect long spans that rely on the same subject-fragment family without sufficient contrast;
* treat function labels as review evidence, not proof of development.

### 5. Metric truthfulness upgrade

Every adoption-relevant metric must distinguish:

* diagnostic explanation: the metric points to a score symptom;
* musical improvement: generated score windows read or sound better;
* beauty acceptance: representative and boundary seeds have enough line agency, entry rhetoric, development, and listening endurance for Phase 8.

## Review Seeds

Use the 22 seed review set from Phase 13U as the minimum bundle.

Focused score-window review:

* entry formula risk: `bach-001`, `modal-answer`, `circle-fifths`, `tight-stretto`, `sparse-cadence`;
* line-agency risk: `modal-dorian`, `long-arc`, `dark-episode`, `bach-001`, `bright-answer`;
* fragment development risk: `angular-answer`, `modal-cadence`, `dense-modal`, `dark-episode`, `quiet-cadence`;
* counter-subject risk: `circle-fifths`, `long-arc`, `sparse-cadence`, `modal-cadence`, `dense-modal`;
* representative controls: `fugue-smoke`, `minor-entry`, `wide-key`, `lyrical-line`.

## Adoption Criteria

Phase 13V is complete only when:

* 22 seed review compares pre/post generated scores, not only metric movement;
* repeated entry formulas are reduced or score-window justified with visible changes in function, spacing, preparation, or resolution;
* voice-pair spans show more independent line agency, not only reclassified reinforcement;
* counter-subject preservation increases in representative, modal, and long-arc seeds without hiding weak windows;
* fragment recurrences show adjacent-section and long-window contrast, not only transformation labels;
* `organ-default` and `strict-counterpoint` focused listening notes describe concrete score symptoms and accepted tradeoffs;
* Phase 8 handoff states which remaining review signals are acceptable for infinite playback and why.

## Handoff To Phase 8

Phase 8 may resume only after Phase 13V records generator-side improvement and focused listening evidence. Phase 8 must not use boundary design, playback mode, visualizer presentation, Worker fallback, or performance profile to hide unresolved formula recurrence, line coupling, fragment sameness, or weak counter-subject identity.
