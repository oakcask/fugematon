# Phase 13U Beauty Replan Review

This review rechecks the current default generator after Phase 13T. The purpose is not to decide from metric pass/fail state, but to read generated scores across seeds and ask whether the current metrics explain musical beauty, counterpoint, fugue craft, and theory well enough to let Phase 8 resume.

Evidence bundles:

```sh
pnpm fugematon review --out samples/phase13u-beauty-replan --ticks 129600 --performance-profile organ-default
pnpm fugematon review --out samples/phase13u-beauty-replan-strict --ticks 129600 --performance-profile strict-counterpoint
```

Reviewed seed set: the standard 22 seed review bundle: `bach-001`, `fugue-smoke`, `minor-entry`, `wide-key`, `lyrical-line`, `modal-dorian`, `circle-fifths`, `close-imitation`, `sparse-cadence`, `bright-answer`, `dark-episode`, `ornament-test`, `long-arc`, `contrary-motion`, `restless-line`, `tight-stretto`, `quiet-cadence`, `angular-answer`, `modal-answer`, `modal-cadence`, `contrary-answer`, and `dense-modal`.

Focused score windows were inspected for `fugue-smoke`, `modal-cadence`, `circle-fifths`, `tight-stretto`, `contrary-motion`, `modal-dorian`, `long-arc`, `dark-episode`, `angular-answer`, `dense-modal`, and `sparse-cadence`.

Source family basis: Fux/species counterpoint for consonance, dissonance preparation and resolution, contrary or oblique motion, and voice independence; common-practice fugue for entry clarity, counter-subject recognizability, episode development, cadence, and stretto density. Specific editions were not rechecked in this pass, so theory claims remain source-family level.

## Findings

### 1. Reference-profile aggregate gives a false sense of readiness

The reference diagnostics report `outsideReferenceSeedCount: 0`, yet the quality vector still marks `quality-review-required`.

The mismatch is musically meaningful:

* `pitchClassUnisonDuration` is outside profile for all 22 seeds. Top contributors are `dark-episode`, `long-arc`, and `modal-dorian`.
* `durationBasedLockstep` is outside profile for all 22 seeds. Top contributors are `modal-dorian`, `long-arc`, and `bach-001`.
* `entrySevereIntervalDuration` is outside profile for 18 of 22 seeds. Top contributors are `modal-cadence`, `circle-fifths`, and `tight-stretto`.
* The bundle still has 97 unresolved-entry severe-interval local sentinels and 67 long pitch-class-unison sentinels.

Theory basis: in a fugue, a score can satisfy hard constraints while still failing as music if entries are repeatedly framed by the same rough vertical formula or if voices move as coupled strands. Hard-constraint pass and reference-profile pass are not enough.

Diagnostics coverage: the quality vector is more honest than the reference aggregate, but it still functions as a warning system. It does not by itself judge beauty.

Project response: Phase 8 should remain deferred. Phase 13U is inserted before Phase 8 to make score-level beauty the next planning center.

### 2. Entry windows still repeat stacked unison plus second/seventh/tritone formulas

The entry-sonority classifier is useful, but it reveals that the score is still built from a recurring entry support formula.

Bundle-wide entry-sonority counts:

* `pitch-class-unison-stack`: 893 classified windows;
* `adjacent-second-friction`: 574;
* `exposed-seventh`: 410;
* `tritone-exposure`: 209;
* `unresolved-accented-clash`: 126;
* `open-consonance`: 49.

Representative score windows:

* `modal-cadence`, ticks 9600, 17760, and 26400: bass C# under tenor G, alto D, soprano D. The same sonority repeats: tritone, minor-second pressure, and pitch-class unison on D. This reads as a stock clash, not as a developed episode.
* `circle-fifths`, tick 12480: bass C, tenor C, alto D, soprano D. The entry is dominated by exact pitch-class stacks and adjacent seconds. Tick 16320 repeats the same pattern on F/G and G/G/G.
* `tight-stretto`, tick 9600: bass C#, tenor D, alto D, soprano D. The line is dense, but the density comes from pitch-class stacking and minor-second friction rather than clear stretto imitation.
* `dense-modal`, tick 20160: bass B, tenor C, alto F, soprano C. The window combines B/C seconds, B/F tritone, and C/C pitch-class unison during a bass subject.

Theory basis: dissonance is not a defect when it has preparation, role, and resolution. Here the repeated surface is often the same vertical construction around different entries, so the listener hears a generator habit more than contrapuntal rhetoric.

Diagnostics coverage: the metrics correctly locate the issue, but they can understate the musical severity when they reclassify many windows as passing, prepared, or color. The repeated formula itself needs a diagnostic and a generator response.

Project response: Phase 13U should add a reusable-entry-formula detector and repair entry support generation so recurring severe sonorities must vary functionally or be rejected.

### 3. Voice independence remains the central beauty blocker

Phase 13T split broad lockstep and pitch-class-unison axes by function, but the score windows still show too much coupled motion and pitch-class reinforcement.

Affected seeds: all 22 for broad pitch-class unison and all 22 for broad duration lockstep. Highest-risk examples remain `modal-dorian`, `long-arc`, `bach-001`, and `dark-episode`.

Score-level symptom: the voices frequently share duration grids and pitch classes while the entry line is active. Even when exact same-pitch collision is low, octave-separated pitch-class reinforcement can erase contrapuntal independence in a same-timbre organ texture.

Theory basis: independent counterpoint needs separate melodic agency. Functional doubling can support cadence or color, but continuous register-separated pitch-class reinforcement makes the texture sound arranged in blocks rather than woven from lines.

Diagnostics coverage: the split into `voicePairFunctions` is helpful, but the current local sentinels for long pitch-class unison do not yet provide enough trustworthy location evidence for musical review. Some representative sentinel locations point to broad section starts rather than the most musically exposed span.

Project response: Phase 13U should promote score-window localization for voice-pair coupling and make independence a generator target, not only a metric explanation.

### 4. Fragment-function evidence does not yet prove development

The initial subject corpus is healthier than earlier phases: 7 initial subject families, 4 rhythm patterns, top initial family share 0.227. The remaining issue is later material.

The top subject-fragment family share remains 0.545 across the 22 seed bundle. High-risk seed examples:

* `quiet-cadence`: top fragment family share 0.485;
* `angular-answer`: 0.313;
* `modal-cadence`: 0.303;
* `dense-modal`: 0.303;
* `dark-episode`: 0.281;
* `ornament-test`: 0.265.

Theory basis: motivic economy is good fugue craft only when recurrence changes harmonic goal, contour, entry pressure, sequence direction, cadence function, or texture. A function label is not enough if the audible material still feels like the same short cell reinserted into many sections.

Diagnostics coverage: `fragmentFunctionEvidence` is a useful explanation layer, but it currently risks accepting labels as development. The metric expresses part of musical goodness, but not the listener's sense of transformation.

Project response: Phase 13U should require fragment recurrences to earn a score-level transformation claim: different contour pressure, cadence role, harmonic destination, or voice-leading consequence visible in the surrounding notes.

### 5. Modal and angular seeds still weaken counter-subject identity

Focused low-retention seeds:

| Seed | Aggregate retention | Altered windows | Recognizable windows |
| --- | ---: | ---: | ---: |
| `modal-answer` | 0.545 | 13 | 28 |
| `dense-modal` | 0.571 | 18 | 23 |
| `modal-cadence` | 0.573 | 16 | 25 |
| `angular-answer` | 0.591 | 15 | 25 |
| `modal-dorian` | 0.632 | 14 | 27 |

Theory basis: modal color can alter interval content, but the counter-subject still needs a memorable rhythm and contour. When it is frequently altered or absorbed into support texture, the result sounds less like a fugue and more like subject entries over generic accompaniment.

Diagnostics coverage: the current aggregate retention and window evidence are useful. They locate the problem, but they do not yet force a generation change.

Project response: Phase 13U should treat modal counter-subject preservation as a musical objective. Existing compatibility with the current modal support formula is not a constraint when it weakens fugal craft.

### 6. Current metrics are defect locators, not beauty judges

The metrics represent musical goodness when they point back to concrete score symptoms: repeated entry sonority formulas, all-seed voice coupling, high fragment concentration, and weak modal counter-subject identity.

They fail as beauty judges in three ways:

* the reference aggregate can appear green while score-window review still finds systemic musical problems;
* diagnostic reclassification can make metrics look more explainable without making the score more beautiful;
* function labels can describe a passage without proving that the passage is musically convincing.

Project response: future adoption claims must cite representative score windows and explain the musical behavior. A metric can support adoption only when the corresponding score windows sound or read better, not merely when the axis is lower or reclassified.

## Structural Hypothesis

Symptom: many seeds sound or read as if independent voices are projected from a small set of support formulas: the entry line is surrounded by pitch-class stacks, adjacent seconds/sevenths, and shared duration grids; later episodes reuse a small subject-fragment vocabulary.

Repeated pattern: modal, circle-fifths, tight-stretto, contrary, and dense seeds all show the same vertical entry construction. The issue also appears in broad all-seed voice-pair coupling and in fragment-family concentration.

Theory basis: fugue craft depends on recognizable subjects and counter-subjects interacting as lines. Repeated vertical formulas can satisfy local labels while weakening independent melodic agency and long-range development.

Evidence strength: confirmed for generated ScoreEvent structure and diagnostics; plausible for listening. Human pairwise listening remains incomplete.

Project response: insert Phase 13U before Phase 8. The next phase should rebuild generator choices from score-window beauty evidence, not tune the existing metrics into a pass state.

## Plan Change

Phase 8 no longer resumes after Phase 13T. The next implementation phase is Phase 13U: score-window beauty rewrite.

Phase 13U priorities:

1. Reusable entry formula detector: group entry windows by vertical interval set, support voice pattern, beat strength, section role, and resolution path.
2. Entry-support generator repair: reject repeated pitch-class-stack plus second/seventh/tritone formulas unless the passage has a clear prepared, passing, cadence, or stretto function.
3. Voice-pair independence localization: record the actual exposed spans for mechanical coupling and pitch-class reinforcement, not only section-level summaries.
4. Fragment transformation review: require repeated fragments to show audible transformation in contour, harmonic target, cadence approach, density, inversion, sequence direction, or voice assignment.
5. Modal counter-subject preservation: keep modal color while protecting counter-subject rhythm and contour from support-formula overwrite.
6. Metric truthfulness gate: every metric used for adoption must map to seed, tick, voices, role, score symptom, and an agent-side musical judgement.

Remaining gaps:

* No human pairwise listening was performed in this pass.
* Literature claims are source-family level, not edition-cited.
* Phase 13U is a plan change only; no generator repair has been implemented yet.
