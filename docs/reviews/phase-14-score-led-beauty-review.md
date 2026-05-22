# Phase 14 Score-Led Beauty Review

This review records a score-led audit after Phase 13Y/13Z planning. It generated the standard 22 seed review bundle at 129600 ticks under `samples/phase-13aa-score-beauty-audit`, then inspected ScoreEvent windows for those seeds plus `random-listen-check` and `seed-0zereox-1v729ih`.

The purpose is not to grade the music by metrics. The purpose is to ask whether the generated scores are musically beautiful as counterpoint and fugue, and whether the current metrics explain that beauty.

## Findings

### 1. The reference aggregate is a false musical acceptance signal

Affected seeds: all 22 bundle seeds.

The review bundle reports zero seeds outside the current reference-profile bands, yet the generated scores still show score-window problems that are easy to see from the notes:

* pitch-class unison duration is review-required in every inspected seed;
* duration-based lockstep is review-required in every inspected seed;
* entry-severe-interval duration is review-required in 18 of the 22 bundle seeds;
* the bundle-level subject-fragment vocabulary still concentrates around one fragment family in 12 of 22 seeds.

This means the reference aggregate is useful as a coarse safety signal, but it is not a beauty signal. It can say "nothing looks outside the placeholder profile" while the score still sounds coupled, formulaic, and underdeveloped.

Theory basis: Fux/species counterpoint for line independence and controlled dissonance; Bach/fugue analysis for subject recurrence, counter-subject identity, and developmental function; generative-music evaluation literature as a source family for not substituting proxy metrics for musical judgement.

Current diagnostics coverage: partial. The quality vector exposes several symptoms, but the reference aggregate and Phase 7B readiness can still read as green.

Project response: Phase 14 must make score-window musical acceptance the top-level adoption rule. Metrics may support the judgement only when they localize to a seed, tick, voice pair, role, and musical function.

### 2. Entry continuity is musically weaker than the classifier suggests

Affected seeds: all 24 inspected seeds at the exposition bass answer; post-exposition examples include `fugue-smoke`, `lyrical-line`, `close-imitation`, and `contrary-answer`.

Every inspected score has the first bass answer at tick 5760 with all already-entered outside voices ending at the entry. Some windows are currently classified as continuity-supported because a delayed support note follows, but the score still articulates the bass answer as a collective reset rather than as a new entry into living counterpoint.

Representative windows:

* `fugue-smoke`, tick 5760: alto, soprano, and tenor all stop before the bass answer; the entry starts with alto, soprano, tenor, and bass rearticulated together.
* `fugue-smoke`, tick 52320: a later bass subject return starts with alto, soprano, tenor, and bass all onset together, with alto/bass/soprano/tenor stacked on C/G-related support.
* `seed-0zereox-1v729ih`, tick 5760: the classifier gives delayed support credit, but no outside voice carries through the bass answer.

Theory basis: Fux/species counterpoint and tonal fugue practice. Existing voices should normally continue, suspend, resolve, or stagger unless a cadence or tutti articulation prepares the collective attack.

Current diagnostics coverage: partial and too permissive. "Delayed support" is being counted as continuity even when no voice actually carries through the entry.

Project response: Phase 13X and Phase 13Y remain necessary, but Phase 14 should raise the acceptance bar: continuity-supported must mean audible line continuity, not merely a later support note.

### 3. Voice independence is still more reinforcement than counterpoint

Affected seeds: all 24 inspected seeds; worst examples include `close-imitation`, `bright-answer`, `dark-episode`, `ornament-test`, and `contrary-answer`.

The score windows show too many places where voices move as doubled support rather than independent lines. The Phase 13V line-agency summary confirms the score reading: the average agency ratio across the 24 inspected seeds is 0.22, and 15 seeds are below 0.25. Several seeds have zero independent spans in that summary.

Representative windows:

* `minor-entry`, tick 9840: alto has the subject while bass, soprano, and tenor all articulate short same-rhythm support around F#/Eb, producing a block texture rather than contrapuntal dialogue.
* `modal-dorian`, tick 13680: soprano has the subject, but alto and bass move in the same short support rhythm while tenor holds the counter-subject.
* `bach-001`, tick 12480: bass subject, alto counter-subject, and tenor free-counterpoint all land on the same pitch class, creating reinforcement rather than invertible counterpoint.

Theory basis: species counterpoint for contrary/oblique motion, independence of rhythm, and avoiding exposed perfect reinforcement; fugue practice for maintaining recognizability of independent voices during entries.

Current diagnostics coverage: partial. Duration lockstep and pitch-class unison expose the symptom, but they do not yet tell whether the passage is a prepared cadence, stretto compression, support texture, or a loss of contrapuntal agency.

Project response: Phase 14 should introduce a score-window line-agency review gate that classifies active spans by function and requires the generator to create actual independent alternatives, not just relabel reinforcement as functional.

### 4. Counter-subject identity does not survive enough entries

Affected seeds: all 24 inspected seeds have counter-subject preservation below 0.5 in the current summary. Seeds with no preserved windows in this pass include `minor-entry`, `circle-fifths`, `sparse-cadence`, `bright-answer`, `dark-episode`, `contrary-motion`, `restless-line`, `tight-stretto`, `quiet-cadence`, and `seed-0zereox-1v729ih`.

The scores often introduce something called a counter-subject, but later support formulae overwrite it with short harmonic support, pitch-class doubling, or entry-friction patterns. The result is a fugue-like surface with weak invertible counterpoint: subject entries remain identifiable, but the companion material does not become a durable second idea.

Theory basis: Bach/fugue source family for counter-subject recognizability and invertible counterpoint; Fux/species counterpoint for independent melodic continuation.

Current diagnostics coverage: partial. The project already has counter-subject windows, but adoption has tolerated "tradeoff" as the normal outcome.

Project response: Phase 14 should treat counter-subject survivability as a compositional requirement. A tradeoff can be accepted only when the score window shows a clearer higher-level function, such as cadence preparation, stretto compression, or a transformed but recognizable countersubject.

### 5. Phrase recurrence is not yet development

Affected seeds: `minor-entry`, `bright-answer`, `restless-line`, and `seed-0zereox-1v729ih` have top subject-stem shares near 0.47 to 0.50 in the long pass. `modal-dorian` and `random-listen-check` also repeat similar section-state strings and entry formulae.

This is not just a Phase 13Z long-run issue. The score review shows that repeated entries, short support formulae, and weak counter-subject survival combine into the same aesthetic problem: the piece knows how to continue, but not how to develop. Subject returns, episodes, and stretto-like sections still often differ by label, key, or voice while the audible material keeps the same contour and function.

Representative evidence:

* `seed-0zereox-1v729ih` repeats the subject stem `0-2-1-3-4-2-3-1` 16 times and has no preserved counter-subject windows in the current summary.
* `minor-entry` repeats the same full subject-stem family 16 times and has repeated review-required subject-return formulae.
* `modal-dorian` alternates cadence-extension and episode-sequence functions heavily, but the soprano subject-return formula repeats 12 times.

Theory basis: fugue and common-practice phrase-function source families. Repetition is valid when it changes role, tension, register, contrapuntal setting, cadence goal, or developmental pressure.

Current diagnostics coverage: partial. Phase 13R/13Z can see stem-family concentration, but the metrics still underweight the combined effect of recurrence plus weak counter-subject plus lockstep support.

Project response: Phase 13Z remains the long-run repair, but Phase 14 should unify phrase development with line agency and counter-subject survival. Development cannot be accepted by section-label diversity alone.

## Structural Hypothesis

Symptom: the music often sounds competent at the surface but not beautiful as fugue. It has recognizable subject entries, acceptable hard constraints, and green reference aggregate signals, yet it lacks living line continuity, durable counter-subject identity, and developmental contrast.

Repeated pattern: support generation and candidate scoring repeatedly choose short, same-rhythm, pitch-class-reinforcing support around entries. Section planning changes state labels, keys, and cadence labels faster than it changes the actual contrapuntal role of the material. Metrics localize some symptoms, but adoption still allows green aggregate readiness to coexist with unconvincing score windows.

Theory basis: Fux/species counterpoint for line independence and dissonance treatment; Bach/fugue source family for counter-subject identity, entry continuity, episode function, and stretto development; common-practice phrase theory for function-bearing recurrence.

Evidence strength: confirmed across 22 generated review-bundle seeds plus two additional inspected seeds. No human listening pass was completed for all 24 seeds; the review is based on generated MIDI availability, ScoreEvent windows, diagnostics localization, and agent-side score reading.

Project response: add Phase 14 after Phase 13Z and before Phase 8. Phase 14 is not a metric-tuning phase. It is a score-led composition-model rebuild that may break old expected values, compatibility assumptions, or guardrail margins when they conflict with musical beauty.

## Plan Impact

Phase 13X, Phase 13Y, and Phase 13Z stay in the route because they each address confirmed local blockers. They are not enough for Phase 8.

Phase 14 becomes the new Phase 8 prerequisite:

1. Define score-window musical acceptance before metric acceptance.
2. Rebuild entry support so at least one outside voice normally carries, suspends, resolves, or staggers through important entries.
3. Rebuild line-agency scoring and candidate generation so independent motion is generated, not only detected.
4. Make counter-subject survivability a first-class generator objective.
5. Unify phrase-development diagnostics with counter-subject and line-agency evidence.
6. Demote reference aggregate and Phase 7B readiness to safety/context signals when they contradict score-window beauty.

Remaining gaps: no broad human listening pass, no external citation verification beyond source-family grounding, and no implementation changes in this review.
