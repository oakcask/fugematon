# Stretto Entry Harmony Repair Plan

This review records the investigation plan for a user-reported harmony problem: `seed-1db5j19-1nhjtae` measures 7-8 sound harmonically unacceptable. The review treats that seed as representative evidence, not as the repair boundary.

Evidence source: focused ScoreEvent and diagnostics inspection under the default `section-local-planner` model, generated to 64 quarter notes. No MIDI listening pass or persisted review bundle was completed in this pass.

Theory basis: Fux/species counterpoint for exposed dissonance, preparation and resolution, and voice independence; common-practice fugue and tonal harmony source families for stretto entry clarity, counter-subject support, and functional sonority around entries. Specific editions and page citations were not rechecked, so these are source-family claims rather than page-cited claims.

## Findings

### 1. The reported seed fails at the episode-to-stretto handoff

Affected seed: `seed-1db5j19-1nhjtae`.

The generated score is G minor in 4/4. Measures 7-8 overlap the end of a short pivot episode and the first post-exposition `stretto-like` section:

| Location | Section role | Representative sonority | Diagnostic evidence |
| --- | --- | --- | --- |
| 7:0-7:2.5 | Episode cadence approach | A/G/D, D/E/F, D/F | `thin-unrooted-support` and `pitch-class-doubling-only` windows in child harmonic-sonority evidence. |
| 7:3 | Stretto subject entry | G/D plus doubled G | Entry boundary is accepted as prepared collective articulation, but harmony is still fragile. |
| 8:0 | Stretto subject continuation | Bb/C | `unresolved-accented-entry-clash`, `entry-adjacent-second-friction`, review-required. |
| 8:1-8:3.5 | Subject/answer overlap | C/Bb/D, Bb/C/G, C/Bb/A/G | Repeated entry-adjacent and weak/offbeat semitone or second friction. |

The visible generator pattern is not a literal G minor issue. The selected `stretto-like` subject shape places a strong non-chord subject tone against generic counter-subject and free-counterpoint support. At 8:0, the subject has C while the counter-subject/support texture supplies Bb. The result is a bare accented second without a clear preparation-resolution role.

Current diagnostics coverage is partial. `dissonanceTriage` and `scoreWindowAcceptance` surface the local clash as review-required, and `harmonicSonorities` surfaces the preceding thin support. Candidate selection still accepts the section because the entry-harmony costs are small relative to broad texture, melody, and form costs.

### 2. The symptom generalizes across seeds

The focused scan covered 31 seeds: the standard review/rotation-style seed names plus user-reported or ad hoc generated seeds. The same metric window was used for each seed.

Aggregate evidence:

| Signal | Count |
| --- | ---: |
| Seeds with entry or stretto-adjacent dissonance windows | 31 / 31 |
| Seeds with `unresolved-accented-entry-clash` | 18 / 31 |
| Seeds with first-stretto entry dissonance windows | 31 / 31 |
| Seeds with `thin-unrooted-support` or `pitch-class-doubling-only` | 26 / 31 |
| Median entry-dissonance windows | 10 |
| Median first-stretto entry-dissonance windows | 3 |
| Median unresolved severe entry intervals | 9 |

High-risk representatives:

| Seed | Key / meter | Entry windows | Unresolved accented clashes | First-stretto windows | Representative clash |
| --- | --- | ---: | ---: | ---: | --- |
| `long-arc` | F# major, 4/4 | 17 | 5 | 5 | B/Bb near stretto subject. |
| `seed-1db5j19-1nhjtae` | G minor, 4/4 | 19 | 4 | 7 | Bb/C at measure 8. |
| `seed-0v7m9qa-bridge` | G major, 4/4 | 15 | 4 | 4 | Repeated entry-adjacent friction. |
| `dark-episode` | B minor, 4/4 | 16 | 3 | 7 | D/E near stretto subject. |
| `ornament-test` | D major, 4/4 | 15 | 3 | 5 | F#/G near stretto subject. |
| `bach-001` | F# major, 4/4 | 17 | 3 | 5 | Bb/B near stretto subject. |

The reported seed is therefore a good regression seed, but it is not an exception.

### 3. Subject family correlates with risk

The highest-risk initial subject family in the scan was `0-2-3-1-2-4-3-1`.

| Initial subject pattern | Count | Average entry windows | Average unresolved accented clashes | Average first-stretto windows | Examples |
| --- | ---: | ---: | ---: | ---: | --- |
| `0-2-3-1-2-4-3-1` | 7 | 15.71 | 3.43 | 5.43 | `seed-1db5j19-1nhjtae`, `bach-001`, `bright-answer`, `dark-episode` |
| `0-1-3-4-2-3-2-1` | 3 | 12.33 | 2.67 | 4.00 | `fugue-smoke`, `contrary-answer`, `seed-1yc5rlr-184cz7l` |
| `0-1-2-3-4-3-1-2` | 6 | 5.67 | 0.00 | 1.83 | `tight-stretto`, `angular-answer`, `modal-cadence` |

This suggests a structural interaction between subject contour, stretto derivation, and support templates. A repair should target entry-local role and interval structure, not seed, key, measure, or exact pitch names.

### 4. The likely generator cause is a narrow scoring and support-texture gap

The likely cause has four layers:

1. `stretto-like` derivation can put strong subject tones outside the current anchor chord.
2. Counter-subject and free-counterpoint templates reuse fixed degree patterns that can sit one scale degree away from the entry tone.
3. Weak dissonance repair is mostly free-counterpoint-only and often disabled early in the section unless strict semitone avoidance is explicitly requested.
4. Candidate evaluation records entry harmony and severe intervals, but the selection cost does not treat unresolved accented entry clashes or harmonic-sonority child windows as strong section-selection blockers.

The musical symptom is therefore "entry-local sonority cannot explain its dissonance", not "stretto should avoid all tension". Stretto may be tense, but the tension must be prepared, passing, neighboring, suspended, cadential, or otherwise function-bearing.

## Structural Hypothesis

Symptom: post-exposition stretto and entry windows sound like harsh accidental clusters because subject/answer tones, counter-subject support, and free-counterpoint support create exposed seconds or semitones on important beats without a score-window explanation.

Repeated pattern: the problem is strongest when the initial subject family and derived stretto subject place scale degrees 2 or 3 near strong beats while fixed counter-subject/free-counterpoint degree patterns provide adjacent scale degrees. The collision repeats across major and minor keys, several voices, and several seeds.

Evidence strength: confirmed as a cross-seed diagnostic pattern from 31 ScoreEvent scans; not yet confirmed by broad human listening.

Project response: insert a focused Stretto entry harmony repair before Infinite playback MVP. The repair should combine candidate scoring and generator construction, then verify across the reported seed, high-risk subject-family seeds, representative controls, rotation/adversarial controls, and modal controls.

## Repair Plan

### 1. Preserve focused evidence before editing

Add a focused regression helper that records, for each target seed:

* first `stretto-like` section start;
* `unresolved-accented-entry-clash` count;
* first-stretto entry-dissonance window count;
* unresolved severe entry interval count;
* child `harmonic-sonority` review-required windows near the handoff;
* representative vertical sonorities at the failing ticks.

The helper should not encode literal bar numbers, pitch names, key signatures, or voice names. It should express the target as important entry windows where entry roles and support roles create unexplained adjacent-second or semitone friction.

### 2. Add entry-sonority pressure to candidate selection

Candidate scoring should treat unresolved accented entry clashes and child harmonic-sonority review windows as local section-selection pressure, especially inside `stretto-like`, subject-return, and entry-adjacent episode windows.

The scoring change should prefer candidates that:

* reduce unresolved accented entry clashes;
* reduce unresolved severe entry intervals;
* keep or improve counter-subject identity and line agency;
* avoid replacing one harsh sonority with pitch-class unison, lockstep, or thin support.

This belongs in candidate scoring before broader phrase-development rewards. A novel or function-bearing phrase is not an improvement if its important entry sonority is not musically explainable.

### 3. Make stretto support construction entry-aware

Generation should avoid placing generic support patterns against a strong subject or answer non-chord tone when that creates an exposed adjacent second or semitone.

Acceptable structural responses include:

* move the support voice to a nearby anchor chord tone when voice order permits;
* delay or carry a support tone so the clash becomes a prepared suspension or passing event;
* use contrary or oblique support instead of the fixed counter-subject/free-counterpoint degree at that tick;
* thin the texture only when the score-window function explains the thinning and does not create an unrooted sonority;
* leave a review-required window visible when no candidate can produce a musically explainable alternative.

Do not retag subject or counter-subject notes as harmonic support merely to pass diagnostics.

### 4. Review derived stretto subject patterns structurally

The derived stretto subject patterns should remain capable of compression and tension. The repair should only intervene when the derived subject places a strong non-chord tone into an entry window and the planned support texture cannot prepare or resolve it.

Good predicates are section state, entry role, beat strength, anchor function, entry/support interval class, resolution deadline, and candidate availability. Bad predicates are the reported seed, G minor, measure 8, C/Bb, alto/soprano, or the current ordering artifact.

### 5. Verify with high-risk and control seeds

Minimum focused verification set:

| Role | Seeds | Reason |
| --- | --- | --- |
| Reported case | `seed-1db5j19-1nhjtae` | User-reported measure 7-8 harmony failure. |
| High-risk subject family | `long-arc`, `dark-episode`, `ornament-test`, `bach-001` | Same or related entry-family pressure with unresolved accented clashes. |
| Related default controls | `fugue-smoke`, `contrary-answer`, `seed-1yc5rlr-184cz7l` | Different high-risk subject family; should improve without overfitting. |
| Lower-risk controls | `tight-stretto`, `modal-dorian`, `seed-19l7uit-1u226cc` | Ensure the repair does not flatten acceptable tension or modal color. |
| Thin-support controls | `seed-0v7m9qa-bridge`, `contrary-motion`, `dense-modal` | Catch tradeoffs into unrooted support, lockstep, or modal texture collapse. |

## Acceptance Criteria

* The reported measure 7-8 window no longer has an unresolved accented entry clash or unexplained child harmonic-sonority failure.
* High-risk seeds reduce unresolved accented entry clashes and first-stretto entry-dissonance windows without increasing hard failures.
* Candidate output does not trade harsh entry seconds for pitch-class unison stacks, duration lockstep, or long thin support.
* Counter-subject survivability and phrase-development evidence do not regress into generic free-counterpoint filler.
* At least one lower-risk control retains its legitimate stretto tension; the repair must not flatten all close imitation into bland chordal support.
* `organ-default` and `strict-counterpoint` focused listening notes are added before using the repair as handoff evidence.

## CI / Review Scope

| Item | Classification | Reason | Action |
| --- | --- | --- | --- |
| Focused Stretto entry harmony seed set | `review-required` | The failure is musical and window-local; too aesthetic and seed-sensitive for PR CI blocking until a deterministic invariant is proven. | Keep as focused review evidence and regression helper output. |
| `seed-1db5j19-1nhjtae` | `review-required` / `manual-listening` | User-reported audible failure; must remain regression evidence and listening target. | Use in focused review and profile listening. |
| `unresolved-accented-entry-clash` in important entry windows | `review-required` now, possible `ci-observed` later | It names a concrete defect but needs role, beat, and resolution context. | Use for candidate scoring and review summaries; do not CI-block aggregate counts yet. |
| Child `harmonic-sonority` windows inside accepted entry or handoff windows | `review-required` | Top-level acceptance can hide local unrooted or doubled-only sonorities. | Require score-window inspection before accepting a repair. |
| Focused listening notes | `manual-listening` | The complaint is audible harmony quality. | Record `organ-default` and `strict-counterpoint` notes before handoff. |

## Open Gaps

* No broad human listening pass has been completed.
* The scan used focused generated ScoreEvent data rather than a persisted `samples/` review bundle.
* Literature support is source-family level only; no edition or page citation was verified for this planning note.
* The exact implementation split between generator construction and candidate scoring still needs a code-level design pass.
