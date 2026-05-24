# Phase 14 Harmonic Continuity Generation Review

This review records the Phase 14C4 generator response for short modulatory / pivot-harmony episodes before Infinite playback MVP resumes.

## Findings

### 1. The reported window now carries the planned D minor to E minor path

Affected seed: `seed-1dxb2n8-1miapx7`.

The reported measure 6-7 episode now has a `harmonicContinuity` window at tick 9120 classified as `audible-progression`. The window has 4 structural beats, 4 bass-root supports, 4 chord-tone supports, 0 structural-beat mismatches, and 0 thin structural beats. The score-window acceptance surface also reports the same window as `accepted-context`.

Theory basis: common-practice harmonic continuity and contrapuntal texture. A short pivot episode can still use ambiguity and sequence, but the structural beats need enough bass-root and chord-tone evidence for the listener to hear the planned path before the stretto-like handoff.

Project response: generator repair plus review surface. The reported D minor to E minor pivot handoff now adds bass-root support and, when the texture would be too thin, an upper chord-tone support line at structural beats. The repair does not widen aggregate thresholds and does not treat controlled ambiguity as sufficient by itself.

Follow-up generalization: the generator predicate is no longer tied to the reported pitch names. It repairs short modulatory `circle-fifths` / `inversion` pivot episodes when the following stretto-like handoff shares the target key. The reported seed remains regression evidence, and a transposed synthetic pivot episode verifies that the repair is structural rather than literal-key matching. Other sequence/fragment pairs remain review-required until they have their own score-window evidence, because broadening this repair across all episode transformations regresses older texture and phrase guardrails.

### 2. Focused seed review shows improvement without hiding remaining review-required material

Reviewed seeds: `seed-1dxb2n8-1miapx7`, `circle-fifths`, `tight-stretto`, `modal-cadence`, `bach-001`, and `contrary-motion`.

The review surface remains score-window based:

| Seed | Focused windows | Audible progression | Review-required | Main remaining symptom |
| --- | ---: | ---: | ---: | --- |
| `seed-1dxb2n8-1miapx7` | 3 | 1 | 2 | reported D minor to E minor pivot accepted; later focused windows stay review-required |
| `circle-fifths` | 3 | 0 | 3 | subject-fragment bass tones keep 8 structural beats from becoming clear bass-root supports |
| `tight-stretto` | 2 | 1 | 1 | one short handoff still lacks enough textural support |
| `modal-cadence` | 4 | 0 | 4 | focused windows retain mismatch and thinning signals for later phrase planning |
| `bach-001` | 3 | 0 | 3 | focused windows retain bass-root and thinning review signals |
| `contrary-motion` | 3 | 0 | 3 | focused windows retain mismatch and thinning review signals |

The accepted tradeoff is that later focused windows in the reported seed, `circle-fifths`, and one `tight-stretto` window remain review-required rather than retuning subject-fragment bass material and risking subject identity. This is a generator-design boundary, not a reason to keep the reported harmonic-continuity blocker open.

Structural hypothesis: the original failure came from treating pivot-harmony and phrase transformation as enough evidence even when the audible vertical surface had no bass-root support at key structural beats. Adding root support at structural beats repairs the reported D minor to E minor handoff; the remaining review-required windows are cases where the bass is carrying subject-fragment material, so the next response should be a phrase-planning choice rather than a local retuning pass.

Evidence strength: confirmed for the reported seed and supported across the focused seed set. A broad 22 seed human listening pass was not completed.

## CI / Review Scope

| Item | Classification | Reason | Action |
| --- | --- | --- | --- |
| `harmonicContinuity` review surface | `review-required` | It explains score-window acceptance for short pivot episodes but still depends on local musical judgement. | Keep in diagnostics and score-window acceptance; do not promote to a hard CI blocker yet. |
| `seed-1dxb2n8-1miapx7` short-pivot windows | `review-required` | User-reported deterministic blocker is now repaired, but acceptance is still score-window based. | Keep as focused regression coverage for Phase 14C4. |
| `circle-fifths` and `tight-stretto` remaining windows | `review-required` | Remaining symptoms involve subject-fragment bass or fast handoff planning, not a simple missing support-line repair. | Keep visible for future phrase-planning review; do not block Phase 8 handoff. |
| Aggregate strong-beat dissonance and harmonic-function mismatch counts | `ci-observed` / `review-required` | They improved for the reported seed but do not by themselves prove harmonic continuity. | Use as context only; score-window acceptance remains primary. |

## Verification

Commands:

`pnpm build`

`node --test packages/core/dist/generate-harmonic-continuity-review.test.js packages/core/dist/generate-score-window-acceptance-harness-a.test.js packages/core/dist/generate-score-window-acceptance-harness-b.test.js packages/core/dist/public-contract.integration.test.js`

`pnpm lint`

Listening gap: no broad manual listening pass was completed. The generator response is accepted from ScoreEvent windows, diagnostics, and agent-side music-theory review.
