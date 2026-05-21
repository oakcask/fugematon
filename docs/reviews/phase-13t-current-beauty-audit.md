# Phase 13T Current Beauty Audit

This review rechecks the current default generator after Phase 13S. It follows the user request to read generated scores for musical beauty, counterpoint, fugue craft, and theory instead of accepting the output because metrics improved.

Evidence bundle:

```sh
pnpm fugematon review --out samples/phase13s-current-beauty-audit --ticks 129600
```

Focused ScoreEvent windows were generated for `bach-001`, `fugue-smoke`, `minor-entry`, `modal-cadence`, `modal-dorian`, `circle-fifths`, `tight-stretto`, `contrary-motion`, `dense-modal`, `angular-answer`, and `sparse-cadence`.

Reviewed seed set: the standard 22 seed review bundle: `bach-001`, `fugue-smoke`, `minor-entry`, `wide-key`, `lyrical-line`, `modal-dorian`, `circle-fifths`, `close-imitation`, `sparse-cadence`, `bright-answer`, `dark-episode`, `ornament-test`, `long-arc`, `contrary-motion`, `restless-line`, `tight-stretto`, `quiet-cadence`, `angular-answer`, `modal-answer`, `modal-cadence`, `contrary-answer`, `dense-modal`.

Source family basis: Fux/species counterpoint for consonance, exposed dissonance, contrary/oblique motion, and voice independence; common-practice fugue and tonal harmony for entry treatment, counter-subject recognizability, episode function, stretto, cadence, and motivic development. Specific editions were not verified in this pass, so theory claims remain source-family level rather than page-cited claims.

## Findings

### 1. The current scores still build entry windows from unison stacks plus adjacent-second friction

Representative windows show a repeated sonority type rather than isolated accidents:

* `modal-cadence`, tick 9600: soprano and alto form exact pitch-class unison on D while bass sits C# below the same upper sonority. The active vertical field contains both unison and minor-second pressure at the start of an episode subject-fragment.
* `modal-cadence`, tick 22560: soprano and bass share C# while alto is D. The subject entry is framed by pitch-class unison and a 2度 rub against the support voice.
* `circle-fifths`, tick 12480: soprano and alto share D, tenor and bass share C, and the vertical sonority is dominated by stacked unison plus seconds.
* `tight-stretto`, ticks 13440 and 28320: the same G/F# field recurs around tenor subject entries, with soprano/alto/bass sharing G against tenor F#.

Affected seeds: most exposed in `modal-cadence`, `circle-fifths`, `contrary-motion`, and `tight-stretto`; the quality vector also reports entry severe interval review signals across 18 of 22 seeds.

Theory basis: exposed seconds and sevenths can be expressive when prepared and resolved, but a fugue entry should usually clarify the subject. When the generator repeatedly frames entries with pitch-class unison stacks and unresolved adjacent seconds, the listener hears a formulaic clash instead of contrapuntal tension.

Diagnostics coverage: useful but incomplete. The metrics locate `unresolved-entry-severe-interval` sentinels, but they do not explain the vertical construction: the same entry window often combines exact pitch-class duplication, short free-counterpoint support, and a neighboring 2度. The missing diagnostic is a role-aware vertical sonority classifier for entry windows.

Project response: insert Phase 13T before Phase 8. The fix belongs in support-line generation, entry spacing, register planning, and dissonance-role classification, not in UI or threshold tuning.

### 2. Voice independence is the central unresolved beauty problem, not a residual visualization concern

The bundle reports duration-based lockstep outside profile for all 22 seeds and pitch-class unison duration outside profile for all 22 seeds. The score windows confirm that this is musically audible: voices frequently share pitch classes across registers while moving in the same rhythmic grid.

Affected seeds: all 22 for duration lockstep and pitch-class unison. Highest duration lockstep contributors include `modal-dorian`, `long-arc`, and `bach-001`; highest pitch-class unison contributors include `dark-episode`, `long-arc`, and `modal-dorian`.

Theory basis: counterpoint is not simply avoiding range failures and voice crossing. Independent voices need distinct rhythmic profiles, contrary or oblique support, and vertical spacing that lets subject, answer, counter-subject, and free counterpoint remain audibly separate.

Diagnostics coverage: strong as a warning, weak as an adoption model. The current metrics correctly say review is required, but Phase 8 cannot merely surface these values in a visualizer. If every seed has the same broad failure class, the musical response must precede infinite-playback work.

Project response: Phase 13T should make voice-pair independence a blocker again, but as score-window repair and metric reconstruction, not as a single absolute count. The required evidence is per-entry and per-section: which voice pair locks, whether the motion is supporting or mechanical, and whether cadence/episode/stretto function justifies it. The current duration-based lockstep axis should be split into function-aware categories before it is used as adoption evidence.

### 3. Subject rhetoric improved, but fragment vocabulary still narrows the long-run musical language

Phase 13S succeeded in moving the initial subject corpus away from a single equal-pulse middle-climax design. The current bundle has 7 initial subject families, 4 rhythm patterns, and 3 local climax indexes.

The remaining problem is not the initial subject. It is the recurrence language after the subject: the top subject-fragment family `0-2-1-3` appears in 12 of 22 seeds, and the second family `0-1-3-2` appears in 9 of 22. In long-form playback this makes episodes feel like substitutions from two short cells rather than development through varied sequence, inversion, cadence preparation, and textural change.

Affected seeds: top fragment family affects `angular-answer`, `bach-001`, `bright-answer`, `dark-episode`, `dense-modal`, `minor-entry`, `modal-cadence`, `modal-dorian`, `ornament-test`, `quiet-cadence`, `restless-line`, and `sparse-cadence`.

Theory basis: motivic economy is valuable in fugue, but long-run beauty depends on functional transformation. A fragment can recur if it changes harmonic goal, contrapuntal role, texture, or cadence function. Reusing two short cells across most seeds without enough role differentiation sounds mechanical.

Diagnostics coverage: good at corpus detection, incomplete at musical explanation. `subjectFamilyDiversity` correctly flags the collapse, but it cannot yet distinguish functional recurrence from filler.

Project response: Phase 13T should add phrase-function evidence for fragment recurrence: sequence direction, inversion, stretto compression, cadence extension, voice assignment, and local harmonic goal.

### 4. Modal and angular seeds retain weak counter-subject identity

Focused modal/angular seeds still sit near the old floor: `modal-answer` 0.545, `dense-modal` 0.571, `modal-cadence` 0.573, `angular-answer` 0.591, and `modal-dorian` 0.632.

Theory basis: modal color can change interval content, but the counter-subject must remain recognizable enough to support return and invertible-counterpoint expectations. When the counter-subject becomes a generic support line, the work loses fugal craft even if the subject itself is intact.

Diagnostics coverage: adequate as a warning, weak as an explanation. The metric notices low retention, but the review bundle still does not show whether identity loss comes from rhythm flattening, modal pitch substitution, register collision, or being overwritten by entry-support formulas.

Project response: Phase 13T should review counter-subject identity from windows, not only from aggregate retention. The generator should be allowed to break old compatibility to preserve recognizable counter-subject shape in modal contexts.

### 5. Current metrics are honest defect locators but still not beauty judges

The current metrics represent musical goodness when they point to a score symptom: all-seed lockstep, all-seed pitch-class unison, entry severe interval sentinels, fragment vocabulary collapse, and modal counter-subject weakness.

They fail as beauty judges when they produce a pass-like planning state after Phase 13S. Phase 13S fixed one real layer, but the current scores still contain repeated sonority formulas and mechanical voice coupling. A green hard-constraint state plus better subject diversity does not mean the music is beautiful enough for infinite playback.

Project response: Phase 8 should be deferred again. Phase 13T becomes the next phase, and its acceptance must require score-window and focused listening evidence that the metrics explain, rather than merely improve. Phase 13T should be allowed to change the metric model itself when a current axis hides the musical cause or overstates progress.

Metrics to reconsider:

* `entrySevereIntervalDuration` / `unresolvedEntrySevereIntervalDuration`: split into role-aware entry-window sonority classes so prepared/resolved dissonance is not grouped with unclassified friction.
* `durationBasedLockstep`: split by support function, cadence function, sequence/pedal behavior, and mechanical voice coupling.
* `pitchClassUnisonDuration`: split exact same-pitch collision, octave/color doubling, functional reinforcement, and mechanical duplication.
* `subjectFamilyDiversity`: extend from degree/rhythm/climax families to fragment-function diversity and cadence-role diversity.
* `counterSubjectIdentityRetention`: supplement aggregate retention with window-level counter-subject identity evidence.
* `qualityProfileComparison`: keep the current aggregate as historical evidence, but require a metric-explanation summary that maps axes to seed, tick, voice pair, section role, and musical symptom.

## Structural Hypothesis

Symptom: entry windows and later episode/stretto cells sound less like independent contrapuntal lines and more like the same support formula projected into different registers.

Repeated pattern: subject/fragment entries are often supported by short free-counterpoint notes on the same rhythmic grid, with pitch-class unison stacks plus adjacent seconds. The issue repeats across modal, circle-fifths, contrary-motion, and tight-stretto seeds.

Theory basis: fugue entries need recognizable subjects over supporting counterpoint that either consonantly frames the entry or prepares/resolves dissonance. Repeated exposed unison/second stacks weaken both beauty and contrapuntal craft.

Evidence strength: confirmed for score windows and diagnostics; plausible for listening. Focused listening notes were not filled in this pass.

Project response: insert Phase 13T before Phase 8 to repair voice-pair independence, entry sonority construction, fragment function, and modal counter-subject identity.

## Plan Change

Phase 8 no longer resumes immediately after Phase 13S. The next implementation phase is Phase 13T: voice-independence and entry-sonority rewrite.

Phase 13T priorities:

1. Entry-window sonority classifier: identify pitch-class unison stacks, adjacent seconds/sevenths, support voice, entry role, beat strength, and resolution.
2. Voice-pair independence repair: diversify rhythm and motion by voice pair and section role, with contrary/oblique support around entries and cadences.
3. Fragment-function repair: require repeated subject fragments to change harmonic goal, sequence direction, inversion, cadence role, or texture.
4. Modal counter-subject repair: preserve counter-subject recognizability while allowing modal color.
5. Metric reconstruction: split, replace, demote, or add metrics when score review shows that current aggregate axes do not explain the musical cause.
6. Metric truthfulness: a metric can support adoption only when it explains representative score windows and focused listening notes.

Remaining gaps:

* No filled focused listening templates for this audit.
* No exact-edition literature citations.
* No implementation repair yet; this review only changes phase scope and priorities.
