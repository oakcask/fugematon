# Phase 14 Beauty Replan Review

This review refreshes the Phase 14 score-led audit after generating the standard 22 seed review bundle at 129600 ticks under `samples/phase-14-beauty-replan-2026-05`. It also generated focused diagnostics for `random-listen-check` and `seed-0zereox-1v729ih`.

The question is not whether the metrics pass. The question is whether the scores read as beautiful counterpoint and fugue, and whether the metrics tell the truth about that reading.

## Findings

### 1. Metric readiness still gives false musical acceptance

Affected seeds: all 22 bundle seeds, plus `random-listen-check` and `seed-0zereox-1v729ih`.

The review bundle reports all 22 seeds as Phase 7B ready with no hard failures and `referenceDiagnostics.outsideReferenceSeedCount: 0`. The same bundle still has 288 local sentinels: 219 unresolved entry severe intervals and 69 long pitch-class unison spans. `pitchClassUnisonDuration` and `durationBasedLockstep` are `review-required` in all 22 seeds; `entrySevereIntervalDuration` is `review-required` in 18 seeds; `unresolvedEntrySevereIntervalDuration` is `review-required` in 10 seeds.

Score reading confirms the warning. The music often has clear subject labels, but the surrounding voices reinforce pitch class and duration rather than carrying independent contrapuntal intent. `circle-fifths` is the clearest local failure: the reference aggregate is green, yet the score has 28 local sentinels, including unresolved entry seconds/sevenths at ticks 6240, 9600, 12480, 16320, and later entry windows.

Theory basis: Fux/species counterpoint for controlled dissonance and independence; tonal fugue practice for entry clarity and counter-subject independence; generative-music evaluation source family for not treating proxy metrics as musical judgement.

Current diagnostics coverage: partial. Quality vector sentinels truthfully localize several problems, but Phase 7B readiness and the reference aggregate still overstate acceptance.

Project response: Phase 14 remains a score-led rebuild. Metric readiness is not a beauty gate. Metrics must point to a score window, role, theory basis, and generator response before they can influence adoption.

### 2. Entry continuity is structurally repaired but musically under-accepted

Affected seeds: all 22 bundle seeds, `random-listen-check`, and `seed-0zereox-1v729ih`.

Every inspected first bass answer at tick 5760 has the same shape: soprano carries or delays across the entry, while alto and tenor both end at the entry and re-articulate at the entry. The classifier calls all inspected first-bass windows `continuity-supported`, but the score still reads like a coordinated texture reset around the important answer.

Representative windows:

* `circle-fifths`, tick 5760: alto counter-subject, bass answer, and tenor subject all attack together while soprano only decorates around the boundary. At tick 6240 all four voices align again, with a severe entry-local second/seventh sentinel immediately after the answer begins.
* `seed-0zereox-1v729ih`, tick 5760: alto and tenor reset on the entry, soprano decorates in short values, and the following support quickly collapses into repeated same-rhythm free-counterpoint gestures.

Theory basis: species counterpoint and tonal fugue practice. A fugue entry should normally be supported by carried, suspended, resolving, staggered, or cadentially prepared material; one carried voice does not prove real contrapuntal continuity when two other voices reset together.

Current diagnostics coverage: misleading. `entryBoundaryContinuity` detects the old all-voice reset repair, but `continuity-supported` is too broad as an acceptance label.

Project response: Phase 14A must introduce score-window acceptance before Phase 14B changes generation. Phase 14B should then require entry support to prove audible line continuity, not merely one non-resetting voice.

### 3. Line agency is audible, not just numeric, and it remains weak

Affected seeds: all 24 inspected seeds. Lowest-agency seeds in the bundle are `bright-answer`, `dark-episode`, `minor-entry`, `ornament-test`, and `restless-line`.

The line-agency metric matches the score reading for the worst seeds: low-agency passages sound like harmonic reinforcement. In `bright-answer` at tick 9120, the bass subject and alto counter-subject are shadowed by short soprano/tenor free-counterpoint in the same direction and duration shape. At tick 12960, the support voices again move in parallel short values around a tenor subject. This is legible as generated texture, but not as living four-part counterpoint.

Theory basis: Fux/species counterpoint for contrary/oblique motion, rhythmic independence, and avoiding exposed reinforcement; fugue practice for keeping the subject audible without reducing other voices to block support.

Current diagnostics coverage: useful but not sufficient. `lineAgency.agencyRatio` identifies risk, but it cannot decide whether a reinforcing passage is cadential, stretto-functional, or merely mechanical without score-window review.

Project response: keep line agency `review-required`. Phase 14C should add independent rhythmic and contour alternatives to the generator before treating the metric as adoption evidence.

### 4. Counter-subject identity is still not a durable second idea

Affected seeds: all 24 inspected seeds. In the 22 seed bundle, 10 seeds have preservation ratio 0: `bright-answer`, `circle-fifths`, `contrary-motion`, `dark-episode`, `minor-entry`, `quiet-cadence`, `restless-line`, `sparse-cadence`, `tight-stretto`, and `wide-key`. The focused seed `seed-0zereox-1v729ih` also has preservation ratio 0.

The score can label counter-subject material, but later windows usually convert it into short support, pitch-class reinforcement, or local collision management. `circle-fifths` at ticks 27840 and 30960 shows this clearly: the subject is present, but the companion material behaves like support texture rather than a memorable invertible idea.

Theory basis: tonal fugue and Bach/fugue source family for counter-subject recognizability and invertible counterpoint; species counterpoint for independent continuation.

Current diagnostics coverage: strong as a review signal. The preservation ratio correctly names the weakness, but accepting "tradeoff" as the usual outcome would turn a fugue into a subject-entry texture.

Project response: Phase 14C should make counter-subject survivability a generator objective. A tradeoff is acceptable only when the score window shows a higher musical function such as cadence preparation, stretto compression, or transformed but recognizable counter-subject material.

### 5. Phrase development improved, but beauty still needs a stronger hierarchy

Affected seeds: all 22 bundle seeds and focused seeds.

Phase 13Z reduced the earlier long-run phrase-family concentration enough that no inspected seed has `phase13ZReview.reviewRequired: true`. That is a real improvement. The refreshed bundle still has 204 mechanical-reuse windows and 280 function-bearing windows, so the score now alternates between improved development and still-mechanical recurrence.

This mixed result means Phase 14 should not roll back Phase 13Z. Instead, phrase-development rewards must sit below entry dissonance, line agency, and counter-subject survival. A novel phrase that creates unprepared semitone friction or weakens independent voices is not musically better.

Theory basis: fugue development and common-practice phrase-function source families. Repetition is beautiful when role, register, tonal goal, density, or contrapuntal pressure changes.

Current diagnostics coverage: truthful but incomplete. `phase13ZReview` now separates mechanical reuse from function-bearing recurrence, but it does not decide whether the resulting local counterpoint is beautiful.

Project response: Phase 14A0 and 14B should triage entry and weak-dissonance windows before broader phrase novelty. Phase 14C should then unify phrase development with counter-subject and line-agency evidence.

## Structural Hypothesis

Symptom: the generated music is often acceptable by hard constraints and reference aggregates but not yet beautiful as fugue. It has subject entries and continuation, but not enough living line continuity, counter-subject memory, or controlled dissonance.

Repeated pattern: candidate selection favors short support gestures that share rhythm, reinforce pitch class, and repair local harmony cheaply. This lets aggregate readiness stay green while score windows still sound like entry formulas and support texture. Phase 13Z improved long-run recurrence, but phrase novelty can still sit on top of weak entry support and fragile counter-subject material.

Evidence strength: confirmed across the standard 22 seed bundle plus two focused seeds from generated diagnostics and ScoreEvent windows. No broad human listening pass was completed.

Project response: reorganize Phase 14 around a beauty acceptance ladder:

1. Local entry dissonance and continuity must be acceptable in the score.
2. Independent line agency must be generated, not only diagnosed.
3. Counter-subject material must survive or transform recognizably.
4. Phrase development must improve musical function without worsening the first three layers.
5. Only then may aggregate metrics support adoption.

## CI / Review Scope

| Item | Classification | Reason | Action |
| --- | --- | --- | --- |
| Standard 22 seed review bundle | `review-required` | Broad score-window and metric-truthfulness evidence, too aesthetic and expensive for PR CI blocking. | Keep as review bundle evidence. Do not promote the whole bundle to PR CI. |
| `random-listen-check` | `review-required` | Focused ad hoc seed for metric truthfulness and line-agency control. | Keep review-only. |
| `seed-0zereox-1v729ih` | `review-required` / `manual-listening` | Focused fatigue seed with low agency, no counter-subject preservation, and review-required pitch-class/lockstep axes. | Keep for focused score and listening review. Do not add to CI until a deterministic sentinel exists. |
| Phase 7B readiness and `referenceDiagnostics.outsideReferenceSeedCount` as beauty acceptance | `remove-or-archive` for beauty acceptance; `ci-observed` for safety/context | They pass while score-window beauty still fails. | Demote from beauty acceptance. Keep observed context only. |
| `pitchClassUnisonDuration`, `durationBasedLockstep`, `entrySevereIntervalDuration`, `unresolvedEntrySevereIntervalDuration` aggregate axes | `review-required` | They locate risk but require role, cadence, entry, and resolution context to judge beauty. | Keep as score-window review inputs. Do not CI-block on aggregate values. |
| `entryBoundaryContinuity.continuity-supported` | `review-required` | One carried voice masks two outside-voice resets in all inspected first-bass windows. | Refine before any CI promotion. |
| `lineAgency.agencyRatio`, `counterSubjectSurvivability.preservationRatio`, `entryFormulaNovelty.noveltyRatio`, `phase13ZReview` windows | `review-required` | Musically meaningful but not pass/fail without score-window inspection and listening. | Keep in review bundle and Phase 14 acceptance ladder. |
| Old exact expected values or guardrail margins that reject score-window improvements | `remove-or-archive` | Preserving old numbers can block more beautiful generated music. | Archive historical values when score-window review confirms a better baseline. |

## Plan Impact

Phase 14 remains before Phase 8, but its implementation order is tightened:

1. 14A0: post-13Z entry and weak-dissonance triage remains first.
2. 14A: add a score-window acceptance harness before generator adoption.
3. 14B: rebuild entry support and weak-dissonance handling.
4. 14C: rebuild line-agency, counter-subject survivability, and phrase-development generation in that order.
5. 14D: demote or archive metrics that cannot explain accepted score windows.
6. 14E: regenerate bundle evidence and focused `organ-default` / `strict-counterpoint` listening notes.

Phase 8 remains deferred. Infinite playback must not use segment boundaries, performance profiles, or UI presentation to hide weak counterpoint, formulaic entries, counter-subject loss, or metric false acceptance.
