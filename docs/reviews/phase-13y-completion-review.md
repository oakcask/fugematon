# Phase 13Y Completion Review

This review records the Phase 13Y generalized entry-continuity evidence. It uses the standard 22 seed review set and focused ScoreEvent windows from the current generator.

Source family basis: Fux/species counterpoint for line independence, oblique motion, preparation, suspension, and resolution; common-practice fugue for exposition pacing, answer rhetoric, counter-subject continuity, and entry-order flexibility. Specific editions were not rechecked in this pass, so the theory basis remains source-family level.

## Findings

### 1. Entry-boundary continuity is generalized beyond bass windows

`entryBoundaryContinuity` now reports schema version 3. Each reviewed window includes `entryVoice`, `entryOrderIndex`, `state`, `form`, `alreadyEnteredVoices`, carried support, suspension/resolution, delayed support, staggered continuation, prepared collective articulation, unsupported entry-local thinning, and the final classification.

Across the 22 seed review set, the diagnostics reviewed 666 important entry windows, including 478 non-bass windows. The bundle reported 0 synchronized resets and 0 unsupported entry-local thinning windows. It kept 259 prepared collective articulations visible as review evidence rather than hiding them as generic support.

### 2. Phase 13X and Phase 13X2 evidence remains intact

The first-bass-answer repair remains clean: 0 seeds report `firstBassEntrySynchronizedReset`. The Phase 13X2 tail evidence also remains clean: 0 seeds report `bassAnswerTailTexture.reviewRequired`.

Representative focused windows:

| Seed | First bass answer | Non-bass entry window |
| --- | --- | --- |
| `bach-001` | bass answer at quarter 12; soprano carries and delays through the boundary. | soprano answer at quarter 4; alto staggers continuation after the answer starts. |
| `fugue-smoke` | bass answer at quarter 12; soprano carries and delays through the boundary. | soprano answer at quarter 4; alto staggers continuation after the answer starts. |
| `minor-entry` | bass answer at quarter 12; soprano carries and delays through the boundary. | tenor subject at quarter 8; alto is an already-entered voice and staggers continuation. |
| `dense-modal` | bass answer at quarter 12; soprano carries and delays through the boundary. | soprano answer at quarter 4; alto staggers continuation after the answer starts. |

Musical judgement: the diagnostic is now asking the right musical question. It checks whether an important entry enters an already-living fabric, regardless of whether the entering voice is bass. A single already-entered line articulating at the first answer is not treated as the same failure as a multi-voice synchronized reset; the blocker remains the unprepared collective restart of multiple already-entered voices.

### 3. Support candidates remain voice-parameterized

The current continuation candidate path already chooses support by entering voice and voice order through the existing continuity texture inputs. Phase 13Y keeps the selected score behavior stable and generalizes the review surface first, rather than widening the boundary-softening mutation and regressing older Phase 10-12 metric baselines.

Project response: keep `synchronizedResetCount`, `preparedCollectiveArticulationCount`, and `unsupportedEntryLocalThinningCount` as review signals for Phase 13Z and Phase 14. Future generator changes may use these generalized fields as selection pressure, but this completion pass does not need to accept broad metric regressions to prove the review model.

### 4. Focused profile notes

`organ-default` should make the repaired first bass answer audible as a supported entry rather than a three-part upper-voice attack. `strict-counterpoint` should make the non-bass windows easier to inspect: the exposed answer windows rely on staggered continuation or carried support, while prepared collective articulations remain visible for later score-led review.

No separate human listening pass was completed. The review relies on ScoreEvent windows, diagnostics, and profile-aware listening notes derived from the generated score evidence.

## Handoff

Phase 13Y is complete. Phase 13Z may begin long-run phrase-development work, but it must preserve the generalized entry-continuity fields, the Phase 13X first-bass repair, and the Phase 13X2 bass-answer-tail signal.
