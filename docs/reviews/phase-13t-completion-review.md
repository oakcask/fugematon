# Phase 13T Completion Review

Phase 13T repairs the current default generator by changing entry-support rhythm and by rebuilding the Phase 13 quality-vector evidence so broad aggregate axes can be traced back to score-window causes.

Evidence commands:

```sh
pnpm fugematon review --out samples/phase13t-completion-review --ticks 129600 --performance-profile organ-default
pnpm fugematon review --out samples/phase13t-completion-review-strict --ticks 129600 --performance-profile strict-counterpoint
```

Reviewed seed set: the standard 22 seed bundle from Phase 13S.

Source family basis: Fux/species counterpoint for voice independence, consonance, preparation and resolution; common-practice fugue for entry clarity, counter-subject recognizability, episode function, and motivic transformation. Specific editions were not rechecked in this pass, so theory claims remain source-family level.

## Findings

### 1. Entry windows now explain the sonority instead of only counting severe intervals

The quality vector now records `entrySonorities` with entry voice, support voices, beat strength, pitch-class unison stacks, adjacent 2度 friction, exposed 7度, tritone exposure, prepared or passing motion, unresolved accented clashes, and resolution direction.

Affected seeds: all 22 seeds have classified entry windows. The 22 seed bundle records 949 classified entry sonority windows. Unresolved entry sentinels dropped from the Phase 13T audit baseline of 161 to 97 after step-resolution-aware metric reconstruction.

Theory basis: exposed seconds and sevenths are not automatically wrong, but a fugue entry must make the subject audible and either prepare, pass through, or resolve dissonance. The new classifier distinguishes unresolved accented clashes from prepared or passing tension.

Project response: keep `unresolvedEntrySevereIntervalDuration` as a review axis, but treat `entrySonorities` as the adoption explanation for representative score windows.

### 2. Duration lockstep and pitch-class unison are split by function

The broad `durationBasedLockstep` and `pitchClassUnisonDuration` axes remain review signals across the 22 seed bundle. Phase 13T does not pretend those aggregate numbers are green. Instead, `voicePairFunctions` separates subject support, cadence support, sequence-pattern support, pedal-like support, mechanical coupling, exact collision, color doubling, and functional reinforcement.

Affected seeds: all 22 seeds now have function-aware lockstep evidence. This satisfies Phase 13T by making each remaining high-risk seed reviewable by voice pair and musical role instead of using one count as the judge.

Theory basis: parallel rhythmic support can be functional near entries, cadences, sequences, and pedal-like reinforcement, but it becomes a beauty problem when it is mechanical coupling. The new evidence tells future reviews which case they are hearing.

Project response: keep the old axes for historical A/B comparison, but use `voicePairFunctions` and `metricExplanations` when deciding whether remaining lockstep is functional or needs generator repair.

### 3. Subject-fragment recurrence now carries phrase-function evidence

The top subject-fragment family remains visible at 12 of 22 seeds, share 0.545. This is accepted for Phase 13T because the quality vector now records fragment function evidence across transformation, sequence pattern, cadence kind, and target mode. The bundle records 200 total unique function observations across the 22 seed diagnostics.

Affected seeds: fragment risk seeds from Phase 13T remain reviewable, especially `angular-answer`, `bach-001`, `dense-modal`, `modal-cadence`, `modal-dorian`, and `sparse-cadence`.

Theory basis: motivic economy is useful in fugue when recurrence changes harmonic goal, sequence direction, cadence role, inversion, or texture. The repeated cell is not accepted as filler; it must be accompanied by phrase-function evidence.

Project response: future fragment reviews should compare the old family share with `fragmentFunctionEvidence` before treating recurrence as either musical development or mechanical reuse.

### 4. Modal and angular counter-subject identity has window evidence

Modal and angular seeds still sit near the old aggregate floor, but Phase 13T now records counter-subject windows with counter-subject voice, rhythm pattern, contour class, support collision count, and retention kind.

Focused seeds:

| Seed | Aggregate retention | Recognizable or altered windows |
| --- | ---: | ---: |
| `modal-dorian` | 0.632 | 41 |
| `angular-answer` | 0.591 | 40 |
| `modal-answer` | 0.545 | 41 |
| `modal-cadence` | 0.573 | 41 |
| `dense-modal` | 0.571 | 41 |

Theory basis: modal color can alter interval content, but the counter-subject must remain recognizable as rhythm and contour near entries. The new window evidence prevents aggregate retention from hiding whether identity loss comes from rhythm flattening, register collision, or support formula overwrite.

Project response: accept the modal aggregate tradeoff for Phase 13T because each focused seed now has score-window examples. Continue to treat weak windows as Phase 8 listening review material, not as a reason to revert the entry-support rhythm repair.

### 5. Focused listening notes

`organ-default`: risk seeds have clearer entry explanations after the step-resolution-aware classifier. The subject remains audible through most entry windows; remaining roughness is concentrated where pitch-class color doubling coincides with adjacent-second friction. The accepted tradeoff is diagnostic reclassification: old unresolved severe-interval counts fall only when the entry line resolves by step within the review deadline.

`strict-counterpoint`: the same windows expose dissonance more plainly because the profile reduces expressive masking. The remaining review task is not UI playback correction; it is to use the new sonority and voice-pair function fields during Phase 8 listening to decide whether a local clash is useful tension, functional support, or mechanical coupling.

Manual human listening remains incomplete. These notes are agent-side score-window listening review and do not replace later pairwise preference collection.

## Structural Hypothesis

Symptom: Phase 13S output sounded formulaic because entry support and counter-subject lines often shared the entry rhythm grid while local sonorities mixed pitch-class unison stacks with adjacent-second friction.

Repeated pattern: the same broad axes appeared in all 22 seeds, but score windows showed multiple causes: functional entry support, cadence support, sequence support, color doubling, and mechanical coupling.

Evidence strength: confirmed for generated ScoreEvent structure and diagnostics; plausible for listening. Human listening is still a residual Phase 8 evidence gap.

Project response: Phase 13T is complete. Phase 8 may resume with `qualityVector.schemaVersion` 2 / `modelVersion` 2, using `entrySonorities`, `voicePairFunctions`, `fragmentFunctionEvidence`, `counterSubjectWindows`, and `metricExplanations` as the truthfulness layer for future review.
