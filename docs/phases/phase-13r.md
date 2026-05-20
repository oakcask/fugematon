# Phase 13R: Default Baseline And Phrase Convergence Repair

Phase 13R is inserted after Phase 13Q and before Phase 8. Its purpose is to make the improved generator the actual default path heard through core, CLI, MIDI, and Web UI, then repair the remaining tendency for long continuations to converge on the same subject fragments and short section cycles.

Status: automatic default-baseline adoption complete; cross-seed subject-diversity diagnostics and the first conservative generator repair are implemented, but post-Phase-13R human listening confirms that similar structure / phrase convergence and abrupt three-part silence still remain. Phase 8/9 may not start from the automatic baseline alone, because infinite playback and Worker fallback would extend confirmed musical defects over longer sessions.

Use [quality metrics reference](../reference/quality-metrics.md) for diagnostics and adoption policy meanings. Use [Phase 13R convergence review](../reviews/phase-13r-convergence-review.md) for the seed evidence that triggered this reordering.

## Rationale

Recent listening found that different seeds can still sound as if they converge toward the same phrase material later in the score. A focused diagnostics check confirms two separate causes:

* The normal generation entry points still call `generateScore` without a selection model, which falls back to `baseline`. This means CLI, MIDI, and Web UI playback can bypass the Phase 12/13Q phrase and voice-pair improvements.
* Even under `phase10-section-local-planner`, subject stems and subject-fragment families remain narrow. Phase 12 reduced repeated 4-section cycles, but it did not make the alternate phrase-family oracle candidates broadly selectable.
* A follow-up audit found a third layer: different seeds can still choose from a very small initial subject-shape vocabulary. Per-score `phase13RReview` catches high concentration inside one generated score, but it does not detect corpus-level collapse where many seeds share the same initial subject family.

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

### 2A. Cross-seed subject-family diversity diagnostics

Add bundle-level diagnostics that detect whether different seeds are actually producing distinct subjects:

* per-score initial subject profile: degree pattern, rhythm pattern, contour class, local climax placement, tail motion, mode, and answer compatibility;
* review bundle aggregate: unique initial subject family count, top initial subject family share, top fragment-leading subject family share, and entropy-like distribution summary across the 22 seed set plus focused ad hoc seeds;
* finding codes for corpus-level `initial-subject-family-concentration` and `subject-fragment-vocabulary-collapse`, separate from per-score `subject-stem-family-concentration`;
* focused regression assertions that seeds with no per-score Phase 13R findings are still counted in the corpus-level subject-family aggregate;
* A/B summary deltas so a generator change can prove subject diversity improved without hiding voice-leading or entry-harmony regressions.

### 3. Phrase-family candidate adoption

Move beyond phrase-unit state variation when it is safe:

* keep alternate stems evidence-only until guardrails can explain voice-leading, entry harmony, identity, and leap-recovery tradeoffs;
* make only a guarded subset of phrase-family, fragment-derivation, and counter-subject-tail candidates selectable;
* prefer candidates that alter local climax, cadence approach, tail contour, derivation function, or rhythmic placement while preserving subject identity;
* avoid increasing randomness without phrase function and voice-leading explanation.

### 3A. Initial subject generator diversity

Repair the seed-crossing subject-similarity layer upstream instead of only masking it later in phrase-family selection:

* expand `buildSubject` beyond the current small set of degree shapes with variants that change local climax placement, compensated leap pattern, rhythmic stress, tail direction, and cadence approach;
* keep answer planning and subject identity explicit by recording each subject family descriptor in diagnostics;
* score subject candidates before exposition for singability, metrical harmony intent, answer compatibility, leap recovery, and counter-subject compatibility;
* preserve a recognizable fugue subject: do not accept random contour churn that breaks entry identity or makes answers harmonically unexplainable;
* compare the old and new subject generators with focused A/B review before changing default selected output.

### 4. Review and listening evidence

Run the adoption against the focused convergence seeds and the full 22 seed bundle. Focused seeds:

* representative: `bach-001`, `fugue-smoke`;
* rotation/adversarial: `modal-cadence`, `dense-modal`, `angular-answer`, `modal-answer`;
* boundary/control: `minor-entry`, `sparse-cadence`, `random-listen-check`.

Manual listening must cover at least `organ-default` and `strict-counterpoint` for the focused set before Phase 8 resumes. Any musical problem found in that listening pass or in the subject-diversity sweep must be classified and fixed before Phase 8/9, unless the review explicitly rejects it as a false positive rather than an accepted defect.

Post-Phase-13R listening feedback now confirms two still-open blockers: similar structure and phrase material recur within a score and across seeds, and three parts can still become silent abruptly without convincing cadence, phrase-boundary, or staged-thinning function. The affected seeds and exact locations are not yet isolated in source, so the next repair must first reproduce and localize representative windows before changing gates or declaring the issue fixed.

## Adoption Criteria

Phase 13R is complete only if all of the following hold:

* normal core, CLI, MIDI, and Web UI generation use the same adopted default model;
* explicit legacy comparison remains possible for review bundles;
* 22 seed hard constraint failures remain 0;
* Phase 7B readiness remains true for all 22 seeds;
* Phase 12 phrase/repetition gains and Phase 13Q voice-pair / entry-harmony gains are not materially reverted;
* focused convergence seeds do not regress in most repeated 4-section pattern count or unique pattern count against the current `phase10-section-local-planner` path;
* top subject stem and subject-fragment concentration falls on the focused convergence seeds, or any non-improvement is explained as function-bearing recurrence;
* cross-seed initial subject family concentration is visible in review artifacts, and the adopted generator has lower top-family share or higher unique family count than the current three-shape baseline without losing subject identity;
* no unexplained local sentinel regression appears in pitch-class unison duration, duration-based lockstep, unresolved entry severe interval duration, modal counter-subject identity, or leap recovery;
* all musical problems found by Phase 13R or its follow-up have a completed response before Phase 8/9: generator repair, scoring / guardrail repair, diagnostic repair with a passing re-review, or a documented rejection as non-defect;
* post-Phase-13R listening blockers for similar phrase / structure convergence and abrupt three-part silence are localized to representative seeds or windows, repaired, and re-reviewed, or explicitly rejected with evidence rather than treated as accepted tradeoffs;
* review artifacts record the effective selection model, quality-vector movement, local sentinel deltas, manual listening findings, and any remaining listening gap.

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
4. Add cross-seed subject-family diversity diagnostics to review summaries and A/B summaries.
5. Re-run a focused A/B review comparing explicit legacy `baseline`, current planner, and the new default path.
6. Add guarded selectable phrase-family / fragment-derivation candidates.
7. Expand initial subject generator candidates and adopt only variants that improve corpus-level subject diversity while preserving hard constraints, entry harmony, and subject identity.
8. Run the 22 seed `review-ab` bundle, focused ad hoc seed sweep, and focused listening templates.
9. Fix any confirmed musical problem found by Phase 13R or the follow-up before Phase 8/9. Prefer upstream generator, subject builder, phrase-family, scoring, guardrail, or diagnostics changes over UI masking.
10. Re-run the affected 22 seed or focused seed evidence after each fix and record the musical symptom, affected seeds, tradeoff, and remaining listening gap.
11. Update Phase 8 entry criteria only after the default path, per-score convergence evidence, cross-seed subject-diversity evidence, and repair evidence pass.

## Required Follow-Up Repair Before Phase 8/9

The automatic baseline is no longer enough to restart the operational lane. Before Phase 8 or Phase 9 work begins, complete the remaining Phase 13R handoff as a repair loop, not just an evidence pass:

* fill focused manual listening notes for `organ-default` and `strict-counterpoint` on the focused convergence seed set;
* add bundle-level `subjectFamilyDiversity` review summary and A/B deltas that detect cross-seed initial subject-family concentration;
* repair `buildSubject` degree, rhythm, contour, climax, and tail candidates enough to improve top-family share or unique family count without losing subject identity, entry harmony, hard constraints, or leap recovery;
* re-run the 22 seed review evidence and focused ad hoc subject-diversity sweep;
* run a music-theory review on any newly exposed subject, phrase, counterpoint, harmony, rhythm, texture, or form problem from the follow-up;
* fix confirmed musical problems in the generator, subject builder, phrase-family candidate pool, scoring, guardrails, or diagnostics before Phase 8/9;
* specifically repair the confirmed post-listening symptoms: cross-score / cross-seed phrase convergence, and abrupt three-part silence that is not explained by cadence, phrase boundary, or staged functional thinning;
* re-review affected representative, boundary, rotation, and adversarial seeds after each fix;
* record whether remaining subject similarity or other symptoms are function-bearing recurrence, false positives, or still blockers.

Phase 8 may start only after this follow-up records its evidence and fixes the confirmed musical problems it finds. Phase 9 inherits the same precondition and may not use Worker fallback, deadlines, or visualizer stability work to mask unresolved subject-family collapse, phrase convergence, counterpoint regressions, harmony defects, or listening-fatigue symptoms.

## Implementation Progress

The first guardrail slice adds `diagnostics.selectionModel` and `diagnostics.phase13RReview`. `phase13RReview` emits `review-required` findings for legacy default selection, repeated 4-section continuation patterns, low section-pattern diversity, entry-pattern family concentration, subject-stem concentration, and subject-fragment concentration. This is intentionally a review signal, not a hard failure: it makes CI and agent self-review detect the problem while leaving Phase 13R implementation free to compare tradeoffs.

`review` and `review-ab` now carry `phase13RReview` inside diagnostics summaries. A/B comparison records whether Phase 13R finding count improves or regresses, so future model changes expose phrase-convergence movement in the automatic summary.

CI now has focused tests that prove explicit legacy `baseline` still emits the Phase 13R review signal and that the omitted selection model uses the adopted `phase10-section-local-planner` path. CLI `generate` / `diagnose` / `midi`, review bundles, core default generation, and Web UI playback all route through the same exported default model. `review-ab` still accepts explicit `baseline`, `phase10-oracle-selection`, and `phase10-section-local-planner` model choices for comparison.

The final automatic adoption makes a guarded subset of phrase-family candidates selectable when the section-local guardrails accept them. This keeps alternate stems out of the normal path unless the candidate preserves hard constraints, entry harmony, voice-pair texture, counter-subject identity, and leap recovery against the local baseline section. The test suite keeps older Phase 5-7 historical gates on explicit legacy `baseline`, while Phase 10-13Q compatibility and Phase 13R default-path tests cover the adopted planner.

22 seed automatic evidence for the adopted default:

* hard constraint failures: 0;
* Phase 7B readiness: 22/22 seeds;
* Phase 13R review findings: 16 automatic review findings remain, all non-hard phrase-concentration review signals;
* quality-vector local sentinels: 263, down from 310 on explicit legacy `baseline`;
* aggregate unresolved severe entry intervals: 946, down from 1084 on explicit legacy `baseline`;
* aggregate unison overlap, duration lockstep, and leap-recovery misses rise against legacy `baseline` (14216 -> 14720, 18536 -> 19000, 407 -> 475 respectively). This is an accepted automatic-review tradeoff because hard constraints and Phase 7B readiness remain intact, local sentinel count falls, and the remaining regressions are already visible as review signals rather than hidden acceptance.

Focused convergence evidence against explicit legacy `baseline`:

* `bach-001`: repeated 4-section pattern 7 -> 2, unique patterns 4 -> 21, no Phase 13R findings.
* `fugue-smoke`: repeated 7 -> 4, unique 6 -> 16; subject-fragment share falls 0.471 -> 0.25, while subject-stem share rises 0.294 -> 0.438 as a subject-return recurrence.
* `modal-cadence`, `dense-modal`, and `angular-answer`: repeated 7 -> 5 and unique patterns improve to 9/12/9. Subject-fragment concentration remains 0.485/0.485/0.469 because the modal fragment is preserved as the function-bearing entry identity rather than replaced by a looser variant.
* `modal-answer`: repeated 6 -> 5, unique 5 -> 11, entry share 0.357 -> 0.31, subject-stem share 0.441 -> 0.294, no Phase 13R findings.
* `minor-entry` and `sparse-cadence`: repeated 6 -> 3, unique 5 -> 18. Subject-fragment share falls, while subject-stem share rises as a return-anchor tradeoff for stronger section diversity.
* `random-listen-check`: repeated 6 -> 5, unique 5 -> 11, entry share 0.341 -> 0.333, fragment share 0.394 -> 0.364; unchanged stem share remains a review signal.

Manual listening update: focused playback has now confirmed Phase 8/9 blockers rather than merely leaving a claims gap. Similar structure / phrase convergence and abrupt three-part silence remain open until representative seeds or windows are localized, repaired, and re-reviewed.

Cross-seed subject-diversity follow-up: review bundle schema version 13 now writes `subjectFamilyDiversity`, and review-ab schema version 3 writes subject-family diversity deltas. `buildSubject` now chooses a conservative additional upper-neighbor subject shape on the adopted planner path while keeping explicit legacy `baseline` and `phase10-oracle-selection` comparison paths on the old subject vocabulary.

The 22 seed `organ-default` and `strict-counterpoint` review bundles both report hard constraint failures 0, Phase 7B readiness 22/22, 4 unique initial subject families, top initial subject family share 0.318, top subject-fragment family share 0.409, and no `subjectFamilyDiversity` findings. The focused Phase 13R seed sweep reports 4 top subject families across 9 seeds, hard constraint failures 0, and top family share 0.444. Details are in [Phase 13R subject diversity follow-up](../reviews/phase-13r-subject-diversity-follow-up.md).

Human focused listening has now found confirmed Phase 13R pre-Phase-8/9 blockers. The generated `organ-default` and `strict-counterpoint` review bundles include MIDI and listening templates, and agent-side score review did not previously find a new confirmed musical blocker, but human playback feedback reports that similar structure / phrase convergence still persists and abrupt three-part silence still occurs. Phase 8/9 remain deferred until those symptoms are localized, repaired, and re-reviewed, or a later review rejects a specific report as a false positive with evidence.

## Theory Basis

Fugue form requires recognizable subject recurrence, but episodes and returns should carry changed function, direction, cadence preparation, or contrapuntal tension. Repetition becomes a defect when the same short subject fragment and section cycle recur without a new phrase role. Fux-style counterpoint still constrains the repair: added variety cannot be accepted if it creates unresolved dissonance, exposed long unison, poor leap recovery, or unclear subject identity.
