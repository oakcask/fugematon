# Phase 14 Rhythm And Harmony Handoff Completion Review

Status: superseded. A later focused `fugue-smoke` score review found that the handoff acceptance was too weak: top-level `harmonicContinuity` could classify the first short episode as accepted while sonority-level windows in measure 7 still reported structural support on non-chord tones. Keep this file as historical evidence for the first repair attempt; current planning is in [Phase 14](../phases/phase-14.md) and [Phase 14 fugue-smoke rhythm and harmony replan](phase-14-fugue-smoke-rhythm-harmony-replan.md).

This review records the earlier reopened Phase 14C4 / 14C5 / 14E completion evidence before the handoff was superseded.

## Findings

### 1. `fugue-smoke` transition rhythm is now classified as intentional pickup rhetoric

Affected seed: `fugue-smoke`.

The first post-exposition section still starts at quarter 19, but the entry start, phrase boundary, and harmonic anchor are now classified together as `pickup-or-cross-metric` rather than splitting the same gesture between accepted entry pickup and review-required phrase/harmony placement. The repair is structural: weak-beat section-boundary windows can be treated as pickup-compatible only when the entry, phrase boundary, and harmonic anchor share the same metrical gesture.

Theory basis: phrase rhythm and fugue exposition practice. A pickup can be valid when it acts as a shared upbeat gesture into a new section. The previous diagnostics made the episode start look accidental because the entry was classified as pickup-compatible while the phrase boundary and harmonic anchor were still classified as review-required.

Project response: accept the transition-rhythm repair for Phase 14 handoff. Later phases may add a richer transition-rhythm surface that distinguishes cadence, held support, suspension, or upbeat rhetoric instead of relying on meter-consistency windows.

### 2. Short-episode harmonic-continuity support generalizes across sequence patterns

Reviewed seeds: `fugue-smoke`, `bach-001`, `bright-answer`, `dark-episode`, `ornament-test`, `long-arc`, `circle-fifths`, `tight-stretto`, `modal-cadence`, `dense-modal`, and `seed-1dxb2n8-1miapx7`.

All reviewed seeds have score-window harmonic-continuity evidence. The focused set records 143 short-episode windows; 141 are classified as `audible-progression`, with no subject-identity violations. The two remaining generator-response windows are later same-mode `dense-modal` episode windows, not the reopened `fugue-smoke` / reported handoff blocker.

The `fugue-smoke` first episode at quarter 19 is now `audible-progression`: 5 structural beats, 5 bass-root supports, 5 chord-tone supports, no structural-beat mismatch, and one thin structural beat. The remaining localized thinning is accepted because the window now has enough bass-root and chord-tone evidence to carry the planned progression.

Theory basis: common-practice harmonic continuity and contrapuntal texture. Pivot harmony, sequence, inversion, contrary motion, and parallel shift can remain locally ambiguous, but the structural beats need enough root, chord-tone, or localized passing context for the progression to be audible.

Project response: accept the generalized Phase 14C4 repair. The classifier now distinguishes localized ambiguity from generator-response-required failure instead of requiring every structural beat to be perfectly rooted.

### 3. Remaining beauty signals stay review-required, not CI-blocking

The repair does not claim that every line-agency, counter-subject, phrase-development, weak-dissonance, lockstep, or pitch-class-unison concern is solved. It completes the reopened Phase 8 blockers: `fugue-smoke` measure 5 transition rhythm, `fugue-smoke` measure 7 short-episode harmonic continuity, and the related focused seed set.

Structural hypothesis: the reopened blocker came from classifying a shared pickup gesture inconsistently and treating narrow `circle-fifths` / `inversion` support as the only harmonic-continuity acceptance path. Treating the shared weak-beat boundary as pickup-compatible and accepting supported short-episode sequence/transform families removes the rhythm/harmony handoff blocker without hard-coding the reported seed.

Evidence strength: confirmed from ScoreEvent diagnostics and focused generated windows across the reviewed seed set. Human listening remains incomplete.

## CI / Review Scope

| Item | Classification | Reason | Action |
| --- | --- | --- | --- |
| First post-exposition transition rhythm | `review-required` | The acceptance depends on phrase-rhythm judgement; the diagnostics now keep the shared pickup gesture classified consistently. | Keep focused regression coverage; do not promote to a hard CI gate yet. |
| `harmonicContinuity` focused windows | `review-required` | Local ambiguity can be musical when enough structural support is present. | Keep score-window diagnostics and focused regression coverage. |
| Reopened focused seed set | `review-required` | It covers representative, rotation, modal, ad hoc, and user-reported cases but remains a beauty review set. | Use for Phase 14 and future handoff reviews. |
| `generator-response-required` harmonic-continuity count | `ci-observed` / `review-required` | The count locates local failures, but acceptance still needs score-window interpretation. | Keep as context in tests and review bundles. |

## Verification

Commands:

`pnpm build`

`node --test packages/core/dist/generate-phase14-rhythm-harmony-handoff.test.js packages/core/dist/generate-harmonic-continuity-review.test.js packages/core/dist/generate-score-window-acceptance-harness-a.test.js packages/core/dist/generate-score-window-acceptance-harness-b.test.js packages/core/dist/public-contract.integration.test.js`

`pnpm lint`

Listening gap: no broad human listening pass was completed. The handoff is accepted from ScoreEvent windows, diagnostics, and agent-side music-theory review.
