# WebAudio synth interpretation completion review

This review closes [WebAudio synth interpretation follow-up](../phases/webaudio-synth-interpretation.md). The target is a rendering change: WebAudio may reinterpret envelope and velocity through `PerformanceProfile`, but generated `ScoreEvent` output, diagnostics, quality-vector values, generator scoring, and `generatorVersion` must stay unchanged.

## Findings

* Passed: the regenerated `organ-default` 22 seed bundle matches the TARGET baseline byte-for-byte.
* Passed: the regenerated `strict-counterpoint` 22 seed bundle matches the TARGET baseline byte-for-byte.
* Passed: representative `bach-001` and `fugue-smoke` diagnostics are identical between `organ-default` and `strict-counterpoint`, so profile choice does not change score-window evidence.
* Passed: `qualityProfileComparison.reviewStatus` remains `quality-review-required`; persistent review signals such as `pitchClassUnisonDuration`, `durationBasedLockstep`, and `entrySevereIntervalDuration` stay visible.
* Accepted rendering change: `organ-default` bass subject/answer notes now use stronger attack emphasis with lower sustain than the old direct velocity-to-sustain mapping. In the focused `bach-001` and `fugue-smoke` windows, attack peak is 1.800-1.897 times the old direct gain and sustain is 0.747-0.795 times the old direct gain.
* Accepted inspection profile behavior: `strict-counterpoint` keeps bass subject/answer sustain close to the old direct gain while still adding attack definition. In the same focused windows, attack peak is 1.560-1.657 times the old direct gain and sustain is 0.974-0.997 times the old direct gain.

Source-family basis: Fux/species counterpoint and common-practice fugue remain the project baseline for treating unisons, lockstep, entry clashes, and articulation resets as score-level review signals. This review adds no new literature claim; it verifies that rendering changes do not reclassify those score-level signals.

## Generated Evidence

Commands:

```sh
pnpm build
pnpm fugematon review --out samples/webaudio-synth-interpretation-review/organ-default --ticks 129600 --performance-profile organ-default
pnpm fugematon review --out samples/webaudio-synth-interpretation-review/strict-counterpoint --ticks 129600 --performance-profile strict-counterpoint
```

Baseline comparison:

```sh
diff -qr samples/webaudio-synth-interpretation-current/organ-default samples/webaudio-synth-interpretation-review/organ-default
diff -qr samples/webaudio-synth-interpretation-current/strict-counterpoint samples/webaudio-synth-interpretation-review/strict-counterpoint
```

Both comparisons produced no differences. Each regenerated bundle has 47 files: 22 review seeds with diagnostics and MIDI, plus `summary.json`, `listening-review.json`, and `pairwise-preferences.json`.

Summary values:

| Profile | Version | Seeds | Selection model | Length ticks | Review status |
| --- | ---: | ---: | --- | ---: | --- |
| `organ-default` | 3 | 22 | `section-local-planner` | 129600 | `quality-review-required` |
| `strict-counterpoint` | 3 | 22 | `section-local-planner` | 129600 | `quality-review-required` |

Representative unchanged diagnostics:

| Seed | Note count | Generator version | Selection model | Profile comparison |
| --- | ---: | ---: | --- | --- |
| `bach-001` | 1055 | 4 | `section-local-planner` | identical diagnostics under both profiles |
| `fugue-smoke` | 1025 | 4 | `section-local-planner` | identical diagnostics under both profiles |

Quality-vector review signals remain unchanged in both profiles:

| Axis | Median | P90 | Max | Outside seed count |
| --- | ---: | ---: | ---: | ---: |
| `pitchClassUnisonDuration` | 1.535 | 1.889 | 2.181 | 22 |
| `durationBasedLockstep` | 2.681 | 3.208 | 3.250 | 22 |
| `entrySevereIntervalDuration` | 2.063 | 2.625 | 3.063 | 17 |

## Completion Assessment

The target completion conditions are met. The WebAudio renderer no longer maps velocity linearly to sustained gain for `organ-default`; `PerformanceProfile` owns envelope fields and versioned synth interpretation; review artifacts record profile id and version; and score-level diagnostics remain unchanged and visible.

Human listening is still a manual-listening gap. The current evidence is deterministic scheduling, generated bundle comparison, and focused playback-review criteria in `listening-review.json`, not a completed human preference pass.

## CI / Review Scope

* `organ-default` and `strict-counterpoint` review bundles: `review-required`; reason=rendering interpretation affects listening conditions but not generated score evidence; action=keep as completion evidence and future listening templates.
* `pitchClassUnisonDuration`, `durationBasedLockstep`, `entrySevereIntervalDuration`: `review-required`; reason=unchanged score-level signals remain musically relevant and must not be hidden by playback; action=continue routing them through quality review, not this rendering lane.
