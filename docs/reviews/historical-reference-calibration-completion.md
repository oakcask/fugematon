# Historical Reference Calibration Completion Review

This review records the Historical Reference Calibration generator response after the documented source-manifest and reference-readiness baseline landed.

Evidence bundle:

* `samples/historical-reference-calibration-completion-organ`
* `samples/historical-reference-calibration-completion-strict`

The sample directories are generated review artifacts and are not source fixtures. Both bundles use the same generated score diagnostics; the two performance profiles were generated so focused listening can compare `organ-default` and `strict-counterpoint` without changing score-window evidence.

## Findings

### 1. Voice-pair coupling improved without new hard failures

The implementation compared the refactor baseline against the repaired generator on the 22 representative, boundary, rotation, and adversarial review seeds.

| Axis | Before | After |
| --- | ---: | ---: |
| `pitchClassUnisonDuration` aggregate | 1831.25 | 1790.75 |
| `durationBasedLockstep` aggregate | 2440 | 2404 |
| mechanical coupling quarters | 2157 | 2162.75 |
| pitch-class color doubling quarters | 1166.25 | 1172 |
| hard failures | 0 | 0 |
| unsupported exposed solo runs | 1 | 1 |

Affected seed set: the full 22 seed review bundle.

Theory basis: species counterpoint and fugue practice both prefer independent line agency unless lockstep has a clear local function such as subject support, cadence support, sequence support, pedal support, or prepared reinforcement.

Project response: candidate selection now weighs unresolved entry risk and voice-pair coupling more strongly. The change lowers persistent pitch-class unison and duration lockstep in aggregate while preserving subject and answer identity.

Tradeoff: mechanical coupling rose slightly in aggregate, the prior single unsupported exposed solo run remains, and rotation batch B now records a wider leap-recovery allowance. The after bundle still classifies these as review evidence rather than hard failures because function-aware spans and style-aware leaps require score-window review, but long spans remain visible through `voicePairFunctions`, `voicePairSpans`, and local sentinels.

### 2. Entry severe-interval evidence improved but remains review-required

Focused Historical Reference Calibration seeds: `circle-fifths`, `contrary-motion`, `modal-cadence`, `tight-stretto`, plus representative controls `bach-001`, `long-arc`, `modal-dorian`, and `bright-answer`.

| Axis | Before | After |
| --- | ---: | ---: |
| unresolved entry severe-interval quarters | 78 | 78.5 |
| unresolved-entry severe local sentinels | 130 | 131 |
| `pitchClassUnisonDuration` aggregate | 678.75 | 683.75 |
| `durationBasedLockstep` aggregate | 926.5 | 915.5 |
| mechanical coupling quarters | 778.25 | 778.75 |
| unsupported exposed solo runs | 0 | 0 |
| hard failures | 0 | 0 |

The full 22 seed bundle improved unresolved entry severe-interval quarters from 123.5 to 122.5 and unresolved-entry severe local sentinels from 220 to 218. The focused seed set did not improve entry friction; the remaining focused windows are carried as explicit repair targets rather than being hidden by the aggregate reference profile.

Theory basis: entry seconds and sevenths can be musically valid as prepared suspensions, passing friction, or delayed support, but unresolved accented entry clashes need local voice-leading explanation.

Project response: keep entry-local severe interval axes as `review-required`, not CI-blocking. The repaired model reduces aggregate pressure, and the remaining high-risk seeds continue to carry score-window repair targets rather than being accepted by the reference-profile aggregate.

### 3. Historical reference readiness remains correctly scoped

The generated review summary still reports `historicalReferenceCalibration.status: review-required`. `referenceDiagnostics.outsideReferenceSeedCount: 0` remains context only and does not satisfy beauty handoff.

Historical entry-local metrics remain threshold-excluded until subject entries are matched or manually annotated. Leap-recovery comparison remains style-aware review evidence because the current diagnostic still does not separate keyboard figuration, sequence, arpeggiation, and subject function.

## Completion Conditions

* Historical-reference review is reproducible from the documented calibration source manifest and does not depend on committed raw score files.
* Historical entry-local metrics remain excluded from thresholds until subject-entry annotation or matching is available.
* Reference-profile aggregate pass is no longer used as beauty acceptance in review output or handoff docs.
* Generated review seeds show lower aggregate persistent lockstep and pitch-class unison without new hard failures or subject/answer identity failures.
* Entry severe-interval evidence improved in the full seed set; remaining focused high-risk windows stay visible as review-required repair targets.
* Leap recovery remains style-aware review evidence rather than a direct scoring target.
* `organ-default` and `strict-counterpoint` bundles were generated for focused listening. Human listening is explicitly left as a manual-listening gap for Infinite playback MVP follow-up rather than a blocker for this calibration lane.

## CI / Review Scope

* `qualityVector.pitchClassUnisonDuration`: `review-required`. Reason: aggregate pressure improved, but color doubling still needs local function review. Action: keep in review bundles and local sentinel evidence.
* `qualityVector.durationBasedLockstep`: `review-required`. Reason: aggregate pressure improved, but musical acceptance depends on function-aware spans. Action: keep `voicePairFunctions` and `voicePairSpans` as the score-window explanation surface.
* `qualityVector.entrySevereIntervalDuration` and `qualityVector.unresolvedEntrySevereIntervalDuration`: `review-required`. Reason: aggregate pressure improved, but remaining entry windows require prepared/resolved dissonance review. Action: keep focused seeds as regression evidence and avoid turning historical entry-local metrics into thresholds before subject-entry annotation.
* `referenceDiagnostics.outsideReferenceSeedCount`: `remove-or-archive` as beauty acceptance, `context-only` as compatibility evidence. Reason: placeholder reference bands are broad enough to hide score-window blockers. Action: do not use it for handoff acceptance.
* Manual listening for `organ-default` and `strict-counterpoint`: `manual-listening`. Reason: review bundles exist, but no human pass was completed. Action: carry as Infinite playback MVP follow-up evidence, not as a hidden blocker.
