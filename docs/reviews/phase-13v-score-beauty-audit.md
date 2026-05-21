# Phase 13V Score Beauty Audit

This review rechecks the current default generator after Phase 13U. The goal is to judge generated scores, not to accept the model because diagnostics are more explanatory. Existing model compatibility, old guardrail margins, and old expected values are not adoption constraints when they conflict with musical beauty.

Evidence bundles:

```sh
pnpm fugematon review --out samples/phase13v-score-beauty-audit --ticks 129600 --performance-profile organ-default
pnpm fugematon review --out samples/phase13v-score-beauty-audit-strict --ticks 129600 --performance-profile strict-counterpoint
```

Reviewed seed set: `bach-001`, `fugue-smoke`, `minor-entry`, `wide-key`, `lyrical-line`, `modal-dorian`, `circle-fifths`, `close-imitation`, `sparse-cadence`, `bright-answer`, `dark-episode`, `ornament-test`, `long-arc`, `contrary-motion`, `restless-line`, `tight-stretto`, `quiet-cadence`, `angular-answer`, `modal-answer`, `modal-cadence`, `contrary-answer`, and `dense-modal`.

Focused score windows were inspected for `bach-001`, `fugue-smoke`, `modal-cadence`, `circle-fifths`, `tight-stretto`, `contrary-motion`, `dense-modal`, `modal-dorian`, `long-arc`, `dark-episode`, and `sparse-cadence`.

Source family basis: Fux/species counterpoint for consonance, dissonance preparation and resolution, contrary or oblique motion, and voice independence; common-practice fugue for entry clarity, counter-subject recognizability, episode development, cadence pacing, and stretto density. Exact editions and page citations were not rechecked, so these remain source-family claims.

## Findings

### 1. Phase 13U made metrics more truthful, but not sufficient as beauty evidence

The `organ-default` and `strict-counterpoint` bundles have identical score diagnostics. The performance profile changes rendering, not the composition model.

Current aggregate signals:

* `pitchClassUnisonDuration` is outside profile for all 22 seeds.
* `durationBasedLockstep` is outside profile for all 22 seeds.
* `entrySevereIntervalDuration` is outside profile for 18 of 22 seeds.
* The bundle still has 164 local sentinels: 97 unresolved entry severe intervals and 67 long pitch-class unison spans.
* `subjectFamilyDiversity` still reports top subject-fragment family share 0.545.

Theory basis: hard-constraint pass and localized evidence are necessary, but they do not prove that voices act as independent melodic agents or that repeated material develops convincingly.

Diagnostics coverage: better than Phase 13T. The metrics point back to seed, tick, voice pair, and symptom. The remaining failure is that a truthful label such as `functionally-justified`, `register-separated color`, or `developed` can still overstate the musical result when the same construction repeats too often.

Project response: Phase 8 remains deferred. Add Phase 13V before Phase 8 to make line-agency, contrast, and long-run development the next quality center.

### 2. Repeated entry formulas are still audible score patterns

The 22 seed bundle records 189 repeated entry formula summaries. 144 of them are `review-required`.

Representative windows:

| Seed | Tick | Score symptom |
| --- | ---: | --- |
| `bach-001` | 12480 | Bass, tenor, and alto all state A# pitch classes around a bass subject window. |
| `circle-fifths` | 12480 | Bass/tenor stack C while alto/soprano stack D, making the entry sound like a two-block sonority. |
| `tight-stretto` | 13440 | Tenor F# subject is surrounded by bass/alto/soprano G pitch classes. |
| `modal-answer` | 9840 | A recurrent subject-return formula combines exposed seventh, tritone, unresolved accented clash, and pitch-class stack. |
| `sparse-cadence` | 25200 | Bass D# entry is framed by three F# support pitch classes. |

Theory basis: dissonance around an entry can be expressive when the line prepares and resolves it. Repetition of the same vertical construction weakens entry rhetoric because the listener hears a stock sonority instead of contrapuntal invention.

Diagnostics coverage: the detector finds the formulas. It does not yet reject overuse of the same formula family as a composition problem.

Project response: Phase 13V should add an entry-formula novelty budget and make repeated pitch-class-stack formulas compete against alternative support-line plans.

### 3. Voice-pair evidence localizes the problem, but the score still leans on reinforcement

The bundle records 396 localized voice-pair spans:

* 251 `pitch-class-reinforcement`;
* 83 `subject-support`;
* 62 `color-doubling`;
* 0 `mechanical-coupling` spans under the current classifier.

Representative windows:

* `long-arc`, tick 13440: bass, tenor, and alto all reinforce A# across three registers.
* `dark-episode`, tick 13920: bass and tenor both hold D while alto and soprano carry nearby active notes.
* `modal-dorian`, tick 13920: bass and alto reinforce E around a soprano D# entry and tenor G# counter-subject.

Theory basis: functional doubling can be useful at a cadence or for color, but same-timbre pitch-class reinforcement across much of the score reduces the independence expected of fugue texture.

Diagnostics coverage: the classifier is useful, but it is now too permissive. When no span is called mechanical despite all seeds exceeding pitch-class unison and lockstep profile, the metric is describing function more readily than beauty.

Project response: Phase 13V should score line agency directly: rhythmic stratification, contrary or oblique support, independent contour, register separation, and exposed doubling density by phrase role.

### 4. Fragment transformation claims still do not prove long-run development

The bundle records 110 fragment transformation claims, and the top subject-fragment family still appears in 12 of 22 seeds. Focused high-risk examples include `angular-answer` 0.313, `modal-cadence` 0.303, `dense-modal` 0.303, and `dark-episode` 0.281.

Theory basis: fugue can rely on motivic economy, but recurrence needs a perceptible change of harmonic destination, sequence direction, cadence function, density, inversion, or voice assignment. A label is not enough if many sections still read as the same short cell placed into different states.

Diagnostics coverage: `fragmentFunctionEvidence` records transformations, but it does not compare whether the claims create audible contrast across adjacent sections or over long spans.

Project response: Phase 13V should require adjacent-section and long-window contrast evidence, not only per-fragment transformation claims.

### 5. Counter-subject preservation is dominated by accepted tradeoffs

Across the bundle, counter-subject windows classify as 80 preserved, 839 tradeoff, and 30 weak. Focused seeds such as `circle-fifths`, `long-arc`, `bach-001`, and `sparse-cadence` have almost no preserved windows under the current judgement.

Theory basis: modal color and dense entries can alter a counter-subject, but fugal craft depends on a recognizable companion idea. When most windows are accepted as tradeoffs, the generator can preserve the subject while letting the counter-subject become generic support.

Diagnostics coverage: the metric is honest about the tradeoff. It does not yet enforce a minimum density of preserved, recognizable counter-subject returns.

Project response: Phase 13V should make counter-subject survivability a generation objective, not only a review note.

### 6. The metrics express defects better than beauty

Current metrics express musical goodness when they expose concrete defects: repeated entry formulas, all-seed lockstep and pitch-class reinforcement, unresolved entry friction, fragment-family concentration, and counter-subject tradeoffs.

They fail as beauty measures when:

* diagnostic reclassification makes a problem look understood without making the passage more beautiful;
* function labels such as `subject-support`, `color-doubling`, or `developed` are treated as acceptance proof;
* bundle-level counts do not ask whether adjacent sections provide sufficient contrast for long-duration listening.

Project response: future adoption claims must cite representative score windows and a musical judgement about line agency, entry rhetoric, development, and listening fatigue. Metric improvement alone is not an acceptance claim.

## Structural Hypothesis

Symptom: the generated fugues often read as subject entries over reusable support formulas rather than independent lines developing a subject and counter-subject.

Repeated pattern: across modal, circle-fifths, stretto, long-arc, sparse, and Bach-like seeds, entry support frequently forms pitch-class stacks and adjacent friction; later sections reuse a small fragment vocabulary while voice pairs reinforce pitch classes across registers.

Theory basis: fugue beauty depends on recognizable subjects and counter-subjects, independent line agency, purposeful dissonance, and perceptible development. Reusable vertical support formulas can satisfy local diagnostics while weakening the musical rhetoric.

Evidence strength: confirmed for generated ScoreEvent windows and diagnostics; plausible for listening. Human pairwise listening remains incomplete.

Project response: insert Phase 13V before Phase 8. The next phase should change the generator and metrics around line agency, formula novelty, and long-run contrast rather than treating Phase 13U evidence as sufficient handoff.

## Plan Change

Phase 8 no longer resumes after Phase 13U. The next implementation phase is Phase 13V: line-agency and long-run beauty rewrite.

Phase 13V priorities:

1. Line-agency model: require independent rhythm, contour, register, and contrary or oblique support evidence for active voice pairs.
2. Entry-formula novelty budget: limit repeated pitch-class-stack plus friction formulas unless score-window evidence shows a distinct contrapuntal function.
3. Counter-subject survivability: preserve recognizable rhythm and contour in enough returns that tradeoff windows do not dominate the score.
4. Long-window development: compare adjacent sections and long spans for contrast in fragment use, cadence goal, density, inversion, sequence direction, and voice assignment.
5. Metric truthfulness upgrade: distinguish diagnostic explanation, musical improvement, and beauty acceptance in every adoption-relevant axis.
6. Focused listening gate: fill `organ-default` and `strict-counterpoint` notes for representative, boundary, modal, stretto, and long-run fatigue seeds before Phase 8 resumes.

Remaining gaps:

* No human pairwise listening was performed in this pass.
* Literature claims are source-family level, not edition-cited.
* No generator repair has been implemented yet; this review changes phase scope and priorities.
