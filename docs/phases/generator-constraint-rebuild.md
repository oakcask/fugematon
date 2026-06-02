# Generator Constraint Rebuild

## Status

In progress. This plan replaces post-generation repair with deterministic local constraint solving behind the existing `generateScore` API.

## Preservation Contract

The rewrite preserves the public `GenerationOutput` event envelope, diagnostics compatibility, seed determinism, known voice set, safe tick and MIDI value shape, subject and answer plan identity, key metadata consistency, and the active `WritingProfile` pitch/range continuation contract.

Legacy exact note sequences and beauty-metric expected values are not preservation requirements. They may change when the solver gives the same structural guarantees directly. Review-only metrics such as line agency, lockstep, phrase recurrence, unison duration, local sentinels, and surface brilliance remain adoption evidence unless a later source-backed plan promotes a focused rule.

## Current Slice

The current completed slice ports the non-continuation exposition boundary and entry-local support handling to deterministic local search. Initial generation builds exposition-local candidates before continuation generation, evaluates each with the constraint-core evaluator, and emits a solver-mode `generatorSearchTrace` with real exposition candidate ids.

Entry-local support instability now affects constraint-core soft costs and continuation candidate entry-harmony scoring. Entry diagnostics distinguish unresolved severe support from carried suspension-like support, weak passing / neighbor support, and stepwise release, while entry-boundary continuity classifies important subject / answer windows as prepared collective articulation or continuity-supported rather than unexplained synchronized reset.

This slice is intentionally bounded to exposition identity and entry-local support selection. It does not solve episode, subject-fragment entry support, terminal-support, or free-counterpoint spans yet.

## Implementation Order

1. Keep the existing subject, answer, section, harmony, and `WritingProfile` builders as solver input.
2. Evaluate generated windows with hard failures separated from soft costs. Complete for the diagnostics-only slice.
3. Port exposition generation first so subject identity, answer identity, entry order, key metadata, and profile pitch contracts are produced by search rather than repair. Complete for the non-continuation exposition slice: initial generation now selects between two local candidates before continuation generation.
4. Add entry-local support constraints for prepared consonance/dissonance handling, carried outside voices, staggered attacks, and post-entry continuity. Complete for important subject / answer entry windows; remaining subject-fragment episode entry support belongs to the later episode / free-counterpoint slice.
5. Add episode and free-counterpoint constraints for motivic derivation, harmony realization, independent contour/rhythm, and clash resolution.
6. Downgrade or remove repair passes only after the corresponding solver constraint directly guarantees the behavior.

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
