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

Default-profile review gate sync: the constrained-profile planning slice leaves hard constraints repaired in the default review seeds but shifts two review-only aggregate baselines. Score-beauty batch two keeps four seeds, three initial subject rhythm patterns, three climax indexes, top subject-fragment family share at 0.5, and unresolved severe entry intervals at 15 quarters, while counter-subject identity retention totals 2.923. Episode motivic repetition batch F keeps 0 hard failures, full derivation coverage, no generic free-counterpoint duration, no unsupported solo or bass-tail review windows, and mechanical reuse total 5; repeated stock formula total is 253 across `modal-cadence`, `contrary-answer`, and `dense-modal`. These remain `ci-blocking` regression sentinels for hard failures and `ci-observed` review-signal ceilings for phrase repetition / counter-subject retention.

Additional focused evidence: the reported seed is in 3/4. The `music-box-n20` q=9-12 soprano window now avoids A6 while keeping 0 voice crossings and 0 profile / entry hard-contract failures. This is handled by profile-aware voice-order search plus a high-register soprano-leap soft cost and support-pitch fallback, not by a seed, tick, pitch, or voice exception.

Profile-aware harmonic feasibility regression: `seed-1wudr38-0fbqzth` exposed a second constrained-profile path where subject / answer pitch classes were playable, but the planned structural support and adjacent tenor / bass order were not feasible inside `music-box-n20`. The repaired path keeps `music-box-n20`, `four-voice-default`, and `harpsichord-manual` at 0 voice crossings, range violations, writing-profile pitch violations, subject-identity violations, answer-plan violations, and key metadata mismatches. For `music-box-n20`, `nonChordStructuralSupportCount` is 0 and harmonic-sonority generator-response windows are reduced to 2; remaining thin support windows stay `review-required` soft-cost evidence, not a new hard gate.

No listening pass was performed. The evidence is ScoreEvent and diagnostics based.
