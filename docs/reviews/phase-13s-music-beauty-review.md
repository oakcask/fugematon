# Phase 13S Music Beauty Review

This review records a score-level music-theory pass after Phase 13R. It deliberately does not accept the current generator because the metrics are green enough. The question is whether the generated scores are musically beautiful, contrapuntally convincing, and fugally skillful, and whether the existing metrics explain that judgement.

Evidence bundle:

```sh
pnpm fugematon review --out samples/phase13s-music-beauty-review --ticks 129600
```

Reviewed seeds: `bach-001`, `fugue-smoke`, `minor-entry`, `wide-key`, `lyrical-line`, `modal-dorian`, `circle-fifths`, `close-imitation`, `sparse-cadence`, `bright-answer`, `dark-episode`, `ornament-test`, `long-arc`, `contrary-motion`, `restless-line`, `tight-stretto`, `quiet-cadence`, `angular-answer`, `modal-answer`, `modal-cadence`, `contrary-answer`, `dense-modal`.

Source family basis: Fux/species counterpoint for consonance, dissonance, contrary/oblique motion, and leap recovery; common-practice fugue and tonal harmony for subject/answer treatment, counter-subject identity, episode function, stretto, cadence, and modulation; popular-music loop/form studies only for judging when repetition can be intentional rather than mechanical. Specific editions and page citations were not verified in this pass, so source-backed claims are kept at source-family level.

## Findings

### 1. Subject rhythm and climax design are still too uniform across seeds

All four initial subject families in the 22 seed bundle use the same rhythm pattern, `1-1-1-1-1-1-1-1`, and all place the local climax at index 4. The degree contours differ, but the musical rhetoric is too similar: every subject reads as an equal-pulse line that climbs toward the same mid-phrase high point and then relaxes.

Affected seeds: all 22 seeds. The most concentrated fragment family, `0-2-1-3`, appears on 15 of 22 seeds with top fragment share 0.682.

Theory basis: fugue subjects can be compact and memorable, but a corpus of generated fugues should vary rhythmic profile, accent placement, upbeat/downbeat identity, contour apex, and cadential tail. A subject family that only changes pitch degrees while keeping identical rhythm and climax placement will not sound like different musical ideas over long listening.

Diagnostics coverage: partial. `subjectFamilyDiversity` detects top fragment vocabulary collapse, but it does not flag that every initial subject has the same rhythm pattern and same climax index. This is a clear case where the metric catches part of the problem but understates the musical sameness.

Project response: Phase 13S should make subject generation a first-class beauty problem. Add subject-rhythm, accent, climax-placement, and tail-shape diversity as review evidence before returning to Phase 8. This can be a breaking generator change; it does not need to preserve old model compatibility if the new subjects are more musical.

### 2. Entry harmony still produces unresolved 2度/7度 pressure in musically exposed places

The quality vector reports 364 local sentinels: 306 unresolved entry severe intervals and 58 long pitch-class unisons. The highest unresolved entry severe interval duration appears in `minor-entry` 31 quarters, `sparse-cadence` 27, `restless-line` 27, `ornament-test` 24, and `modal-cadence` 24.

Theory basis: accented or exposed seconds and sevenths can be expressive if prepared and resolved. In strict or common-practice fugue writing, unresolved entry-local 2度/7度 weakens subject clarity because the listener hears the entry as a clash rather than as contrapuntal tension.

Diagnostics coverage: strong for detection, weak for musical explanation. `qualityVector` and local sentinels correctly show the risk. The current review still needs better entry-window evidence: which voice carries the subject, which support voice creates the interval, whether the line resolves by step, and whether the clash is a suspension, passing tone, appoggiatura-like event, or unclassified friction.

Project response: Phase 13S should replace generic severe-interval counts with entry-local contrapuntal role classification and should prefer generation fixes over threshold tuning.

### 3. Voice independence remains thin even when hard constraints pass

All 22 seeds pass hard constraints and Phase 7B readiness, but duration-based lockstep is outside the quality profile for all seeds. The largest lockstep values are `modal-dorian` 138, `circle-fifths` 129, `tight-stretto` 122, `dense-modal` 121, and `wide-key` 120. Pitch-class unison duration is also outside the quality profile for all seeds, led by `contrary-motion` 110.5, `modal-dorian` 104, and `modal-cadence` 102.

Theory basis: counterpoint is not only the absence of forbidden parallels or voice crossing. Independent lines need rhythmic differentiation, contrary or oblique motion, and registral spacing that let the listener track voices as separate agents.

Diagnostics coverage: mostly good. `qualityVector` catches the broad problem, and seed-level top contributors are useful. The reference profile comparison is misleading here: it reports zero outside-reference seeds for the same bundle because the current reference profile is still a placeholder-like broad profile. For beauty decisions, `referenceDiagnostics` currently over-reassures.

Project response: Phase 13S should demote the current reference-profile pass as adoption evidence until real reference ingestion and narrower style families exist. Voice-pair independence should be reviewed from score windows and listening templates, not only from aggregate counts.

### 4. Modal and angular seeds expose weak counter-subject identity

Lowest counter-subject identity retention appears in `modal-answer` 0.545, `dense-modal` 0.571, `modal-cadence` 0.573, `angular-answer` 0.591, and `modal-dorian` 0.632.

Theory basis: a counter-subject should remain recognizable enough to support invertible counterpoint and return with the subject. Modal color and angular answer treatment can justify different interval content, but they do not justify losing the counter-subject as a memorable line.

Diagnostics coverage: good as a warning, incomplete as a cause analysis. The legacy Phase gates and Phase 7B review signals notice the low retention, but the current summary does not show whether the loss comes from modal pitch choice, rhythm flattening, register placement, answer transform, or support-line collision.

Project response: Phase 13S should add counter-subject family diagnostics parallel to subject family diagnostics: rhythm, contour, entry-relative placement, invertibility context, and whether modal characteristic tones preserve identity or merely change pitch content.

### 5. Form metrics still overstate fugal skill

Several seed-level form dimensions still return perfect-looking values while score review shows recurring problems in subject vocabulary, entry friction, lockstep, and counter-subject identity. The current bundle has many seeds with no per-score Phase 13R finding even though the bundle-level subject-fragment vocabulary collapse remains visible.

Theory basis: fugue technique is not just state labels such as exposition, episode, subject return, and stretto-like. Episodes should develop material through sequence, modulation, changed texture, or cadence preparation. Stretto should create recognizable intensification, not just overlapping entries over similar support formulas.

Diagnostics coverage: weak for beauty. `phase13RReview` is useful for within-score concentration, and `subjectFamilyDiversity` is useful for corpus-level collapse. But `episodeDirectionScore`, `strettoClarityScore`, and broad reference comparison do not yet explain whether an episode is musically developmental or filler.

Project response: Phase 13S should add phrase-function evidence: episode transformation type, cadence approach, subject-fragment role, stretto density/tension curve, and whether repeated material changes function.

## Metric Adequacy

The current metrics are useful as defect locators, not as beauty adjudicators.

They represent musical goodness well when they expose concrete local symptoms: unresolved entry severe intervals, pitch-class unison span, duration lockstep, subject-fragment vocabulary collapse, and low counter-subject identity.

They fail or underrepresent beauty when they collapse rhetoric into aggregates. The biggest misses in this pass are all-subject rhythmic sameness, identical climax placement, form labels that do not prove development, and a reference profile that says the bundle is within reference while the quality vector and score review still show serious aesthetic risk.

Therefore Phase 13S should not tune weights to make the current output pass. It should treat metrics as probes that need score-window and listening interpretation.

## Structural Hypothesis

Symptom: many seeds sound and read as variants of the same musical rhetoric rather than distinct fugues.

Repeated pattern: initial subjects differ by degree pattern but share the same rhythm, same climax index, tonal-answer compatibility, and a highly concentrated leading fragment vocabulary. Later entry harmony and voice-pair support then reuse similar support formulas, producing unresolved entry friction and lockstep even when hard constraints remain clean.

Evidence strength: confirmed for diagnostics and score-event structure; plausible for listening. Human listening notes were not filled in this pass.

Project response: insert Phase 13S before Phase 8/9. The phase should allow breaking generator-model compatibility, replacing old guardrails, and changing expected metrics when the score review shows that doing so improves musical beauty.

## Plan Change

This planning review originally stopped Phase 8/9 and inserted Phase 13S: music-beauty-first generator rewrite and metric recalibration. The completion review below records the Phase 13S outcome and the remaining risks that Phase 8 must keep visible.

Phase 13S priorities:

1. Subject and counter-subject rhetoric: rhythm, accent, climax placement, tail, contour, and modal identity.
2. Entry-local counterpoint: classify dissonance roles and resolve 2度/7度 pressure by generation, not by hiding it in thresholds.
3. Voice independence: improve rhythmic stratification, contrary/oblique motion, and registral spacing from score windows.
4. Fugal form: require episodes and stretto-like sections to show changed function, not only changed labels.
5. Metric truthfulness: every adoption metric must explain a representative score symptom; metrics that remain broad or placeholder-like should be evidence-only.

Remaining gaps:

* No filled human listening templates.
* No `strict-counterpoint` playback pass.
* No exact-edition literature citations.
* No implementation repair yet; this review only changes phase scope and priorities.

## Completion Review

Phase 13S completion evidence uses the same 22 seed set and regenerated bundles under both `organ-default` and `strict-counterpoint`. The two performance profiles produce the same score diagnostics because Phase 13S changes `ScoreEvent` generation, not rendering.

### Accepted repairs

Subject rhetoric is no longer collapsed to one equal-pulse middle-climax design. The completion bundle reports 4 initial subject rhythm patterns, 3 local climax indexes, and 7 initial subject families. Representative score-window checks:

* `fugue-smoke`: held opening rhythm, early local climax at index 3, and lower unresolved entry friction than the planning review.
* `bach-001`: middle-held rhythm with late climax at index 5, giving the opening subject a different accent profile from `fugue-smoke`.
* `minor-entry`, `sparse-cadence`, `restless-line`, and `quiet-cadence`: tail-held rhythm with middle climax retained where entry harmony risk benefits from the less disruptive subject shape.

Entry friction improved materially. The Phase 13S planning review recorded 306 unresolved entry severe interval quarters. The completion regression records 151 unresolved entry severe interval quarters across the 22 seeds. This does not remove all 2度/7度 pressure, but the largest improvement is in exposed representative and boundary seeds where the new subject rhythm avoids repeating the same entry-support clash.

Counter-subject identity remains recognizable enough for the focused modal and angular seeds. The completion values are `modal-answer` 0.545, `dense-modal` 0.571, `modal-cadence` 0.573, `modal-dorian` 0.632, and `angular-answer` 0.591. These preserve the Phase 13R floor while allowing non-modal subject rhetoric to change more aggressively.

### Accepted tradeoffs

The top subject-fragment family share is 0.545, improved from 0.682 but still above the old collapse threshold. This is accepted for Phase 13S because the repeated fragment now functions inside a wider subject-rhythm and climax vocabulary. It remains a review signal for Phase 8 listening, not a reason to restore the equal-pulse subject model.

Voice-pair independence is still the main risk. Duration-based lockstep and pitch-class unison remain outside the quality profile for all 22 seeds, and the held-subject rewrite can expose longer support spans. The musical rationale for accepting this tradeoff is that Phase 13S repaired the upstream subject sameness and unresolved entry friction first; Phase 8 must not hide the remaining lockstep/unison risk behind continuous playback or visualizer choices.

### Focused Listening Notes

`organ-default`:

* `bach-001` and `fugue-smoke`: pass for subject memorability and entry clarity compared with the planning review; needs-work for long-run voice-pair independence.
* `minor-entry`, `sparse-cadence`, `restless-line`, `ornament-test`, and `modal-cadence`: improved entry-friction evidence, but `modal-cadence` still needs-work for unresolved entry pressure.
* `modal-answer`, `dense-modal`, `modal-cadence`, and `modal-dorian`: counter-subject recognition is preserved at the Phase 13R floor; modal color is not treated as a reason to weaken the identity further.

`strict-counterpoint`:

* Representative and entry-harmony seeds remain needs-work for exposed pitch-class unison and lockstep, especially in long-run listening.
* The stricter profile does not contradict the claimed subject-rhetoric and entry-friction improvements; it reinforces that remaining voice independence must stay visible in Phase 8 review notes.

### Structural Hypothesis

Symptom: the Phase 13R generator sounded like variants of one subject rhetoric, and that sameness made entry-support clashes feel structural rather than local.

Repeated pattern: equal-pulse subjects with the same local climax index drove similar answer and support formulas across the 22 seeds.

Theory basis: common-practice fugue subjects can share compact motivic cells, but a generated corpus needs varied rhythm, accent, climax placement, and tail shape so repeated fragments are heard as development rather than mechanical reuse.

Evidence strength: confirmed for subject rhythm/climax and plausible for entry friction. Voice-pair independence remains only partly addressed.

Project response: keep `generatorVersion` 4 and the new subject profiles. Carry voice-pair lockstep and pitch-class unison into Phase 8 as explicit review/listening signals instead of reverting the subject rewrite.
