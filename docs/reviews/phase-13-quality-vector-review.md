# Phase 13 Quality Vector Review

Phase 13 added review-only quality vector diagnostics to the Phase 12P performance-profile baseline. It does not change selected `ScoreEvent` output, generator scoring, selection model, performance profile resolution, or `generatorVersion`.

Current definitions for quality vector axes and local sentinels live in [quality metrics reference](../reference/quality-metrics.md). This review records the Phase 13 evidence and project response.

Evidence command:

```sh
pnpm fugematon review --out samples/phase13-quality-vector --ticks 129600
```

## Findings

* Symptom: pitch-class unison duration remains the clearest low-voice and cross-register pressure. The 22 seed aggregate reports `pitchClassUnisonDuration` median 2.347, p90 2.736, max 3.000 normalized distance, with all 22 seeds outside the initial review profile. Top contributors were `modal-cadence` and `dark-episode`.
* Symptom: duration-based lockstep remains broad even when exact same-pitch unison is shorter. The aggregate reports median 2.806, p90 3.417, max 3.917 normalized distance, with all 22 seeds outside the initial review profile. Top contributors were `dense-modal` and `ornament-test`.
* Symptom: entry-local seconds and sevenths remain unresolved often enough to require review. `entrySevereIntervalDuration` is outside profile for all 22 seeds; `unresolvedEntrySevereIntervalDuration` is outside profile for 14 seeds. Top unresolved contributors were `fugue-smoke` and `circle-fifths`.
* Symptom: long exact same-pitch spans are not the main Phase 13 blocker. `longestExactSamePitchSpan` stays within profile across all seeds, and exact same-pitch unison duration is outside profile only for `circle-fifths` and `minor-entry`.
* Symptom: the current soprano repeated-note pressure detector does not find high unreleased pressure in the 22 seed baseline. This does not prove the listening concern is absent; it means the first automated detector needs future calibration against manual listening notes.

## Theory Basis

Fux-like counterpoint and common-practice fugue writing treat exposed unisons, unresolved seconds and sevenths, and extended rhythmic lockstep as voice-independence and dissonance-treatment concerns. Phase 13 keeps these as review-required signals rather than hard failures because unison, shared rhythm, and stepwise motion can be acceptable in context, especially when style profile and section role explain them.

## Project Response

Phase 13 is complete as a review/adoption model. The review bundle now exposes `qualityVector` per seed and `qualityProfileComparison` across the 22 seed bundle. A/B review summaries include quality vector distance and local sentinel deltas so future quality PRs can show blocker improvement, acceptable vector movement, no unexplained local sentinel regression, and the remaining manual listening gap.

Remaining quality-lane work should target pitch-class unison spans, duration-based lockstep, and unresolved entry severe intervals before using these axes as candidate scoring weights. Manual listening and pairwise preference are still not performed; they remain adoption evidence, not a Phase 13 completion blocker.
