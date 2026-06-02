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

The terminal-support slice adds terminal continuation-candidate soft costs for cadence target preparation, low-voice root / chord-tone support, outer-voice landing, final-rest stability, and unsupported texture collapse. Terminal-support costs now influence terminal continuation candidate selection and appear in `generatorSearchTrace` reason strings, while `terminalClosureReview` keeps continuous-fugue terminal closure as `not-required` without hiding weak low-voice support, unsupported collapse, or final-rest failures.

Final repair-pass downgrade remains open until each matching repair behavior has a direct solver replacement and focused before/after review evidence.

## Implementation Order

1. Keep the existing subject, answer, section, harmony, and `WritingProfile` builders as solver input.
2. Evaluate generated windows with hard failures separated from soft costs. Complete for the diagnostics-only slice.
3. Port exposition generation first so subject identity, answer identity, entry order, key metadata, and profile pitch contracts are produced by search rather than repair. Complete for the non-continuation exposition slice: initial generation now selects between two local candidates before continuation generation.
4. Add entry-local support constraints for prepared consonance/dissonance handling, carried outside voices, staggered attacks, and post-entry continuity. Complete for important subject / answer entry windows; remaining subject-fragment episode entry support belongs to the later episode / free-counterpoint slice.
5. Add episode and free-counterpoint constraints for motivic derivation, harmony realization, independent contour/rhythm, and clash resolution. Complete: section-local continuation candidates now enter `generatorSearchTrace` with stable candidate ids and soft-cost explanations for episode / free-counterpoint behavior; score-window acceptance structurally classifies subject-fragment entry support and exposed free-counterpoint solo / thinning.
6. Downgrade or remove repair passes only after the corresponding solver constraint directly guarantees the behavior. Terminal-support candidate costs are now in place for terminal continuation windows; final repair-pass downgrade remains pending focused replacement evidence.

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

Integration verification keeps `generateScore` deterministic, schema-compatible, and diagnostics-visible. Non-continuation initial generation should report solver-mode exposition candidates; continuous-fugue segment continuation remains outside this exposition slice and may keep diagnostics-only trace coverage until a later continuation-local solver is added.

The entry-local support slice is reviewed in [Generator Constraint Rebuild Entry Support Review](../reviews/generator-constraint-rebuild-entry-support.md). The 22 seed target bundle keeps review-policy hard failures at 0, lowers aggregate `entrySupportInstabilityCount` and `unresolvedEntrySupportInstabilityCount`, and lowers `unresolvedSevereEntryIntervalCount` plus `unresolved-entry-severe-interval` local sentinels. Remaining max-4 local counters are documented as prepared / continuity-classified important entries or subject-fragment episode work for the next solver slice.

The episode / free-counterpoint slice is reviewed in [Generator Constraint Rebuild Episode Free-Counterpoint Review](../reviews/generator-constraint-rebuild-episode-free-counterpoint.md). The 22 seed target bundle keeps review-policy and hard-contract failures at 0, emits real section-local candidate ids for every seed, and classifies subject-fragment entry support, exposed free-counterpoint solo / thinning, harmonic stasis rearticulation, harmonic continuity, and entry severe-interval windows into accepted context, review-required, or generator response.

The terminal-support slice is reviewed in [Generator Constraint Rebuild Terminal Support Review](../reviews/generator-constraint-rebuild-terminal-support.md). The 22 seed target bundle keeps hard-contract failures at 0, emits terminal-support reason coverage in every terminal candidate row, and keeps continuous-fugue terminal support weaknesses classified as review-visible `not-required` closure evidence rather than final-repair success.
