# Phase 14 Score-Led Beauty Review

This review records a score-led audit after Phase 13Y/13Z planning. It generated the standard 22 seed review bundle at 129600 ticks under `samples/phase-14-score-led-beauty-refresh`, then inspected those generated diagnostics and ScoreEvent windows plus two additional seeds: `random-listen-check` and `seed-0zereox-1v729ih`.

The purpose is not to grade the music by metrics. The purpose is to ask whether the generated scores are beautiful as counterpoint and fugue, and whether the current metrics truthfully express that judgement.

## Findings

### 1. Reference aggregate pass is not musical acceptance

Affected seeds: all 22 bundle seeds.

The review bundle reports `outsideReferenceSeedCount: 0`, yet the same generated scores still show unresolved beauty problems:

* `pitchClassUnisonDuration` is `review-required` in all 22 bundle seeds and both extra seeds.
* `durationBasedLockstep` is `review-required` in all 22 bundle seeds and both extra seeds.
* `entrySevereIntervalDuration` is `review-required` in 18 of the 22 bundle seeds and 20 of the 24 inspected seeds.
* the bundle-level subject-fragment vocabulary still concentrates around one fragment family in 12 of 22 seeds.
* the quality profile has 170 local sentinels, mostly unresolved entry severe intervals and long pitch-class unison spans.

The reference aggregate is therefore useful as a coarse safety/context signal, but not as a beauty signal. It can say that the score is inside a placeholder profile while the score still reads as coupled, formulaic, and underdeveloped.

Theory basis: Fux/species counterpoint for line independence and controlled dissonance; Bach/fugue source family for counter-subject identity and developmental recurrence; generative-music evaluation as a source family for not replacing musical judgement with proxy metrics.

Current diagnostics coverage: partial. The quality vector exposes several symptoms, but the reference aggregate and Phase 7B readiness can still read as green.

Project response: Phase 14 must make score-window musical acceptance the top-level adoption rule. Metrics may support the judgement only when they localize to seed, tick, voice pair, role, musical symptom, and response.

### 2. Entry continuity is better than the old failure mode, but still too permissive

Affected seeds: all 24 inspected seeds at the exposition bass answer.

The old all-outside-voice synchronized reset is repaired: every inspected first bass answer at tick 5760 has one carried outside voice, usually soprano. However, every inspected first bass answer still has exactly two outside voices ending at the entry and exactly two outside voices re-articulating at the entry. The classifier reports `continuity-supported` for all 24 first bass windows, but that classification is too easy to satisfy musically.

Representative window:

* `seed-0zereox-1v729ih`, tick 5760: soprano carries from tick 5520 to 5880, but alto and tenor both end at 5760 and re-enter at 5760 while bass begins the answer. The next support stack quickly aligns pitch classes across multiple voices, for example C at tick 6240 and F/F# related reinforcement in the following measures.

Theory basis: Fux/species counterpoint and tonal fugue practice. Existing voices should normally continue, suspend, resolve, or stagger through an entry unless a cadence or tutti articulation prepares a collective attack.

Current diagnostics coverage: partial. `entryBoundaryContinuity` now detects carry, delay, stagger, and prepared collective articulation, but `continuity-supported` is too broad: one carried outside voice can hide two simultaneous support resets.

Project response: Phase 14 should raise the acceptance bar. A window can be score-window accepted only when the carried, suspended, resolving, or staggered material creates audible line continuity, not merely when the classifier finds one non-resetting voice.

### 3. Voice independence still reads as reinforcement more often than counterpoint

Affected seeds: all 24 inspected seeds. The lowest agency examples include `close-imitation`, `bright-answer`, `dark-episode`, `ornament-test`, and `contrary-answer`.

The Phase 13V line-agency summary matches the score reading: 15 of the 24 inspected seeds have agency ratio below 0.25, and several seeds have agency ratio 0. The scores often satisfy local constraints by doubling support rhythm or pitch class rather than creating independent lines.

Representative windows:

* `seed-0zereox-1v729ih`, tick 9120: tenor carries the subject while alto and soprano move as short free-counterpoint support in the same rhythm. At ticks 9600, 9840, and 10080 the active voices repeatedly collapse onto the same pitch class.
* `seed-0zereox-1v729ih`, tick 12960: bass takes the subject, but the upper free-counterpoint pattern repeatedly aligns soprano and tenor, and several beats place three or four voices on the same pitch class.
* `minor-entry` and `bright-answer` show the same broader symptom: subject material remains identifiable, but surrounding voices reinforce the harmony in block-like rhythm rather than carrying independent contrapuntal agency.

Theory basis: species counterpoint for contrary/oblique motion, independence of rhythm, and avoiding exposed reinforcement; fugue practice for keeping independent voices intelligible during entries.

Current diagnostics coverage: partial. Duration lockstep and pitch-class unison expose the symptom, but they do not yet distinguish prepared cadence, stretto compression, acceptable support, and loss of contrapuntal agency well enough for adoption.

Project response: Phase 14 should add score-window line-agency acceptance before aggregate quality-vector acceptance. The generator needs independent rhythmic and contour alternatives, not only better labels for reinforcing support.

### 4. Counter-subject identity does not survive as a durable second idea

Affected seeds: all 24 inspected seeds have counter-subject preservation ratio below 0.5. Ten inspected seeds have no preserved counter-subject windows: `minor-entry`, `circle-fifths`, `sparse-cadence`, `bright-answer`, `dark-episode`, `contrary-motion`, `restless-line`, `tight-stretto`, `quiet-cadence`, and `seed-0zereox-1v729ih`.

The scores often introduce a counter-subject label, but later support formulae overwrite it with short harmonic support, pitch-class doubling, or entry-friction patterns. The result is a fugue-like surface with weak invertible counterpoint: subject entries remain recognizable, but the companion material does not become a memorable second idea.

Theory basis: Bach/fugue source family for counter-subject recognizability and invertible counterpoint; Fux/species counterpoint for independent melodic continuation.

Current diagnostics coverage: partial. The project already has counter-subject windows and preservation judgement, but adoption has tolerated `tradeoff` as the normal outcome.

Project response: Phase 14 should treat counter-subject survivability as a generator objective. A tradeoff can be accepted only when the score window shows a clearer higher-level function, such as cadence preparation, stretto compression, or transformed but recognizable counter-subject material.

### 5. Phrase recurrence is not yet development

Affected seeds: 12 of the 24 inspected seeds have top subject-stem family share above 0.42. Representative seeds include `minor-entry` at 0.5, `bright-answer` at 0.5, `sparse-cadence` at 0.485, `restless-line` at 0.471, and `seed-0zereox-1v729ih` at 0.471.

This is not only a Phase 13Z long-run issue. Repeated entries, short support formulae, weak counter-subject survival, and low line agency combine into one aesthetic failure: the piece can continue, but it does not yet develop. Section labels, keys, and entry voices change faster than the audible contrapuntal role of the material.

Representative evidence:

* `seed-0zereox-1v729ih` has top subject-stem family share 0.471, entry formula novelty 0, agency ratio 0.222, and counter-subject preservation ratio 0.
* `minor-entry` has top subject-stem family share 0.5, entry formula novelty 0, and counter-subject preservation ratio 0.
* `random-listen-check` still crosses the subject-stem concentration threshold at 0.424 even though it has moderate counter-subject preservation and line agency compared with the weakest seeds.

Theory basis: fugue and common-practice phrase-function source families. Repetition is valid when it changes role, tension, register, contrapuntal setting, cadence goal, or developmental pressure.

Current diagnostics coverage: partial. Phase 13R/13Z can see stem-family concentration, but current metrics underweight the combined effect of recurrence plus weak counter-subject plus lockstep support.

Project response: Phase 13Z remains the long-run repair, but Phase 14 should unify phrase development with line agency and counter-subject survival. Development cannot be accepted by section-label diversity alone.

### 6. Phase 13Z improved phrase recurrence but shifted some semitone-clash risk

Affected seeds: `contrary-motion`, `tight-stretto`, `circle-fifths`, `modal-cadence`, and `dense-modal`.

A focused post-13Z inspection compared the current generator with the pre-13Z baseline for weak-passing semitone clashes and broader passing/neighbor/offbeat semitone clashes. This does not invalidate Phase 13Z: the long-run phrase-development repair still stands. It does show that Phase 14 should start with local dissonance triage before adding broader line-agency or phrase-development scoring.

| Seed | Weak-passing semitone clashes | Passing/neighbor/offbeat semitone clashes | Entry adjacent-second friction | Entry unresolved accented clash |
| --- | ---: | ---: | ---: | ---: |
| `modal-cadence` | `30.5 -> 30.75` quarters | `51 -> 44.25` quarters | `70 -> 65` | `4 -> 11` |
| `circle-fifths` | `49 -> 51.5` quarters | `90.75 -> 82.75` quarters | `142 -> 122` | `55 -> 37` |
| `tight-stretto` | `34.5 -> 35.5` quarters | `41.75 -> 57.75` quarters | `96 -> 60` | `8 -> 27` |
| `contrary-motion` | `36 -> 52.5` quarters | `76.25 -> 84.75` quarters | `42 -> 97` | `33 -> 32` |
| `dense-modal` | `24 -> 23` quarters | `39.5 -> 38.5` quarters | `60 -> 62` | `10 -> 2` |

Representative symptoms:

* `contrary-motion`: subject-return and stretto-like windows repeatedly pair subject or counter-subject material with weak-passing support at a semitone. Entry windows around quarters 71, 109, 219, and 237 combine adjacent-second friction, exposed sevenths, pitch-class stacks, and unresolved accented clashes.
* `tight-stretto`: the narrow weak-passing count is nearly flat, but broader passing/neighbor/offbeat semitone friction rises sharply. Episode quarter 21 places free counterpoint and subject-fragment material in simultaneous weak-passing semitone motion, and later bass/tenor entries combine passing-neighbor motion with unresolved accented clashes.
* `circle-fifths`, `modal-cadence`, and `dense-modal`: the evidence is mixed or improved, so the response should not be a blanket rollback of Phase 13Z phrase variation.

Theory basis: Fux/species counterpoint permits weak passing and neighboring dissonance when it is controlled by stepwise preparation and resolution. Fugue entry practice also requires the subject to remain intelligible; repeated pitch-class stacks plus semitone friction around entries can obscure the entry even when individual notes are labelled as weak passing or offbeat motion.

Current diagnostics coverage: partial. `entrySonorities` locates adjacent-second friction and unresolved accented clashes, while metrical harmony diagnostics count weak non-chord tones. The missing focused view is a score-window table that links weak-passing or passing/neighbor semitone clashes to seed, section state, voice pair, role, intent, and resolution behavior.

Project response: Reorder Phase 14 so the first implementation slice is post-13Z dissonance triage. Preserve Phase 13Z's phrase-development improvement, but add review output and candidate scoring that reject repeated weak-passing semitone clashes unless the local window shows prepared, passing, neighboring, suspended, cadential, or stretto-functional voice leading.

## Structural Hypothesis

Symptom: the music often looks competent by aggregate diagnostics but is not yet beautiful as fugue. It has recognizable subject entries, acceptable hard constraints, and green reference aggregate signals, yet it lacks living line continuity, durable counter-subject identity, and developmental contrast.

Repeated pattern: support generation and candidate scoring repeatedly choose short, same-rhythm, pitch-class-reinforcing support around entries. Phase 13Z's stem variation can reduce long-run phrase sameness while shifting some local dissonance into weak-passing and offbeat semitone clashes. Section planning changes state labels, keys, and cadence labels faster than it changes the actual contrapuntal role of the material. Metrics localize some symptoms, but adoption still allows green aggregate readiness to coexist with unconvincing score windows.

Theory basis: Fux/species counterpoint for line independence and dissonance treatment; Bach/fugue source family for counter-subject identity, entry continuity, episode function, and stretto development; common-practice phrase theory for function-bearing recurrence.

Evidence strength: confirmed across the 22 generated review-bundle seeds plus two additional inspected seeds. No broad human listening pass was completed; this review is based on generated MIDI availability, ScoreEvent windows, diagnostics localization, and agent-side score reading.

Project response: Phase 14 stays after Phase 13Z and before Phase 8, but its scope is sharpened. It is not a metric-tuning phase. It is a score-led composition-model rebuild that may break old expected values, compatibility assumptions, or guardrail margins when they conflict with musical beauty.

## CI / Review Scope

Touched seeds and metrics:

| Item | Classification | Reason | Action |
| --- | --- | --- | --- |
| Standard 22 seed review bundle | `review-required` | The bundle is needed for score-window and metric-truthfulness review, but it is too broad and aesthetic for PR CI blocking. | Keep as review bundle evidence, not a new CI blocker. |
| `random-listen-check` | `review-required` | Ad hoc listening/control seed for metric truthfulness and score-window beauty. | Keep review-only. Do not add to CI. |
| `seed-0zereox-1v729ih` | `review-required` | User-reported long-run fatigue seed with repeated subject-stem, no counter-subject preservation, and low agency. | Keep review-only and focused listening seed. Do not add to CI until a focused deterministic sentinel exists. |
| `referenceDiagnostics.outsideReferenceSeedCount` / Phase 7B readiness as beauty acceptance | `remove-or-archive` for beauty acceptance; `ci-observed` for safety context | It passes while score-window beauty still fails. It remains useful for compatibility and coarse profile context, but not for musical acceptance. | Demote from acceptance evidence. Keep observed summaries only. |
| `pitchClassUnisonDuration` and `durationBasedLockstep` | `review-required` | All inspected seeds trip them, but the musical meaning depends on cadence, support function, register, and role. | Keep as review signals and score-window localization inputs. Do not CI-block on aggregate value. |
| `entrySevereIntervalDuration` | `review-required` | Severe intervals may be expressive preparation, passing friction, or unresolved clash; the aggregate cannot decide beauty. | Keep score-window review. Use unresolved/localized variants for future focused sentinel work. |
| Weak-passing and passing/neighbor semitone-clash review | `review-required` | The concern is musical and context-sensitive: some weak dissonance is valid, but repeated unprepared semitone friction around entries is not. | Keep as Phase 14 review evidence first. Do not add a PR CI blocker until a focused deterministic sentinel and repair target exist. |
| `entryBoundaryContinuity.continuity-supported` | `review-required` | The classifier is too broad when one carried voice masks two outside-voice resets. | Refine in Phase 14 before any CI promotion. |
| `lineAgency.agencyRatio`, `counterSubjectSurvivability.preservationRatio`, `entryFormulaNovelty.noveltyRatio`, and `topSubjectStemFamilyShare` | `review-required` | These describe beauty risks, but thresholds still require score-window judgement and listening. | Keep in review bundle and Phase 14 acceptance. Do not add PR CI blockers. |
| Old exact expected values or guardrail margins that reject score-window improvements | `remove-or-archive` | Preserving old numbers can block musical improvement when the score improves. | Archive as historical evidence; update tests only after score-window review confirms the new baseline. |

Evidence gaps:

* No broad human listening pass was completed for all 24 inspected seeds.
* Literature claims are source-family grounded but not edition/page verified in this review.
* The review generated evidence and reorganized planning only; it did not implement the Phase 14 generator changes.

## Plan Impact

Phase 13X, Phase 13X2, Phase 13Y, and Phase 13Z stay in the route because they each address confirmed local blockers. They are not enough for Phase 8.

Phase 14 becomes the Phase 8 prerequisite and is organized into score-led workstreams:

1. Triage the Phase 13Z dissonance tradeoff before changing generator weights again.
2. Define score-window musical acceptance before metric acceptance.
3. Rebuild entry support and weak-dissonance handling so important entries show carried, suspended, resolving, staggered, or intentionally prepared collective articulation.
4. Rebuild line-agency scoring and candidate generation so independent motion is generated, not only detected.
5. Make counter-subject survivability a first-class generator objective.
6. Unify phrase-development diagnostics with counter-subject and line-agency evidence without rewarding phrase novelty that creates unprepared semitone friction.
7. Demote reference aggregate and Phase 7B readiness to safety/context signals when they contradict score-window beauty.
