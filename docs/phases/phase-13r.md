# Phase 13R: Default Baseline And Phrase Convergence Repair

Phase 13R is inserted after Phase 13Q and before Phase 8. Its purpose is to make the improved generator the actual default path heard through core, CLI, MIDI, and Web UI, then repair the remaining tendency for long continuations to converge on the same subject fragments and short section cycles.

Status: planned. Phase 8/9 remains deferred until this phase has adoption evidence.

Use [quality metrics reference](../reference/quality-metrics.md) for diagnostics and adoption policy meanings. Use [Phase 13R convergence review](../reviews/phase-13r-convergence-review.md) for the seed evidence that triggered this reordering.

## Rationale

Recent listening found that different seeds can still sound as if they converge toward the same phrase material later in the score. A focused diagnostics check confirms two separate causes:

* The normal generation entry points still call `generateScore` without a selection model, which falls back to `baseline`. This means CLI, MIDI, and Web UI playback can bypass the Phase 12/13Q phrase and voice-pair improvements.
* Even under `phase10-section-local-planner`, subject stems and subject-fragment families remain narrow. Phase 12 reduced repeated 4-section cycles, but it did not make the alternate phrase-family oracle candidates broadly selectable.

This is a generator and product-boundary problem, not a Phase 8 UI problem. Infinite playback would make the convergence more audible, so Phase 8 should not resume until the default path and the phrase-family candidate pool are repaired.

## Scope

### 1. Default generation baseline

Make the adopted quality baseline explicit and consistent:

* core default generation, CLI `generate` / `diagnose` / `midi`, review helpers, and Web UI playback must agree on the default selection model;
* legacy `baseline` remains available only as an explicit comparison model;
* generated diagnostics and review summaries must report the effective selection model;
* changing the default selected output requires generator-version and public-contract review if existing API expectations depend on exact events;
* tests must cover that Web UI and CLI do not silently fall back to legacy `baseline`.

### 2. Long-run phrase convergence diagnostics

Add or tighten diagnostics that read the actual default path:

* default-path most repeated 4-section pattern count and unique 4-section pattern count;
* subject stem and subject-fragment concentration by seed and section state;
* late-score convergence windows, not only whole-score totals;
* distinction between function-bearing recurrence and mechanical reuse;
* comparison between explicit legacy `baseline`, current planner, and the new default path.

### 3. Phrase-family candidate adoption

Move beyond phrase-unit state variation when it is safe:

* keep alternate stems evidence-only until guardrails can explain voice-leading, entry harmony, identity, and leap-recovery tradeoffs;
* make only a guarded subset of phrase-family, fragment-derivation, and counter-subject-tail candidates selectable;
* prefer candidates that alter local climax, cadence approach, tail contour, derivation function, or rhythmic placement while preserving subject identity;
* avoid increasing randomness without phrase function and voice-leading explanation.

### 4. Review and listening evidence

Run the adoption against the focused convergence seeds and the full 22 seed bundle. Focused seeds:

* representative: `bach-001`, `fugue-smoke`;
* rotation/adversarial: `modal-cadence`, `dense-modal`, `angular-answer`, `modal-answer`;
* boundary/control: `minor-entry`, `sparse-cadence`, `random-listen-check`.

Manual listening should cover at least `organ-default` and `strict-counterpoint` for the focused set before Phase 8 resumes. If listening is still incomplete, Phase 8 may not claim the phrase-convergence repair as human-approved.

## Adoption Criteria

Phase 13R is complete only if all of the following hold:

* normal core, CLI, MIDI, and Web UI generation use the same adopted default model;
* explicit legacy comparison remains possible for review bundles;
* 22 seed hard constraint failures remain 0;
* Phase 7B readiness remains true for all 22 seeds;
* Phase 12 phrase/repetition gains and Phase 13Q voice-pair / entry-harmony gains are not materially reverted;
* focused convergence seeds do not regress in most repeated 4-section pattern count or unique pattern count against the current `phase10-section-local-planner` path;
* top subject stem and subject-fragment concentration falls on the focused convergence seeds, or any non-improvement is explained as function-bearing recurrence;
* no unexplained local sentinel regression appears in pitch-class unison duration, duration-based lockstep, unresolved entry severe interval duration, modal counter-subject identity, or leap recovery;
* review artifacts record the effective selection model, quality-vector movement, local sentinel deltas, and manual listening gap.

## Non-Goals

* Phase 8 ring buffer replay, rewind, boundary semantics, or visualizer work.
* Phase 9 Worker fallback and deadline work.
* Learned aesthetic score adoption.
* Hiding phrase convergence through UI controls, reverb, instrument profile, or performance humanization.
* Requiring zero repetition. The target is to reduce mechanical convergence while preserving functional subject recurrence.

## Implementation Order

1. Add effective selection model metadata to diagnostics, public contract tests, CLI output where appropriate, and review summaries.
2. Make CLI and Web UI pass the adopted default model explicitly; decide whether core `generateScore` default should change in the same PR or a guarded follow-up.
3. Add default-path convergence diagnostics and focused regression assertions for the convergence seed set.
4. Re-run a focused A/B review comparing explicit legacy `baseline`, current planner, and the new default path.
5. Add guarded selectable phrase-family / fragment-derivation candidates.
6. Run the 22 seed `review-ab` bundle and focused listening templates.
7. Update Phase 8 entry criteria only after the default path and convergence evidence pass.

## Implementation Progress

The first guardrail slice adds `diagnostics.selectionModel` and `diagnostics.phase13RReview`. `phase13RReview` emits `review-required` findings for legacy default selection, repeated 4-section continuation patterns, low section-pattern diversity, entry-pattern family concentration, subject-stem concentration, and subject-fragment concentration. This is intentionally a review signal, not a hard failure: it makes CI and agent self-review detect the problem while leaving Phase 13R implementation free to compare tradeoffs.

`review` and `review-ab` now carry `phase13RReview` inside diagnostics summaries. A/B comparison records whether Phase 13R finding count improves or regresses, so future model changes expose phrase-convergence movement in the automatic summary.

CI now has focused tests that prove the implicit legacy default path emits the Phase 13R review signal and that explicit `phase10-section-local-planner` removes the legacy-default finding while remaining comparable on focused convergence seeds. This guardrail should be tightened into an adoption gate only after Phase 13R changes the default path.

## Theory Basis

Fugue form requires recognizable subject recurrence, but episodes and returns should carry changed function, direction, cadence preparation, or contrapuntal tension. Repetition becomes a defect when the same short subject fragment and section cycle recur without a new phrase role. Fux-style counterpoint still constrains the repair: added variety cannot be accepted if it creates unresolved dissonance, exposed long unison, poor leap recovery, or unclear subject identity.
