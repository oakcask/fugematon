# Music-box n20 voice-crossing structural review

This review records a user-reported symptom: `seed-04fup6t-1rmrxhp` with `music-box-n20` appears to produce voice crossing. The finding is not seed-specific.

## Findings

Finding: `music-box-n20` exposes a writing-profile model-boundary failure.

Affected seeds: `seed-04fup6t-1rmrxhp`, `bach-001`, `fugue-smoke`, `minor-entry`, `modal-cadence`, `dense-modal`, `tight-stretto`, and `seed-19l7uit-1u226cc`.

Evidence: the same seeds under `four-voice-default` report 0 voice crossings, range violations, subject-identity violations, and answer-plan violations. Under `music-box-n20`, the same set reports 49-120 voice crossings per seed, all sampled first crossings are tenor / bass crossings, and selected candidates carry large range-failure pressure before final profile projection. The reported seed has 54 voice crossings, 28 subject-identity violations, 11 answer-plan violations, 0 final range violations, and 0 final writing-profile pitch violations.

Theory basis: Fux-style voice independence treats adjacent voice crossing as a hard contrapuntal failure unless it has a deliberate invertible-counterpoint function. These windows do not show deliberate invertible-counterpoint rhetoric; they are lower-voice compression artifacts. The keyboard-writing-profile source family also supports keeping compass and playability as generation constraints, not only playback or final projection constraints.

Structural hypothesis: the generator chooses key, subject family, answer relation, and section-local candidates before the active writing profile has enough authority over pitch-class availability and adjacent-register order. `music-box-n20` is a fixed diatonic pitch set, but `chooseKeySignature` still chooses from all 12 tonics. For the reported seed, the initial key is Db major, whose subject and answer pitch classes cannot be represented by the n20 pitch set. Later `constrainNotesToWritingProfile` maps notes to nearest allowed pitches, clearing final pitch-set diagnostics while breaking subject / answer identity and leaving bass notes above tenor notes.

Additional evidence: the issue is not limited to unavailable pitch classes. `music-box-n40` is chromatic, keeps subject and answer identity at 0 violations in the sampled seeds, but still reports 5-26 voice crossings across the same sample set. That points to a second structural layer: narrow profile voice ranges and overlapping tenor / bass ranges are still handled partly by post-generation range projection and legacy texture repair logic instead of by an adjacent-voice-order-aware profile solver.

Current diagnostics: `voiceCrossings`, `subjectIdentityViolations`, and `answerPlanViolations` detect the final broken output. The missing diagnostic is a pre-selection profile feasibility check that rejects key / subject / answer plans whose pitch-class set or adjacent-register placement cannot be realized by the active profile without crossing.

## Project response

Do not repair this with a literal seed, key, pitch, measure, or voice exception. The repair boundary should be the writing-profile generator model:

* choose or transpose keys from the active profile's pitch-class support, or explicitly degrade to a documented reduced-mode profile when the pitch set cannot realize the requested mode;
* build subject, answer, and subject-fragment candidates against the active profile before entry plans are accepted;
* make adjacent-order preservation part of profile-aware pitch placement, not only a final score cleanup;
* run score-level support cleanup and harmonic support solvers on profile-constrained notes, then re-check hard constraints after any final projection;
* keep final `constrainNotesToWritingProfile` as a safety net, not as the main mechanism that makes generated notes profile-compatible.

## CI / review scope

`music-box-n20` voice crossing on the reported seed is `review-required` evidence until the repair exists. After repair, it should become a focused `ci-blocking` regression because it is a hard contrapuntal constraint under an explicit writing profile.

Cross-seed `music-box-n20` key / subject feasibility is `review-required` now and should become `ci-observed` or `ci-blocking` once a profile-feasibility model exists.

`music-box-n40` residual tenor / bass crossing is `review-required` evidence for the register-order layer. It should not be hidden by fixing only n20 pitch-class selection.

## Verification gap

Implementation update: the repair is now represented as a constrained-profile feasibility slice. Key selection rejects profile-infeasible key / subject / answer combinations and profile-infeasible harmonic-anchor support, subject selection filters against the active profile pitch-class and adjacent-entry-order domains, constrained exposition spacing widens only when the selected subject cannot keep adjacent order in the active profile, adjacent voice-order search runs inside exposition / texture candidate construction, and final `WritingProfile` projection is checked as a no-op invariant instead of mutating notes.

Focused regression evidence: `seed-04fup6t-1rmrxhp` now reports 0 voice crossings, range violations, writing-profile pitch violations, subject-identity violations, answer-plan violations, and key metadata mismatches for `music-box-n20`, `music-box-n40`, and `four-voice-default`. The `music-box-n20` repair deterministically chooses C major for the constrained profile rather than the infeasible Db major plan, while the chromatic and default profiles preserve their feasible seed-derived key.

Default-profile review gate sync: the constrained-profile planning slice leaves hard constraints repaired in the default review seeds but shifts review-only aggregate baselines. Score-beauty batch one keeps four seeds, three initial subject rhythm patterns, two climax indexes, top subject-fragment family share at 0.5, unresolved severe entry intervals at 26.5 quarters, and counter-subject identity retention total at 2.725. Score-beauty batch two keeps four seeds, three initial subject rhythm patterns, three climax indexes, top subject-fragment family share at 0.5, and unresolved severe entry intervals at 17.5 quarters, while counter-subject identity retention totals 2.159. Texture / phrase planning batch B1 keeps all four state sequences changed, lowers section-grammar risk from 247 to 47, lowers top entry-pattern family concentration from 56 to 28, improves bass-root support from 118 to 134, and trades that against counter-subject identity retention moving from 3.473 to 2.729. Counter-subject support modal seeds keep 200 review windows, 84 preserved windows, 111 tradeoff windows, and 5 weak windows, with support-collision total 673. Episode motivic repetition batch E keeps 0 hard failures, full derivation coverage, no generic free-counterpoint duration, and 5 unsupported solo windows; repeated stock formula total is 278 and mechanical reuse total is 28 across `quiet-cadence`, `angular-answer`, and `modal-answer`. Contour guardrails keep hard gates passing while recalibrating review-only pressure: `tight-stretto` severe entry intervals are bounded at 63, `minor-entry` same-pitch overlap at 99, and leap-recovery misses at 98 for `quiet-cadence` and 86 for `modal-answer`; several exact same-pitch overlap sentinels improved and were tightened accordingly. These remain `ci-blocking` regression sentinels for hard failures and `ci-observed` review-signal ceilings for phrase repetition / counter-subject retention / contour pressure.

Additional focused evidence: the reported seed is in 3/4. The `music-box-n20` q=9-12 soprano window now avoids A6 while keeping 0 voice crossings and 0 profile / entry hard-contract failures. This is handled by profile-aware voice-order search plus a high-register soprano-leap soft cost and support-pitch fallback, not by a seed, tick, pitch, or voice exception.

CI stabilization update: the section-local planner can still emit compressed `music-box-n20` tenor / bass subject-answer crossings after profile projection on `seed-1wudr38-0fbqzth`. The current repair applies the existing final `WritingProfile` projection before diagnostics, then runs a bounded music-box voice-order retune that only accepts candidate retunings when the constraint evaluator reduces total hard failures. This keeps `music-box-n20` at 0 voice crossings, range violations, writing-profile pitch violations, subject-identity violations, key metadata mismatches, and same-pitch overlaps for the focused 80-quarter and full-length checks. The tradeoff is now explicit: exact answer identity can move by up to 2 violations in the focused check and 4 in the full-length check because preserving the answer literally conflicts with the 20-note pitch set and adjacent-order contract.

Profile-aware harmonic feasibility regression: `seed-1wudr38-0fbqzth` remains the focused constrained-profile harmonic seed. The repaired path keeps `nonChordStructuralSupportCount` at 0 for `music-box-n20`; harmonic-sonority generator-response windows are currently bounded at 20 and remain `review-required` soft-cost evidence, not a hard gate. The default and harpsichord profiles still require 0 voice crossings, range violations, writing-profile pitch violations, subject-identity violations, answer-plan violations, and key metadata mismatches.

No listening pass was performed. The evidence is ScoreEvent and diagnostics based.
