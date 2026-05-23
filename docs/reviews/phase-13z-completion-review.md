# Phase 13Z Completion Review

This review records the Phase 13Z repair for long-run phrase development after Phase 13Y. It checks the generated score instead of preserving old exact metrics as compatibility.

## Findings

### 1. Subject-return and stretto recurrence no longer collapse into one dominant stem

Affected seeds: `bach-001`, `fugue-smoke`, `modal-cadence`, `dense-modal`, `angular-answer`, `modal-answer`, `minor-entry`, `sparse-cadence`, `random-listen-check`, and `seed-0zereox-1v729ih`.

The user-reported seed `seed-0zereox-1v729ih` moved from the planning-review symptom of one dominant late subject-stem family to a dispersed subject-return set. Its top subject-stem share is now below the Phase 13R concentration threshold, and the focused set has no `subject-stem-family-concentration` finding.

Theory basis: fugue material should recur recognizably, but repeated subject returns and stretto compression need changed role, voice assignment, local key, cadence goal, or contour pressure to read as development rather than a loop.

Project response: Phase 13Z extends guarded stem variation beyond episodes into subject-return and stretto-like sections, then adds a history-aware novelty adjustment so recent same-stem reuse is less likely to win selection.

### 2. Windowed diagnostics now distinguish recurrence function

Affected seeds: 22 seed review bundle plus `random-listen-check` and `seed-0zereox-1v729ih`.

`phase13ZReview` reports continuation windows by seed tick, state, form, entry voice, stem pattern, phrase function, cadence kind, local key, recent reuse count, and judgement. The judgement separates `new-material`, `function-bearing-recurrence`, and `mechanical-reuse`.

The 22 seed bundle has no Phase 13Z top-level review-required seed after the repair. Remaining mechanical-reuse windows are kept as review signals under a bounded budget, not CI blockers, because some repeated subject material is valid fugue behavior when the surrounding score shows enough contrast. `seed-0zereox-1v729ih` has more function-bearing recurrence windows than mechanical-reuse windows.

Theory basis: Fux/species counterpoint supports line independence and controlled recurrence; fugue practice supports recognizable returns when they change contrapuntal role or developmental pressure.

Project response: keep `phase13ZReview` as Phase 14 input. Phase 14 should read these windows beside entry continuity, line agency, and counter-subject survivability instead of treating a green aggregate as proof of beauty.

### 3. Hard constraints and Phase 7B readiness are preserved

Affected seeds: standard 22 seed review bundle.

The post-repair 22 seed sweep keeps range, voice-crossing, subject-identity, answer-plan, and key-metadata hard failures at 0. Phase 7B readiness remains true for all 22 seeds. The repair changes model behavior and expected values deliberately; it is accepted because the score-window review shows better long-run phrase development without breaking the hard constraints.

Accepted metric movement: selected long-run variation raises some leap-recovery, unison, unresolved-entry severe-interval, and same-pitch local counts in older Phase 10-13 regression tests. The musical tradeoff is accepted because those tests are model-behavior records, not compatibility locks: subject-stem concentration is repaired, fragment-family concentration is lower in the focused Phase 13S batches, section grammar diversity remains improved, bass-root support remains improved, and hard constraints stay clean. These movements should be reviewed again in Phase 14 beside line agency and counter-subject survival.

Project response: update tests to assert the new Phase 13Z baseline for focused seeds and preserve the hard-constraint/Phase 7B context.

## Focused Listening Notes

`organ-default`: `seed-0zereox-1v729ih` no longer reads as a late continuation dominated by one stem. Subject returns and stretto-like entries still recur recognizably, but the changed stems and entry roles reduce same-family fatigue. Remaining repeated windows are acceptable as review signals for Phase 14, not as a Phase 13Z blocker.

`strict-counterpoint`: `modal-cadence` is the strictest focused control because modal material still creates the highest remaining mechanical-reuse count in the focused set. The top subject-stem share stays below the concentration threshold, hard constraints remain clean, and the repeated windows should be reviewed in Phase 14 together with line agency and counter-subject survival.

Human listening gap: no broad human listening pass was completed. This completion decision is based on deterministic ScoreEvent windows, diagnostics, generated MIDI availability, and agent-side score reading across representative, boundary, rotation, modal, adversarial, ad hoc listening, and user-reported seeds.

## CI / Review Scope

| Item | Classification | Reason | Action |
| --- | --- | --- | --- |
| `phase13ZReview` | `review-required` | Phrase development is aesthetic and score-window dependent. | Keep in diagnostics and focused tests; do not make aggregate mechanical-reuse count a PR CI blocker. |
| Focused Phase 13Z seed set | `review-required` | It covers representative, boundary, modal, adversarial, ad hoc listening, and user-reported classes. | Use for regression tests and completion review. |
| 22 seed review bundle | `review-required` | Broad enough for adoption evidence, too broad for every PR gate. | Keep as generated review evidence. |
| Hard constraints and Phase 7B readiness | `ci-observed` | These are safety/context signals that Phase 13Z must preserve. | Keep existing gate tests and focused Phase 13Z assertions. |
| Remaining mechanical-reuse windows | `review-required` | Repetition can be valid fugue recurrence or mechanical reuse depending on score-window context. | Carry to Phase 14 for score-led beauty review. |

## Completion Decision

Phase 13Z is complete. Phase 14 may begin score-led beauty work, preserving `phase13ZReview` as phrase-development evidence. Phase 8 remains deferred until Phase 14 records score-window beauty evidence for entry continuity, line agency, counter-subject survivability, phrase development, and metric truthfulness.
