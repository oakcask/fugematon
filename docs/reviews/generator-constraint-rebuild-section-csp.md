# Generator Constraint Rebuild Section CSP Review

Status: implementation slice accepted for focused tests. Full 22 seed review and manual listening remain open.

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

## CI / Review Scope

`constraintSatisfactionReview` is `review-required` for this slice. It should become `ci-observed` or `ci-blocking` only after a 22 seed bundle records affected windows, musical symptoms, tradeoffs, and false-positive risk.

## Remaining Gaps

No 22 seed review bundle or manual listening pass was run for this slice. Current evidence is source-backed design plus focused ScoreEvent diagnostics tests. The next review should include `fugue-smoke`, `angular-answer`, `seed-0zereox-1v729ih`, `lyrical-line`, `contrary-answer`, `modal-dorian`, and `seed-0i335vx-1n54a1x`, then classify any unplanned silence or unsupported solo findings by score-window function.
