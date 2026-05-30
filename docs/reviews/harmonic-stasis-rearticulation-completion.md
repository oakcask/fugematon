# Harmonic Stasis Rearticulation Repair Completion

This review records the completion evidence for Harmonic stasis rearticulation repair. The repair treats the reported seeds as structural evidence, not as literal seed, key, measure, pitch, chord, or voice exceptions.

## Findings

### 1. Reported first-bass-answer handoff remains diagnostic-visible and no longer requires generator response

Affected seed: `seed-07mwf08-1te3e2o`.

The first reported seed still exposes first-episode handoff same-pitch rearticulation as `harmonicStasisRearticulation` score-window evidence. After repair, its generator-response windows move from 1 to 0, hard constraint failures remain 0, and `episodeMotivicDevelopment.genericFreeCounterpointDurationTicks` remains 0.

Theory basis: motivic derivation labels are not enough when short same-pitch support attacks sit inside weak harmonic motion. The repair keeps the window review-visible while changing local pitch or reattack structure so the line is no longer classified as a generator-response stasis defect.

### 2. Functional-support rearticulation is treated as post-selection evidence

Affected seed: `seed-1db5j19-1nhjtae`.

The selected-candidate harmony features show no `harmonicStasisRearticulation` generator-response windows in the selected candidate path, while the final score keeps remaining same-pitch behavior visible as accepted-context or review-required windows. This preserves the replan finding that the reported tenor support rearticulation was introduced by final support shaping rather than selected-candidate choice.

At the focused regression length, the seed has 6 focused windows, 0 generator-response windows, 0 repeated-pitch-run count, 0 hard constraint failures, and 0 generic free-counterpoint duration ticks. Remaining windows are classified rather than hidden.

### 3. Focused controls reduce generator-response windows without hard failures

Focused seed results after repair at the regression length:

| Seed | Focused windows | Review-required | Generator-response | Hard failures | Generic free-counterpoint ticks |
| --- | ---: | ---: | ---: | ---: | ---: |
| `seed-07mwf08-1te3e2o` | 6 | 5 | 0 | 0 | 0 |
| `seed-1db5j19-1nhjtae` | 6 | 3 | 0 | 0 | 0 |
| `seed-1syy921-0025pp1` | 13 | 12 | 0 | 0 | 0 |
| `fugue-smoke` | 6 | 4 | 0 | 0 | 0 |
| `modal-cadence` | 6 | 5 | 0 | 0 | 0 |
| `dark-episode` | 7 | 3 | 0 | 0 | 0 |
| `tight-stretto` | 7 | 6 | 0 | 0 | 0 |

The standard 22 review seeds at the focused length report 139 focused windows, 43 accepted-context windows, 96 review-required windows, 0 generator-response windows, 0 hard failures, and 0 generic free-counterpoint duration ticks.

### 4. Full-length target rerun confirms the repair against the recorded baseline

A full `129600` tick verification regenerated the standard 22 seed review bundle plus the focused phase seed scores, diagnostics, and `organ-default` / `strict-counterpoint` MIDI files. It compared the regenerated diagnostics against the target artifacts recorded before this repair.

Focused seed comparison:

| Seed | Before generator-response | Current generator-response | Before repeated-pitch runs | Current repeated-pitch runs | Current hard failures | Current generic free-counterpoint ticks |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `seed-07mwf08-1te3e2o` | 1 | 0 | 3 | 2 | 0 | 0 |
| `seed-1db5j19-1nhjtae` | 2 | 0 | 4 | 2 | 0 | 0 |
| `seed-1syy921-0025pp1` | 4 | 0 | 14 | 10 | 0 | 0 |
| `fugue-smoke` | 5 | 0 | 8 | 3 | 0 | 0 |
| `modal-cadence` | 1 | 0 | 4 | 3 | 0 | 0 |
| `dark-episode` | 4 | 0 | 6 | 2 | 0 | 0 |
| `tight-stretto` | 2 | 0 | 8 | 6 | 0 | 0 |

The standard 22 seed comparison moved from 392 focused windows, 101 accepted-context windows, 257 review-required windows, 34 generator-response windows, and 101 repeated-pitch runs to 375 focused windows, 107 accepted-context windows, 268 review-required windows, 0 generator-response windows, and 67 repeated-pitch runs. Hard failures and generic free-counterpoint duration stayed at 0 for both standard bundles.

The first reported seed still exposes three first-episode handoff windows and twelve all-free texture windows in `harmonicStasisRearticulation`, all classified as accepted-context or review-required rather than generator-response. The second reported seed still keeps final-score same-pitch behavior diagnostic-visible and selected-candidate harmony features carry nonzero harmonic-stasis review costs without generator-response counts.

### 5. Reattack reduction does not hide line-agency review

The generator first tries nearby chord-tone motion that preserves voice order, avoids semitone friction, and avoids pitch-class unison. If no local pitch is safe, it merges only a short adjacent reattack into a note of at most one quarter. That fallback reduces mechanical attacks without turning the phrase into broad long-note stasis.

Remaining same-pitch behavior stays classified in `harmonicStasisRearticulation` and is also included in `scoreWindowAcceptance`, so harmonic-continuity and harmonic-sonority acceptance cannot hide the audible surface.

## Implementation Response

`repairHarmonicStasisRearticulation` now runs in the current default generation path after episode motivic derivation annotation and before final diagnostics. It inspects generator-response windows structurally, then alternates local structural support with safe nearby chord tones or performs a short tie-like merge when no safe pitch exists. The repair preserves motivic derivation metadata on the note. The explicit legacy `baseline` selection model remains available for compatibility comparisons.

Candidate evaluation now includes `harmonicStasisRearticulation` review-required and generator-response counts as harmony features with nonzero soft costs. This covers selectable-section runs separately from final support repair.

`scoreWindowAcceptance` now includes `harmonic-stasis-rearticulation` windows, keeping the diagnostic surface visible to later playback and review work.

## Regression Coverage

Added and updated `generate-harmonic-stasis-rearticulation.test.ts`.

The test coverage fixes the repair contract:

* the reported first-episode handoff still exposes review windows but has zero generator-response windows;
* the focused seed set has zero generator-response windows, zero hard failures, and zero generic free-counterpoint duration ticks;
* the raw analyzer still classifies synthetic all-free structural repeats as generator-response;
* the repair changes local pitch when safe and otherwise reduces only short reattacks.

## Listening Gap

No manual listening pass was completed in this review. Focused `organ-default` and `strict-counterpoint` listening remain manual-listening follow-up. The score evidence supports resuming Infinite playback MVP because the previously hidden generator-response symptom is now repaired or review-classified.

## CI / Review Scope

* Focused Harmonic stasis rearticulation seed set: `review-required`; keep as focused generated evidence and regression helper coverage.
* `harmonicStasisRearticulation`: `review-required`; visible in diagnostics and score-window acceptance, not promoted to CI-blocking aggregate thresholds.
* Candidate scoring features for harmonic-stasis rearticulation: `review-required`; nonzero soft costs are adopted for section-local selection, but aggregate beauty acceptance still needs review.
* Focused listening: `manual-listening`; artifacts may be regenerated for organ and strict-counterpoint profiles, but human judgement is incomplete.
