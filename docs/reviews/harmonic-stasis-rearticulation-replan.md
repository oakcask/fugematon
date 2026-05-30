# Harmonic Stasis Rearticulation Replan

This review records the user-reported symptom that motivically derived free counterpoint can still fall into short same-pitch rearticulation when the harmony is not creating audible tension and release. It also records a related post-processing path where functional support repair can add harmonically safe but mechanically rearticulated support after candidate selection.

## Findings

### 1. The reported seed shows motivic labels without enough harmonic direction

Affected seed: `seed-07mwf08-1te3e2o`.

Representative location: the first bass answer starts in the exposition at quarter 9 and the first episode starts at quarter 15. The exposed all-free texture appears around quarters 18-22.5.

Theory basis: subject-derived rhythm and motivic labeling are not enough if the pitch line does not participate in harmonic function. Repetition can be a pedal, suspension, cadence figure, or rhetorical echo, but short rearticulation without a functional reason reads as mechanical support.

Evidence from ScoreEvent inspection: in the first episode handoff, alto, tenor, and bass are active as `free-counterpoint`. Several notes carry derivation labels such as `answer-form/sequence/descending`, `subject-head/sequence/descending`, and `counter-subject-tail/sequence/descending`. Despite this, bass repeats `C3` and then `C#3` as short rearticulations, while tenor and alto also produce local same-pitch rearticulation. The same window has multiple harmonic-sonority score windows classified as `non-chord-structural-support`.

Project response: add Harmonic stasis rearticulation repair before Infinite playback MVP. The response should not remove motivic derivation metadata; it should require the selected pitches to make harmonic function audible.

### 2. A second reported seed shows final support repair can create the symptom

Affected seed: `seed-1db5j19-1nhjtae`.

Representative location: measure 7 in 4/4, around ticks 11520-12960. The tenor repeats pitch 55 as short `free-counterpoint` support while the local episode moves from dominant preparation toward `cadential-tonic`.

Theory basis: a repeated common tone can be valid in a dominant-to-tonic cadence, but short reattacks on the same inner-voice support pitch need a contrapuntal or rhetorical reason. If the line is only choosing the safest chord tone, it supports harmony but weakens line agency.

Evidence from ScoreEvent inspection: the final score reports `tenor repeats pitch 55 for 8 notes`. The selected candidate summary for the preceding episode did not yet contain a repeated-pitch run, while later support notes have velocity 50, `free-counterpoint`, and structural-chord-tone intent. This points to final support repair rather than the original section candidate as the likely source.

Project response: reorganize the repair so candidate scoring is not the only response. The first implementation slice should make the final-score diagnostic provenance-aware, then guard functional support generation against short same-pitch rearticulation. `cadential-tonic` should not become a literal special case; the repair should work for any structural support line that collapses to a repeated safe pitch.

### 3. Existing diagnostics detect part of the harmony problem but not the combined symptom

Affected seeds: reported seeds first, then focused controls `fugue-smoke`, `modal-cadence`, `dark-episode`, and `tight-stretto`.

Theory basis: counterpoint and harmony need to be read together. A repeated note can be acceptable if another voice carries motion or if the repetition serves a pedal / suspension / cadence function. It becomes a problem when same-voice rearticulation and harmonic stasis occur in the same local window.

Evidence: `harmonicSonority` already reports `non-chord-structural-support` in the reported window, and `harmonicContinuity` can classify later short episodes as `audible-progression` or `review-required`. However, there is no current metric that says: "this same voice is rearticulating the same pitch at short duration while all active voices are free counterpoint and the harmonic function is static or mislabeled."

Project response: introduce a review-first diagnostic such as `harmonicStasisRearticulation`. It should attach same-voice rearticulation to section state, first-bass-answer handoff, all-free texture, metrical intent, harmonic function, active voices, harmonic-sonority classification, and whether the run appears before or after final support repair.

### 4. First-episode handoff can pass continuity checks while still sounding disconnected

Affected seed: `seed-1syy921-0025pp1`.

User-reported symptom: "5-7小節のコード進行やリズム感が不自然で、前後のつながりや主題や対主題との対応性も見えない".

Representative location: 4/4 A major, first episode in D major, measures 5-7. The episode starts late in measure 5 after the exposition bass answer and moves through a pivot-harmony plan toward the first stretto-like section.

Theory basis: fugue episodes can use subject fragments, answer-derived figures, and counter-subject material, but the sequence must still create directed harmonic and rhythmic continuation. A harmonic-continuity pass based on root and chord-tone support is not enough when the surface rhythm turns into repeated short attacks that do not clarify the motivic sequence.

Evidence from ScoreEvent inspection: `harmonicContinuity` classifies the episode as `audible-progression`, and `transitionRhythmReview` classifies the boundary as `prepared-pickup`. The score window still contains all-free-texture rearticulations at quarters 23-27: tenor repeats a structural chord tone from `subject-head/inversion`, bass repeats dominant root support from `answer-form/cadential-continuation`, and tenor repeats another structural chord tone from `answer-form/inversion`. The new `harmonicStasisRearticulation` diagnostic exposes 15 focused windows for the seed, with 4 `generator-response` windows and 10 `review-required` windows. This shows a metric false acceptance: continuity support exists, but the audible surface still reads as mechanical and weakly connected.

Project response: add `seed-1syy921-0025pp1` as a focused first-episode handoff representative. The repair must not hard-code the seed, measure numbers, A major, D major, or specific pitches; it should target first-episode handoff windows where all active voices are free counterpoint and motivic labels sit on short same-pitch structural support.

### 5. The repair should prefer better pitch choices over longer notes

Affected seeds: all focused seeds.

Theory basis: simply tying all same-pitch rearticulations risks replacing mechanical attack with static texture. Free counterpoint still needs line agency, contour, and tension / release.

Project response: use the right layer for the source of the run. Penalize short same-pitch rearticulation in candidate evaluation when it is present before selection. For runs introduced by support repair, guard the support-line generator first. If neither layer can reduce the windows, generator alternatives should prefer nearby chord tones, prepared neighbor motion, passing motion, or contrary / oblique support. Tie-like merging should be a local fallback when alternate pitches would create a worse counterpoint or harmony defect.

## Structural Hypothesis

Symptom: after the first bass answer or first episode handoff, all active voices can become free counterpoint and reuse subject / answer rhythm while bass and inner voices rearticulate the same pitch at short durations.

Repeated pattern: the issue is most likely when `freeCounterpointPhraseVariation`, post-bass-answer support, and final functional-support repair combine with a short episode handoff, because the phrase vocabulary and texture floor improve while candidate scoring and final support generation do not yet model same-voice harmonic stasis. `seed-1syy921-0025pp1` confirms the selected episode can carry motive labels and pass continuity checks while still exposing all-free short rearticulation in the handoff.

Theory basis: fugue episodes may sequence or fragment subject material, but the sequence must imply directed harmonic motion. If support pitches repeat without a pedal, suspension, cadence, or voice-leading reason, the episode sounds like filler even when the rhythm is motivically derived.

Evidence strength: plausible and locally confirmed for `seed-07mwf08-1te3e2o`; confirmed as a final support-repair symptom for `seed-1db5j19-1nhjtae`; needs focused seed review before CI expansion.

Project response: diagnostic first, functional-support guard second for post-processing runs, candidate scoring for selected-section runs, broader generator alternatives only if those are insufficient.

## CI / Review Scope

* `seed-07mwf08-1te3e2o`: `review-required`; reported representative for first-bass-answer handoff rearticulation with weak harmonic direction. Action: add focused regression evidence and score-window notes.
* `seed-1db5j19-1nhjtae`: `review-required`; reported representative for post-processing functional-support rearticulation in the tenor around measure 7. Action: preserve as final-score regression evidence and verify the repair is structural, not tied to the pitch, measure, voice, key, or `cadential-tonic` label.
* `seed-1syy921-0025pp1`: `review-required`; reported representative for first-episode handoff continuity false acceptance, where motivic labels and root support exist but all-free short rearticulation makes measures 5-7 sound disconnected. Action: keep as focused evidence for diagnostic and generator-response review, not as a literal measure/key/pitch exception.
* `harmonicStasisRearticulation`: `review-required`; new diagnostic should be visible in review bundles before becoming CI-blocking. Action: record windows with accepted / review-required / generator-response classification.
* Focused controls `fugue-smoke`, `modal-cadence`, `dark-episode`, and `tight-stretto`: `review-required`; verify the repair does not overfit the reported seed. Action: compare rearticulation windows, harmonic-sonority windows, leap recovery, counter-subject identity, weak dissonance, and repeated-stock formula pressure.
* Focused listening: `manual-listening`; agent-side score review can identify the structural problem, but audible acceptance still needs `organ-default` and `strict-counterpoint` checks.

## Plan Integration

Implementation order and completion criteria live in [Harmonic stasis rearticulation repair](../phases/harmonic-stasis-rearticulation-repair.md). Infinite playback MVP must not use segment boundaries, playback smoothing, or rendering profiles to hide this symptom.
