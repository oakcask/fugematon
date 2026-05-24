# Phase 14 Soprano Register Contour Review

This review records the user-reported soprano leap symptom in `seed-1yc5rlr-184cz7l` and folds the fix target into the Phase 14 score-led beauty lane.

## Findings

### 1. The reported soprano leaps are real score-level contour failures

Affected seed: `seed-1yc5rlr-184cz7l`.

The focused 16-quarter exposition window is 4/4 in C major. The soprano answer and following free-counterpoint line include these exposed contours:

* measure 3: `B4 -> A5 -> D5`;
* measure 4: `C5 -> A5 -> D5`.

Existing diagnostics already flag the local symptom as soprano `leap-recovery-miss` around the same window. The most audible failures are not merely large intervals; they are large jumps that are not recovered by contrary step and that place the soprano at the top of its preferred range without a convincing melodic preparation.

Theory basis: Fux-like counterpoint and common-practice vocal melody. Large melodic leaps can be expressive, but exposed upper-voice leaps normally need registral preparation, contrary step recovery, or a clear structural reason.

Project response: generator change. Do not hide this with playback, articulation, visual segmentation, or a wider diagnostic threshold.

### 2. The cause is register placement, not a single bad random choice

Affected seeds: `seed-1yc5rlr-184cz7l`, with related soprano leap-recovery misses observed in representative and rotation seeds including `bach-001`, `wide-key`, `modal-dorian`, `circle-fifths`, `bright-answer`, `dark-episode`, `contrary-motion`, `angular-answer`, and `modal-cadence`.

The entry generator places each subject or answer pitch class into the voice register independently. For this seed, the soprano tonal answer has degree pattern `0-1-3-3-2-3-2-1` in G major. The register target maps `A` to `A5` while nearby `B` and `C` can sit at `B4` and `C5`, creating the exposed `B4 -> A5` leap.

The free-counterpoint path has a related issue. It tries to fit the next pitch near the previous note, but the soprano preferred lower bound prevents choosing the nearer lower octave in some contexts. This leaves `A5` as the selected support pitch after `C5`, again producing an exposed unrecovered leap.

Structural hypothesis: soprano register centering is currently stronger than melodic continuity. The problem repeats when answer transforms or support formulas ask for pitch classes near the soprano register boundary, especially `A` against surrounding `B`/`C`/`D`.

Evidence strength: confirmed for the reported seed and plausible across the focused seed sweep. A full before/after review bundle and listening pass remain missing.

## Plan Impact

Add a Phase 14 follow-up before the Phase 8 handoff:

1. Make subject and answer entry placement contour-aware, not only pitch-class-and-register aware. The octave choice should consider previous and next entry tones when preserving identity allows it.
2. Revisit free-counterpoint `fitPitchNearPrevious` so soprano can choose a nearer lower octave when that avoids an exposed unrecovered leap and does not create range, crossing, semitone, pitch-class-unison, or counter-subject collision regressions.
3. Add a focused regression for `seed-1yc5rlr-184cz7l` covering the third and fourth measure soprano contour.
4. Re-run a focused seed set including the reported seed plus representative, rotation, modal, and adversarial controls that already showed related soprano leap-recovery misses.
5. Accept the repair only if hard constraints stay intact and any change to subject identity, answer plan, counter-subject support, weak-dissonance, or phrase-vocabulary evidence is recorded as a score-window tradeoff.

## CI / Review Scope

| Item | Classification | Reason | Action |
| --- | --- | --- | --- |
| `seed-1yc5rlr-184cz7l` soprano register-contour window | `review-required` | User-reported, deterministic, musically clear, but still needs before/after score review and listening notes before CI promotion. | Keep as focused review evidence and add a nearby regression when implementing the repair. |
| Soprano leap-recovery misses in the focused seed sweep | `review-required` | Existing diagnostics detect many misses, but judging acceptable expressive leaps requires score-window context. | Use as implementation evidence, not as a broad PR blocker. |
| `leapRecoveryMisses` aggregate threshold | `ci-observed` / `review-required` | The aggregate count is useful context but does not identify whether the exposed soprano register failure is fixed. | Do not widen the threshold. Add window-specific review instead. |

No human listening pass was completed for this review.
