# Generator Constraint Rebuild

## Status

In progress. This plan replaces post-generation repair with deterministic local constraint solving behind the existing `generateScore` API.

## Preservation Contract

The rewrite preserves the public `GenerationOutput` event envelope, diagnostics compatibility, seed determinism, known voice set, safe tick and MIDI value shape, subject and answer plan identity, key metadata consistency, and the active `WritingProfile` pitch/range continuation contract.

Legacy exact note sequences and beauty-metric expected values are not preservation requirements. They may change when the solver gives the same structural guarantees directly. Review-only metrics such as line agency, lockstep, phrase recurrence, unison duration, local sentinels, and surface brilliance remain adoption evidence unless a later source-backed plan promotes a focused rule.

## Current Slice

The current completed slice ports the non-continuation exposition boundary and entry-local support handling to deterministic local search. Initial generation builds exposition-local candidates before continuation generation, evaluates each with the constraint-core evaluator, and emits a solver-mode `generatorSearchTrace` with real exposition candidate ids.

Entry-local support instability now affects constraint-core soft costs and continuation candidate entry-harmony scoring. Entry diagnostics distinguish unresolved severe support from carried suspension-like support, weak passing / neighbor support, and stepwise release, while entry-boundary continuity classifies important subject / answer windows as prepared collective articulation or continuity-supported rather than unexplained synchronized reset.

The completed episode / free-counterpoint slice adds local constraint evidence for selected continuation sections while keeping the later repair passes visible. The solver trace now includes section-local candidate ids, and those candidate rows summarize episode motivic derivation, cadence / entry preparation, free-counterpoint harmony realization, independent contour / rhythm, clash resolution, and entry handoff support as soft-cost explanations. Subject-fragment episode entries are included in entry-boundary continuity windows, and exposed free-counterpoint solo / thinning windows are promoted into score-window acceptance.

The terminal-support slice adds terminal continuation-candidate soft costs for cadence target preparation, low-voice root / chord-tone support, outer-voice landing, final-rest stability, and unsupported texture collapse. Terminal-support costs now appear in `generatorSearchTrace` reason strings without overriding the established continuation-quality selection gates, while `terminalClosureReview` keeps continuous-fugue terminal closure as `not-required` without hiding weak low-voice support, unsupported collapse, or final-rest failures.

The first final-repair downgrade ports harmonic-stasis rearticulation cleanup out of the `generateScore` final pass. Section-local continuation candidates now include harmonic-stasis solver variants, and score-level support cleanup records unrepaired / repaired trace rows before adopting the repaired notes. Other final repair surfaces remain open until their matching solver replacement and focused before / after review evidence are present.

The harmonic-continuity support slice ports short pivot-episode support cleanup into score-level deterministic local search. Score-level rows now preserve unrepaired and repaired harmonic-continuity evidence before adoption, reject repairs that increase hard failures, and keep remaining review-required continuity windows visible rather than accepting them without audible score support.

The score-level support cleanup trace slice completes the remaining focused support cleanup downgrade for functional thinning, post-entry continuation support, long-rest phrase closure, bass-answer tail texture support, and texture voice-crossing repair. The score-level adoption loop keeps unrepaired / repaired trace evidence, rejects hard-failure regressions, and keeps the standard 22 seed texture voice-crossing surface closed as generated no-op evidence: normal continuation texture is already built with adjacent voice-order checks, texture-role-aware octave placement, harmonic anchor support, and active `WritingProfile` pitch / range limits before the score-level surface runs. A focused synthetic score remains the regression fixture for the real texture crossing before / after delta.

The continuous-fugue segment-continuation trace slice adds continuation-local boundary candidates for segment 1 and later. The solver trace now emits `segment-<index>-boundary-continuation-*` rows for hidden boundaries, keeps hard failures separate from boundary soft costs, and scores carry, pedal support, staggered re-entry, prior-tail harmonic support, first-attack density, role mix, and hard-restart risk without changing the public output envelope, seed determinism, voice set, key metadata, or `WritingProfile` pitch contract.

## Implementation Order

1. Keep the existing subject, answer, section, harmony, and `WritingProfile` builders as solver input.
2. Evaluate generated windows with hard failures separated from soft costs. Complete for the diagnostics-only slice.
3. Port exposition generation first so subject identity, answer identity, entry order, key metadata, and profile pitch contracts are produced by search rather than repair. Complete for the non-continuation exposition slice: initial generation now selects between two local candidates before continuation generation.
4. Add entry-local support constraints for prepared consonance/dissonance handling, carried outside voices, staggered attacks, and post-entry continuity. Complete for important subject / answer entry windows; remaining subject-fragment episode entry support belongs to the later episode / free-counterpoint slice.
5. Add episode and free-counterpoint constraints for motivic derivation, harmony realization, independent contour/rhythm, and clash resolution. Complete: section-local continuation candidates now enter `generatorSearchTrace` with stable candidate ids and soft-cost explanations for episode / free-counterpoint behavior; score-window acceptance structurally classifies subject-fragment entry support and exposed free-counterpoint solo / thinning.
6. Downgrade or remove repair passes only after the corresponding solver constraint directly guarantees the behavior. Terminal-support candidate costs are now in place for terminal continuation windows. Harmonic-stasis rearticulation, harmonic-continuity support, and the focused score-level support cleanup group are downgraded with before / after trace evidence. Texture voice-crossing repair is closed as score-level solver-owned for any generated score delta, while the standard generated bundle is classified as synthetic-only / no-op because the normal generator path structurally prevents adjacent texture voice-order crossings before that surface has a diff to adopt. Continuous-fugue boundary carry repair now records continuation-local before / after or adopted boundary candidate evidence instead of relying on diagnostics-only trace rows.

## Theory Inputs

Use source-family evidence before promoting musical preferences into hard gates:

* Fux/species counterpoint for consonance, dissonance preparation/resolution, motion, and line independence.
* `common-practice-fugue-subjects` for subject and answer identity, recognizability, and answer-compatible rhetoric.
* `common-practice-fugue-episodes` for episode derivation, sequencing, imitation, and subject-free spans that still serve form.
* `keyboard-playability-and-compass` for `WritingProfile` pitch and playability separation.
* Generative music evaluation sources for candidate scoring and adoption evidence.

Exact citations or new claim-map entries are required when a later slice changes gate scope, review acceptance, phase scope, or source-backed solver behavior.

## Verification

Current-contract hard failures are tested as unit-level rejects for range, known voice, safe event shape, pitch/velocity bounds, voice crossing, subject identity, answer plan, key metadata, and `WritingProfile` pitch violations.

Integration verification keeps `generateScore` deterministic, schema-compatible, and diagnostics-visible. Non-continuation initial generation should report solver-mode exposition candidates. Continuous-fugue segment continuation now reports solver-mode segment-boundary candidates with stable ids and boundary soft-cost reasons, while weak carry and hard-restart classifications remain visible through `continuousBoundaryCarry`.

The entry-local support slice is reviewed in [Generator Constraint Rebuild Entry Support Review](../reviews/generator-constraint-rebuild-entry-support.md). The 22 seed target bundle keeps review-policy hard failures at 0, lowers aggregate `entrySupportInstabilityCount` and `unresolvedEntrySupportInstabilityCount`, and lowers `unresolvedSevereEntryIntervalCount` plus `unresolved-entry-severe-interval` local sentinels. Remaining max-4 local counters are documented as prepared / continuity-classified important entries or subject-fragment episode work for the next solver slice.

The episode / free-counterpoint slice is reviewed in [Generator Constraint Rebuild Episode Free-Counterpoint Review](../reviews/generator-constraint-rebuild-episode-free-counterpoint.md). The 22 seed target bundle keeps review-policy and hard-contract failures at 0, emits real section-local candidate ids for every seed, and classifies subject-fragment entry support, exposed free-counterpoint solo / thinning, harmonic stasis rearticulation, harmonic continuity, and entry severe-interval windows into accepted context, review-required, or generator response.

The terminal-support slice is reviewed in [Generator Constraint Rebuild Terminal Support Review](../reviews/generator-constraint-rebuild-terminal-support.md). The 22 seed target bundle keeps hard-contract failures at 0, emits terminal-support reason coverage in every terminal candidate row, and keeps continuous-fugue terminal support weaknesses classified as review-visible `not-required` closure evidence rather than final-repair success.

The first final-repair downgrade is reviewed in [Generator Constraint Rebuild Final Repair Downgrade Review](../reviews/generator-constraint-rebuild-final-repair-downgrade.md). The refreshed 22 seed bundle keeps the target hard failures, reference-profile status, entry/support counters, terminal closure classifications, and harmonic-stasis generator-response windows stable. `generatorSearchTrace` exposes `score-harmonic-stasis-unrepaired-final-repair-evidence` beside `score-harmonic-stasis-solver-repaired` for the 10 seeds where score-level support cleanup needs the solver replacement.

The harmonic-continuity support slice is reviewed in [Generator Constraint Rebuild Harmonic Continuity Support Review](../reviews/generator-constraint-rebuild-harmonic-continuity-support.md). The refreshed 22 seed check keeps hard failures, unsupported solo runs, and abrupt texture drops at 0. `generatorSearchTrace` exposes `score-harmonic-continuity-unrepaired-final-repair-evidence` beside `score-harmonic-continuity-solver-repaired` for the 13 seeds where score-level support cleanup improves the harmonic-continuity support surface. Remaining review-required harmonic-continuity windows stay visible and are not treated as solved without score support.

The score-level support cleanup trace slice is reviewed in [Generator Constraint Rebuild Support Cleanup Trace Review](../reviews/generator-constraint-rebuild-support-cleanup-trace.md). The remaining support cleanup group now snapshots the unrepaired score, builds one focused repaired candidate, rejects hard-failure regressions, and emits paired `score-*-unrepaired-final-repair-evidence` / `score-*-solver-repaired` rows before adopting the repaired score. The slice exposes functional thinning, post-entry continuation, long-rest phrase closure, and bass-answer tail support as generated solver-owned adoption evidence. Texture voice-crossing repair stays solver-owned for real score deltas, but the standard 22 seed generated bundle is explicitly closed as synthetic-only / no-op because normal generation preserves adjacent voice order through texture-role priority, harmonic-anchor support, and active `WritingProfile` pitch / range constraints before score-level cleanup.

The continuous-fugue segment-continuation trace slice is reviewed in [Generator Constraint Rebuild Continuation-Local Solver Review](../reviews/generator-constraint-rebuild-continuation-local-solver.md). The normal 22 seed bundle keeps ScoreEvent JSON, review-policy metrics, and exposition / section / score trace coverage identical to the target baseline. A focused segment 1 `continuous-fugue` bundle now emits stable `segment-1-boundary-continuation-*` candidate rows for all 22 seeds, separates hard failures from boundary soft costs, and keeps weak carry or hard-restart evidence visible through `continuousBoundaryCarry`.
