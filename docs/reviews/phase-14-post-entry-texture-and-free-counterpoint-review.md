# Phase 14 Post-Entry Texture And Free-Counterpoint Phrase Review

Reported symptoms:

* After answer or stretto-like imitation, all but one part can seem to rest unnaturally for several measures.
* Free-counterpoint phrases can sound too similar across multiple seeds.

Reviewed seeds: the 22 Phase 5/5.11 review seeds plus `random-listen-check` and `seed-0zereox-1v729ih`, generated at `PHASE_5_LENGTH_TICKS` from ScoreEvent data.

## Findings

### Post-entry thinning is still a cross-seed issue

The old bass-only collapse did not recur: no reviewed seed had a four-quarter-or-longer window where the whole texture was literally one active voice after an answer or stretto-like entry. The first-bass-answer tail also stayed at zero bass-only and zero zero-outside ticks.

However, the reported symptom is still musically plausible. In 22 of 24 seeds, answer or stretto-like entry windows are followed by four to seven quarters where the entry voice has at most one outside support voice. The longest examples are:

| Seed | Entry context | Thin support window |
| --- | --- | --- |
| `angular-answer` | alto answer in stretto-like state, then episode | 7 quarters with bass as the only outside support; total texture alternates between one and two voices |
| `close-imitation` | first bass answer, then episode | 6.5 quarters with alto as the only outside support; total texture alternates between one and two voices |
| `bach-001` | bass subject in stretto-like state, then episode | 6 quarters with alto as the only outside support; total texture alternates between one and two voices |
| `fugue-smoke` | first bass answer, then episode | 6 quarters with alto as the only outside support; total texture alternates between one and two voices |
| `modal-dorian`, `modal-cadence`, `random-listen-check` | bass answer or bass subject, then episode | 5-quarter thin support windows |

Theory basis: Fux-like contrapuntal texture and fugue-form pacing both allow cadential thinning, exposed solo rhetoric, or deliberate two-part writing. The reviewed windows are different: they often arrive after imitation as default episode filler, with only one support line carrying the texture and no recorded cadence, pedal, suspension, or prepared solo function that explains the withdrawal.

Current diagnostics partially miss the symptom. `bassAnswerTailTexture` confirms the old bass-only first-answer collapse is repaired, but it is first-bass specific. `entryBoundaryContinuity` checks the entry boundary, not the post-entry continuation. `soloTexture` is too broad to distinguish acceptable cadential thinning from answer/stretto tail thinning.

### Free-counterpoint phrase convergence is confirmed

Free-counterpoint six-note contour and duration signatures repeat across many seeds. The strongest repeated signatures all use six eighth-like durations and near-identical weak/offbeat/strong support roles:

| Signature | Seeds | Count | Typical location |
| --- | ---: | ---: | --- |
| `dUddd|eeeeee` | 20 | 159 | episode or stretto-like support |
| `uDuuu|eeeeee` | 20 | 109 | subject-return or stretto-like support |
| `uudUd|eeeeee` | 18 | 185 | episode or stretto-like support |
| `udUdd|eeeeee` | 18 | 156 | episode or stretto-like support |
| `UduDu|eeeeee` | 15 | 309 | subject-return support |

The repeated phrase signatures usually alternate offbeat motion with weak passing/chord tones and a strong non-chord tone or structural chord tone. This makes the free-counterpoint line behave like a small stock figuration vocabulary rather than a seed-specific answer to local subject, cadence, register, and voice-pair pressure.

Theory basis: sequence and figuration are valid, but repeated free-counterpoint surface formulas across unrelated seeds weaken voice agency. In fugue writing, repetition is acceptable when it changes function, register, inversion, sequence direction, cadence target, or contrapuntal pressure. These signatures mainly change location and voice, not musical function.

Current diagnostics do not directly measure this. `phase13ZReview` is centered on subject and subject-fragment recurrence, while the reported symptom is free-counterpoint surface vocabulary. `phase14ScoreWindowAcceptance` includes phrase-development windows, but it does not expose cross-seed free-counterpoint phrase signatures.

## Structural Hypothesis

Confirmed symptom: post-answer and post-stretto windows often thin to the entry line plus one support line, and free-counterpoint surfaces reuse a small eighth-note contour/rhythm vocabulary across seeds.

Plausible generator cause: support construction after imitation falls back to a limited episode/free-counterpoint formula set. The same formula set both thins the active support texture and supplies the repeated six-eighth-note contour signatures. The issue is therefore upstream of metric truthfulness: diagnostics can reveal the windows, but the generator needs more post-entry support objectives and a broader free-counterpoint phrase grammar.

Project response: split Phase 14C before broad line-agency and phrase-development scoring. First add post-entry support-continuity generation and diagnostics, then add free-counterpoint phrase-vocabulary diversity, and only then trust broader line-agency, counter-subject, and phrase-development adoption evidence.

## CI / Review Scope

Touched signals:

* post-answer and post-stretto thin-support windows;
* first-bass-answer one-outside tail ticks;
* free-counterpoint contour/duration signatures;
* Phase 13Z phrase-development windows;
* `soloTexture`, `bassAnswerTailTexture`, `entryBoundaryContinuity`, and Phase 14 score-window acceptance.

Classification: `review-required`.

Reason: the symptoms are deterministic and seed-crossing, but their musical acceptability depends on score-window function. Cadential thinning, two-part episodes, pedal points, and exposed solo rhetoric must remain possible when prepared.

Action:

* Add review diagnostics for post-entry continuation windows after answer and stretto-like entries.
* Keep the existing first-bass-answer tail repair as accepted context, but generalize the tail check beyond first bass.
* Add a free-counterpoint phrase-signature review surface before any CI promotion.
* Do not make these PR CI blockers until the generator response, false-positive exceptions, and runtime are stable.

Evidence gap: no manual listening pass was done in this review. The review used ScoreEvent windows and diagnostics only.
