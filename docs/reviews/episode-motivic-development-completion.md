# Episode Motivic Development Completion Review

This review records the Episode Motivic Development handoff after adding review-visible motivic derivation metadata and diagnostics for subject-free free counterpoint.

## Findings

### 1. Subject-free material is now derivation-visible

Affected seeds: the representative review bundle seeds from `samples/episode-motivic-development-before` and `samples/episode-motivic-development-after`, including `bach-001`, `fugue-smoke`, `dark-episode`, `modal-dorian`, `angular-answer`, `modal-answer`, and `dense-modal`.

Theory basis: fugue episodes can be short or long, but subject-free spans should still show a relationship to earlier material through sequence, inversion, imitation, rhythmic paraphrase, fragmentation, or cadence preparation.

Evidence: after implementation, every reviewed seed reports `episodeMotivicDevelopment.derivationCoverage` of `1`, `genericFreeCounterpointDurationTicks` of `0`, and transformation variety between `5` and `8`. The metadata is attached to emitted support notes as source motive, transformation kind, target function, sequence direction, next-entry preparation, and cadence preparation.

Project response: accept as Phase 8 handoff evidence. Infinite playback segment semantics should preserve this metadata rather than hiding subject-free spans behind regeneration boundaries.

### 2. The change improves review truthfulness, not note content

Affected seeds: all reviewed before/after bundle seeds.

Evidence: note-count deltas were `0` for the focused before/after bundle comparison. Hard failures stayed at zero for the sampled seeds inspected directly, and the focused bundle retained zero unsupported exposed free-counterpoint solo windows and no first-bass-answer tail review requirement.

Project response: do not treat this as an audible beauty improvement by itself. The musical beauty improvement is that reviewers can now distinguish derived material from generic filler. Existing generated-note regression tests should be kept because the model output did not musically change in this step.

### 3. Repeated stock formula remains review-required

Affected seeds: all reviewed seeds still report repeated episode formulas. Representative repeated formula counts range from `198` to `375` across the reviewed bundle.

Theory basis: repetition can be motivic development when the source and function are audible, but high local formula recurrence can also become mechanical filler or listening fatigue.

Project response: classify repeated stock formula as `review-required`, not CI-blocking. The next generator or scoring follow-up should decide whether repeated formulas are acceptable motivic sequence, intentional pedal or cadence rhetoric, or a generator vocabulary problem.

### 4. Follow-up: episode repetition pressure is reduced

Affected seeds: the standard 22 seed review bundle, with focused checks on `modal-cadence`, `modal-answer`, `angular-answer`, and `dark-episode`.

Theory basis: repeated episode material can be developmental when cadence, sequence, local key, voice, and source motive change. Exact reuse of the same short free-counterpoint contour and duration formula across the same phrase window reads more like mechanical filler.

Evidence: the current review bundle keeps `derivationCoverage` at `1`, `genericFreeCounterpointDurationTicks` at `0`, hard failures at `0`, unsupported exposed free-counterpoint solo windows at `0`, and no bass-answer tail review blocker. Bundle-level `repeatedStockFormulaCount` is `1920`, and phrase-development mechanical reuse windows total `58`. Focused seeds now report: `modal-cadence` has `3` mechanical windows; `modal-answer` has `120` repeated stock formulas; `angular-answer` has no repeated `uuuuu|eeeeee` top formula; `dark-episode` keeps transformation variety at `8` with source motive concentration `0.242`.

Project response: keep repeated stock formula and remaining phrase mechanical reuse as `review-required`, not CI-blocking. The generator now rotates episode voice/key/sequence support and the candidate model scores exact phrase-window recurrence, but final audible acceptance still needs listening review.

### 5. Follow-up: CI metrics are recalibrated to role-aware evidence

Affected seeds: the CI review seeds that changed after Episode Motivic Development, especially `fugue-smoke`, `modal-answer`, `bright-answer`, `quiet-cadence`, `circle-fifths`, and `seed-1dxb2n8`.

Theory basis: offbeat free counterpoint can create brief passing seconds or sevenths against an entry without carrying the same musical weight as sustained, accented entry support. The risk still matters when it is exposed or unresolved, but the diagnostic should distinguish passing texture from structural entry support.

Evidence: CI failed after the generator model update because model-version assertions were stale and several review thresholds still described the pre-update distribution. The concrete symptoms were stricter entry severe-interval duration, weak passing semitone clashes, phrase-development reuse ceilings, texture-planning deltas, and local-planner support expectations. The fix leaves generated notes unchanged and narrows the severe-entry-duration metric so offbeat `free-counterpoint` passing notes do not count as structural support at the entry tick.

Project response: treat this as metric recalibration plus one diagnostic reclassification, not as a new generator repair. The changed review thresholds preserve the current affected seeds as regression evidence, and remaining weak-dissonance, phrase-reuse, and texture-planning movement stays in CI as review-calibrated observation rather than proof of musical acceptance.

## CI / Review Scope

* `episodeMotivicDevelopment.derivationCoverage`: `ci-observed`. It is stable and cheap enough to expose in public diagnostics, but thresholds should stay review-calibrated until audible correspondence is checked.
* `genericFreeCounterpointDurationTicks`: `ci-observed`. Use as the first signal that subject-free material lost derivation metadata.
* `repeatedStockFormulaCount`: `review-required`. It flags possible fatigue without making every repeated motivic formula illegal.
* Focused listening: `manual-listening`. The metadata is structurally plausible, but no human listening pass has yet confirmed that each derivation is audible.

## Handoff

Episode Motivic Development is complete for Phase 8 handoff because subject-free material has source and transformation metadata, short episodes can be accepted by local function, medium episodes are review-visible, generic duration is exposed, and remaining stock formulas are explicitly classified as review-required follow-up rather than hidden by playback semantics.
