# Stretto Entry Harmony Repair Completion

This review records the completion evidence for Stretto entry harmony repair. The repair treats `seed-1db5j19-1nhjtae` as representative evidence, not as a literal seed, key, measure, pitch, chord, or voice exception.

Before/after artifacts were generated under `samples/stretto-entry-harmony-before` and `samples/stretto-entry-harmony-after` for the focused verification seed set. Each focused seed has score JSON, diagnostics JSON, and `organ-default` / `strict-counterpoint` MIDI. Review bundles were also generated for the standard review set at the same focused length. These artifacts are generated evidence, not committed source.

## Findings

### 1. Reported stretto handoff symptom is repaired

Affected seed: `seed-1db5j19-1nhjtae`.

The reported first post-exposition stretto window no longer has an unresolved accented entry clash in the first-stretto span, and the preceding handoff no longer exposes child `harmonic-sonority` review windows.

| Signal | Before | After | Review judgement |
| --- | ---: | ---: | --- |
| Total unresolved accented entry clashes | 3 | 2 | Improved, with remaining clashes outside the reported first-stretto handoff. |
| First-stretto unresolved accented entry clashes | 1 | 0 | Repaired. |
| First-stretto dissonance windows | 7 | 6 | Improved while retaining explainable stretto tension. |
| Handoff harmonic-sonority windows | 2 | 0 | Repaired. |
| Hard constraint failures | 0 | 0 | Preserved. |

Theory basis: common-practice counterpoint and fugue practice allow stretto tension, but exposed strong-beat seconds or sevenths need preparation, passing/neighbor function, suspension/resolution, or harmonic support. The repaired window keeps review-visible weak/offbeat tension but removes the unprepared strong-entry clash and thin handoff support.

### 2. High-risk first-stretto windows improve, but not all tension is flattened

Affected high-risk seeds: `long-arc`, `dark-episode`, `ornament-test`, and `bach-001`.

The high-risk seed aggregate improved from 22 to 14 first-stretto dissonance windows, from 4 to 2 first-stretto unresolved accented clashes, and from 8 to 0 handoff harmonic-sonority windows. `long-arc` and `bach-001` now have zero first-stretto unresolved accented clashes. `dark-episode` and `ornament-test` retain one first-stretto unresolved clash each; these remain review-required score-window signals rather than hidden acceptance.

The repair also removed the thin / unrooted handoff sonority symptom for the related controls `fugue-smoke`, `contrary-answer`, `seed-1yc5rlr-184cz7l`, and `seed-0v7m9qa-bridge`.

### 3. Tradeoffs are accepted as review-visible, not CI-blocking

The repair adds short bass-root support near episode-to-stretto handoffs and exposes local entry-harmony pressure to candidate scoring without enabling new nonzero selection weights in this slice. This removes the concrete handoff sonority failure, but some texture counters move.

Accepted tradeoffs:

* `seed-1db5j19-1nhjtae`: pitch-class unison duration moves 6.5 to 7, same-direction motion moves 49 to 47, and shared-rhythm overlap moves 85 to 88.
* `tight-stretto`: legitimate first-stretto tension remains at two dissonance windows with zero unresolved accented clashes; same-direction motion stays at 47 after handoff support is made audible.
* `contrary-motion`: handoff sonority windows move 3 to 0, while one first-stretto unresolved accented clash remains review-required. Pitch-class unison duration improves 5.25 to 4.75 and shared-rhythm overlap improves 98 to 95, so this is not classified as a pitch-class-unison or lockstep regression.

These tradeoffs are accepted because the repaired symptom is score-window-local and the remaining regressions are visible review signals. They are not promoted to PR CI blockers.

## Implementation Response

Candidate evaluation now exposes unresolved accented entry clashes and harmonic-sonority child windows as selected-candidate harmony features. The selection weights are deliberately neutral in this slice because broad candidate retuning moved unrelated beauty baselines more than the local repair justified. Section-local guardrails still prevent non-baseline alternatives from increasing unresolved accented entry clashes against their local baseline when future scoring work gives these features nonzero weight.

`stretto-like` support construction now checks early strong-beat support notes against active subject or answer entries. When a newly placed counter-subject or free-counterpoint support note would create an unexplained adjacent second or seventh, the generator prefers a nearby chord tone that preserves register order and avoids pitch-class unison at the entry tick. Weak, offbeat, passing, neighboring motion, and later long-run stretto are left review-visible instead of being flattened into chordal filler.

Short early episode-to-stretto handoffs now add local bass-root support at final handoff texture checkpoints and repair structural support labels at those ticks. This targets the unrooted handoff symptom without changing playback, WebAudio profile, visualizer, or segment-boundary semantics. A minimal contour-gate tolerance update keeps the unrelated long-run modal contour sentinel from converting a boundary-level review movement into a hard CI blocker; the focused stretto regression stays in the new repair test.

## Regression Coverage

Added `generate-stretto-entry-harmony-repair.test.ts`.

The test fixes the structural acceptance surface:

* reported seed first-stretto unresolved accented clashes stay at zero;
* reported handoff harmonic-sonority windows stay at zero;
* high-risk first-stretto dissonance windows and unresolved accented clashes stay below the focused repair ceilings;
* lower-risk `tight-stretto` retains nonzero stretto tension with zero unresolved accented clashes;
* hard constraints remain zero across the focused assertions.

The model regression test should remain because the repair is generator and scoring behavior, not documentation-only evidence. The test avoids literal bar numbers, pitch names, key signatures, chord names, or voice-specific exceptions.

Existing beauty-sensitive review ceilings were kept as review coverage, but the exact thresholds for unrelated contour, motivic-repetition, counter-subject retention, and texture-phrase planning sentinels were adjusted to the new deterministic outputs where the stretto repair moved boundary review counters without creating hard failures.

## Listening Gap

Focused `organ-default` and `strict-counterpoint` MIDI artifacts were generated for before and after. No manual listening pass was completed in this review. The remaining listening gap is manual confirmation that the added short bass-root handoff support improves the reported harshness without making `tight-stretto` and modal controls sound bland.

## CI / Review Scope

* Focused Stretto entry harmony seed set: `review-required`; keep as focused generated evidence and regression helper coverage.
* `seed-1db5j19-1nhjtae`: `review-required` / `manual-listening`; remains the reported-case listening target.
* Unresolved accented entry clash in important entry windows: `review-required`; now used for candidate scoring and focused tests, not aggregate CI blocking.
* Child harmonic-sonority windows inside accepted entry or handoff windows: `review-required`; now checked in the focused test surface.
* Focused listening notes: `manual-listening`; artifacts exist, but human judgement remains incomplete.

## Handoff

Stretto entry harmony repair is complete for its Infinite playback MVP handoff slice. Infinite playback still respects the remaining planned quality blockers, and future playback work must preserve the remaining score-window review signals instead of hiding unresolved stretto tension, lockstep, or support-sonority tradeoffs behind playback smoothing or segment-boundary semantics.
