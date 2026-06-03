# Generator Constraint Rebuild Section CSP Review

Status: implementation slice accepted for focused tests and 22 seed standard diagnostics review. Manual listening remains open, and CSP counters remain review-required.

## Findings

1. Continuation silence is now represented as internal CSP state, not public score data.

   A section slot can be `note`, `hold`, or internal `intentional-rest`. Public `ScoreEvent` remains note/meta only, and the public contract test rejects any emitted rest kind. Allowed rest reasons are limited to cadence breath, entry handoff delay, register relief, suspension resolution, and pedal thinning.

   Theory basis: `music-constraint-programming` supports declarative, modular constraints for music theory rules. In Fugematon this becomes a local finite-domain section model instead of a new rendering or event kind.

2. Texture coverage now has section-window CSP evidence.

   Focused synthetic tests reject unsupported one-voice continuation, long unplanned silent runs over two quarter notes, all-voice silence, and structural anchor windows without root or chord support. The new `constraintSatisfactionReview` schema 1 records min/max active voices, rest/silence spans, infeasible counts, relaxation level, and candidate count.

   Theory basis: species/counterpoint and four-voice harmony constraint sources support separating hard coverage/support requirements from softer line-agency and independence costs. This implementation keeps the new counts review-visible before promoting them to CI hard gates.

3. The local-first dependency policy is preserved.

   No external solver dependency was added. Section-local trace rows now expose `section-csp-*` soft-cost reasons and hard-failure codes for invalid rest reasons, voice coverage, and structural support. External OR-Tools, Gecode, ASP, or integer-programming alternatives remain deferred until bounded local search fails documented acceptance thresholds.

   Theory basis: Sprockeels and Van Roy show a Gecode-backed four-voice harmony model is practical, while Anders and Miranda survey broader music CP systems. Those sources justify the model boundary, not an immediate browser dependency.

## Verification

Focused checks:

* `section CSP accepts intentional rests only with allowed reasons`
* `section CSP rejects unsupported solo and long unplanned silent runs`
* `section CSP requires structural root and chord support at harmonic anchors`
* `section CSP diagnostics are deterministic for the same seed and input`
* Public contract rejects `kind: "rest"` and exposes `constraintSatisfactionReview.schemaVersion = 1`

Focused generated seed:

* `fugue-smoke`, 32 quarter-note ticks, used for deterministic diagnostics equality.

Standard generated bundle:

* Bundle: `samples/generator-constraint-rebuild-section-csp-standard-review`.
* Scope: 22 standard review seeds, `organ-default` performance profile version 3, `four-voice-default` writing profile version 1, 129600 ticks.
* CSP aggregate: 670 section windows, 1166 intentional rest spans, 1356 unplanned silent runs, 1557 unsupported-solo tick windows, 97 all-voice-silence tick windows, 2086 min-active-voice violations, 656 long-unplanned-silence violations, 776 structural chord-support misses, 630 structural root-support misses, and 70195 deterministic local candidate-count units.
* Every seed selected `infeasible` as the CSP relaxation level. The longest unplanned silent run was 4320 ticks in `angular-answer`, `close-imitation`, `lyrical-line`, and `tight-stretto`.

Musical classification:

* The 22 seed bundle confirms the CSP surface is useful as a planner-pressure diagnostic, not as an adoption gate. The counts repeat across representative, boundary, modal, and rotation seeds, so they do not identify a single bad seed or a narrow literal case.
* Source-family basis: counterpoint and four-voice harmony sources justify requiring line coverage and structural support, while music-constraint-programming sources justify separating hard failures from soft relaxation. The current generated evidence shows the diagnostic is broader than the current continuation planner can satisfy.
* Structural hypothesis: the section planner still uses many section templates where non-entry voices leave long gaps and low voices do not always provide root or chord-tone support at anchors. The CSP evaluator exposes that texture-harmony pressure, but it also counts some musically tolerated thinning as infeasible because the local finite-domain model does not yet encode enough section-function exceptions.

## CI / Review Scope

`constraintSatisfactionReview` remains `review-required` for this slice. The 22 seed bundle records affected windows and false-positive risk, but it does not support promotion to `ci-observed` or `ci-blocking` because every seed currently reaches infeasible relaxation. Promotion requires either a planner change that directly reduces unplanned silence and structural-support misses, or a calibrated CSP exception model that distinguishes accepted cadential / entry-handoff thinning from unsupported texture collapse.

## Remaining Gaps

No manual listening pass was run for this slice. The next implementation step should repair or calibrate the continuation planner against the CSP surface, then rerun the standard bundle and classify unplanned silence / unsupported solo findings by score-window function. The next focused review should include `fugue-smoke`, `angular-answer`, `seed-0zereox-1v729ih`, `lyrical-line`, `contrary-answer`, `modal-dorian`, and `seed-0i335vx-1n54a1x`.
