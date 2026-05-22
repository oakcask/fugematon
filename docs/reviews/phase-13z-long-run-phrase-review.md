# Phase 13Z Long-Run Phrase Review

This review records why Phase 13Z is inserted after Phase 13Y and before Phase 8/9. It starts from user listening feedback on `seed-0zereox-1v729ih`: initial subject diversity has improved, but as the piece continues it starts to sound like repeated similar phrases. A focused diagnostics sweep suggests the same risk is not seed-specific.

## Findings

### 1. Long-run subject-return recurrence remains audible after subject diversity work

Representative seed: `seed-0zereox-1v729ih`.

At 61440 ticks, the continuation contains 15 non-exposition sections. The dominant subject family is `0-2-1-3-4-2-3-1`, with 9 occurrences and top subject-stem share 0.529. The same seed also repeats the shortened stretto stem `0-2-1-3-4-2` in several stretto-like sections.

The section-state pattern is not simply one four-section loop: unique four-section pattern count is 12 and most repeated four-section pattern count is 1. The problem is therefore not only section grammar. The state labels and cadence kinds vary, but the audible subject-return material keeps coming back with too little functional contrast.

Current diagnostics coverage: partial. `phase13RReview` reports `subject-stem-family-concentration`, but the summary is too aggregate to say whether recurrence is function-bearing or mechanical in a particular late-score window.

Project response: add Phase 13Z before Phase 8. The fix belongs in long-run phrase-development diagnostics, subject-return and stretto candidate generation, and history-aware selection, not in UI segmentation or playback rendering.

### 2. The pattern generalizes across seeds

A focused sweep across 24 seeds at 61440 ticks found review signals in 19 seeds. `subject-stem-family-concentration` appeared in 15 seeds, `subject-fragment-family-concentration` in 3 seeds, and low four-section diversity in 6 seeds.

Affected seeds include representative, boundary, rotation, modal, adversarial, ad hoc listening, and user-reported seeds. Examples:

* `fugue-smoke`: top subject-stem share 0.438.
* `minor-entry`: top subject-stem share 0.5.
* `sparse-cadence`: top subject-stem share 0.5.
* `bright-answer`: top subject-stem share 0.533.
* `modal-answer`: top subject-stem share 0.471.
* `random-listen-check`: top subject-stem share 0.438.
* `seed-0zereox-1v729ih`: top subject-stem share 0.529.

Some seeds, such as `bach-001` and `long-arc`, stay below the subject-stem threshold. These are useful controls because they show that the detector does not simply reject all recurrence.

Current diagnostics coverage: partial. The aggregate finding is visible, but it does not compare adjacent late windows, repeated voice-pair formulas, or whether recurrence changes phrase function, harmonic target, density, or contrapuntal tension.

Project response: Phase 13Z should add windowed evidence and review a mixed seed set instead of optimizing only the user-reported seed.

### 3. The generator gives episodes more variation than subject returns and stretto-like sections

Implementation inspection points to the continuation candidate model:

* `phraseSubjectForIntent` only derives alternate phrase subjects for episodes. For subject-return and stretto-like sections it returns the original subject material.
* `buildContinuationCandidates` therefore creates many subject-return candidates that differ by voice, offset, cadence, and support texture, but not by enough audible subject-stem development.
* `buildPhase12PhraseFamilyOracleCandidates` offers some alternate subject and fragment candidates, but the pool is small and fixed.
* `historyAwareStateScore` works on state, cadence, density, and key distance. It does not directly penalize repeating the same subject stem, stretto stem, subject-fragment family, or stretto voice-pair formula across the late continuation.

This explains why the generated score can look formally varied while sounding phrase-repetitive: state labels, cadence labels, and local keys move, but the listener keeps hearing the same subject-stem family.

Project response: Phase 13Z should add history-aware novelty budgets for subject-return, stretto-like, and episode material. It should prefer upstream generator change over hiding the symptom in candidate reporting.

### 4. Solo-texture scoring may reinforce listener fatigue

The section-local planner currently subtracts `soloTextureRisk * 12` in the selection adjustment. That can make high solo-texture risk act like a reward. This is not the main subject-stem cause, but it can make late continuations sound thinner, less developmental, or more fatiguing.

Current diagnostics coverage: visible through candidate-pool oracle and solo-texture summaries, but not connected to long-run phrase fatigue.

Project response: Phase 13Z should correct or justify this scoring before accepting long-run phrase-development improvements that trade into texture thinning.

## Structural Hypothesis

Symptom: later continuation sounds like repeated similar phrases even when the initial subject is more diverse.

Repeated pattern: subject-return and stretto-like sections reuse the same subject-stem family more often than their section labels imply. Episodes receive some derived stems, but subject returns and stretto-like entries do not get enough guarded developmental variants. Existing history scoring avoids some state-cycle repetition but does not model stem-family or phrase-function novelty.

Theory basis: fugue recurrence should be recognizable but functional. Subject returns, episodes, sequences, cadential extensions, and stretto compression should change role, direction, tension, voice assignment, harmonic target, or contrapuntal setting. Repetition without changed function reads as mechanical continuation rather than development.

Evidence strength: confirmed as a diagnostic and implementation pattern across a focused seed sweep; human listening is confirmed for `seed-0zereox-1v729ih` and still missing for the broader seed set.

Project response: generator change, selection scoring change, diagnostics change, and focused listening rubric.

## Phase 13Z Plan

Phase 13Z is inserted after [Phase 13Y](../phases/phase-13y.md) and before [Phase 8](../phases/phase-8.md). Phase 13Y remains the entry-continuity prerequisite; Phase 13Z handles long-run phrase development before infinite playback extends the same recurrence over longer sessions.

Required work:

1. Add windowed long-run phrase-development diagnostics for subject stem, stretto stem, fragment derivation, phrase function, entry voice, local key, cadence kind, and density arc.
2. Add guarded subject-return and stretto-like stem alternatives. Preserve subject identity and answer treatment, but vary contour, tail, rhythm, voice assignment, harmonic target, and cadence preparation where score-window guardrails allow it.
3. Add selection penalties or novelty budgets for recent repetition of subject stems, stretto pair formulas, phrase functions, and fragment derivations.
4. Review the section-local solo-texture scoring sign and require evidence that any change does not create new thinning fatigue.
5. Re-run focused long-run evidence on representative, boundary, rotation, modal, adversarial, ad hoc listening, and user-reported seeds.
6. Record focused `organ-default` and `strict-counterpoint` listening notes for repaired long-run windows.

No human listening pass was completed for the broad sweep in this review. The planning decision is still strong enough to defer Phase 8 because the user-reported symptom matches diagnostics and the implementation pattern explains why infinite playback would amplify it.
