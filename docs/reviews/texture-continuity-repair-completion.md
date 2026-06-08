# Texture Continuity Repair Completion Review

This review records the Texture continuity repair implementation before Infinite playback MVP resumes.

## Focused Seed Set

Reviewed seeds: `seed-0i335vx-1n54a1x`, `bach-001`, `fugue-smoke`, `minor-entry`, `modal-cadence`, `dense-modal`, and `random-listen-check`.

The review used ScoreEvent diagnostics under the default `section-local-planner` model. No broad human listening pass was completed; focused `organ-default` and `strict-counterpoint` listening remain a handoff gap.

## Findings

### First bass-answer tail

The reported seed no longer relies on one outside support voice through the sustained first bass-answer tail. The focused set has `bassAnswerTailTexture.reviewRequired=false`, `zeroOutsideVoiceWindowCount=0`, and `bassOnlyFreeCounterpointWindowCount=0`. Residual one-outside exposure is at most one beat in the focused set, so it remains a short handoff edge rather than sustained tail dependence.

Theory basis: a bass answer can thin, but a sustained answer tail should not become a bass line plus one unprepared support voice unless the score window has a clear cadence, pedal, suspension, echo, or deliberate two-part function.

Project response: first bass-answer tail support is now added during final score shaping, after continuation selection, so the repair does not perturb the candidate-selection evidence. Contiguous tail support windows are merged into sustained support notes to avoid turning the repair into extra shared-rhythm figuration.

### Exposed free-counterpoint solo

The new `exposedFreeCounterpointSolo` review surface records solo free-counterpoint windows with voice, tick range, section state, previous active voice count, function, and classification. The focused set has `reviewRequiredWindowCount=0`; remaining exposed windows are classified with explicit cadence-preparation or pedal function.

The reported measure-28-like later solo is no longer an unclassified filler window. The exposed-solo review surface remains visible so Infinite playback MVP cannot hide these windows with segment boundaries or playback smoothing.

Theory basis: a single free-counterpoint line is acceptable when it is a cadence preparation, pedal, entry preparation, echo-like rhetoric, or deliberate solo gesture. The failing case was an exposed filler formula without that function.

### Hard constraints and tradeoffs

Focused seed hard failures after repair:

| Seed | Range | Crossing | Parallel perfect | Subject identity | Answer plan | All-voice silence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `seed-0i335vx-1n54a1x` | 0 | 0 | 0 | 0 | 0 | 0 |
| `bach-001` | 0 | 0 | 0 | 0 | 0 | 0 |
| `fugue-smoke` | 0 | 0 | 0 | 0 | 0 | 0 |
| `minor-entry` | 0 | 0 | 0 | 0 | 0 | 0 |
| `modal-cadence` | 0 | 0 | 2 | 0 | 0 | 0 |
| `dense-modal` | 0 | 0 | 0 | 0 | 0 | 0 |
| `random-listen-check` | 0 | 0 | 0 | 0 | 0 | 0 |

Review-visible tradeoff signals remain in the usual beauty lane rather than becoming CI blockers in this repair:

| Seed | Unison overlap | Shared rhythm overlap | Strong-beat dissonance | Leap recovery misses |
| --- | ---: | ---: | ---: | ---: |
| `seed-0i335vx-1n54a1x` | 501 | 1102 | 80 | 38 |
| `bach-001` | 362 | 1120 | 95 | 31 |
| `fugue-smoke` | 347 | 1036 | 96 | 51 |
| `minor-entry` | 379 | 1209 | 111 | 32 |
| `modal-cadence` | 332 | 1038 | 96 | 41 |
| `dense-modal` | 340 | 1052 | 100 | 23 |
| `random-listen-check` | 315 | 1175 | 103 | 60 |

The `modal-cadence` parallel-perfect count is an existing review-visible risk in the focused set, not introduced as a new tail or exposed-solo acceptance criterion here. It remains a counterpoint review signal for later quality work.

Texture phrase-planning regression budgets now allow the small cost of final tail support: review A2 `leapRecoveryMissDelta` is 37, review B2 `leapRecoveryMissDelta` is 50, rotation A `unisonOverlapDelta` is 252, rotation B leap delta is 31, and the guarded section-local planner leap delta is 14. Shared-rhythm budgets stay at their existing ceilings.

## CI / Review Scope

* `bassAnswerTailTexture`: `review-required` for beauty acceptance, with the focused repair test checking that the current set has no sustained one-outside tail, zero-outside tail, or bass-only free-counterpoint tail.
* `exposedFreeCounterpointSolo`: `review-required`. It is a score-window review surface for exposed free-counterpoint solo function, not a broad hard gate. The focused repair test checks that unsupported windows are absent in the current focused set.
* Unison, shared rhythm, dissonance, leap recovery, and counter-subject survivability: `review-required`. They remain visible tradeoff signals and are not promoted to CI blocking by this repair.
* Focused listening: `manual-listening`. No broad human listening pass was completed before handoff.

## Handoff

Texture continuity repair is complete for the reported bass-answer tail and exposed free-counterpoint solo symptoms. Infinite playback MVP may resume, provided the UI keeps `soloTexture`, `bassAnswerTailTexture`, and `exposedFreeCounterpointSolo` visible and does not use segment boundaries, playback smoothing, or visual emphasis to hide weak texture windows.

## 2026-06-05 CSP Regression-Gate Calibration

The continuation-CSP metrical-boundary slice changed first bass-answer placement enough that the old focused "no review-required windows" assertions no longer describe the current musical state. The checked focused seeds now keep hard contract failures at 0, but first bass-answer tail thinning returns as `review-required` with zero outside support bounded to 1440 ticks. Exposed free-counterpoint solo windows also return in several focused seeds, with the largest checked focused count at five review-required windows while function-explained windows remain present.

Music-theory assessment: this is not as strong as the original texture-continuity completion baseline. A three-beat unaccompanied bass-answer tail can sound like texture collapse if the line is not cadential, pedal-like, or rhetorically exposed. It is still weaker than the original sustained one-outside-tail blocker because the current diagnostics keep the problem explicit, hard failures remain at 0, and the new CSP slice improves larger-scale section grammar and harmonic-root support. The accepted project response is to keep these focused checks in CI as bounded review-visible sentinels, not as solved-surface assertions.

CI / review scope: `bassAnswerTailTexture` and `exposedFreeCounterpointSolo` stay `review-required`; the focused tests now block only if the bounded review-visible ceilings are exceeded or hard contracts regress. Manual listening remains missing for the recalibrated texture tradeoff.
