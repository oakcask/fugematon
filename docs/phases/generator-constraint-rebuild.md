# Generator Constraint Rebuild

## Status

In progress. This plan replaces post-generation repair with deterministic local constraint solving behind the existing `generateScore` API.

## Preservation Contract

The rewrite preserves the public `GenerationOutput` event envelope, diagnostics compatibility, seed determinism, known voice set, safe tick and MIDI value shape, subject and answer plan identity, key metadata consistency, and the active `WritingProfile` pitch/range continuation contract.

Legacy exact note sequences and beauty-metric expected values are not preservation requirements. They may change when the solver gives the same structural guarantees directly. Review-only metrics such as line agency, lockstep, phrase recurrence, unison duration, local sentinels, and surface brilliance remain adoption evidence unless a later source-backed plan promotes a focused rule.

## Current Slice

The first slice adds a constraint-core evaluator that runs against the existing generated score without changing output selection. It records current-contract hard failures, soft costs, affected notes, and a diagnostics-only `generatorSearchTrace` candidate.

This slice is intentionally not a musical solver. It creates the evaluator and deterministic candidate ordering that later exposition, entry-support, episode, and terminal-support solvers will call before accepting local windows.

## Implementation Order

1. Keep the existing subject, answer, section, harmony, and `WritingProfile` builders as solver input.
2. Evaluate generated windows with hard failures separated from soft costs.
3. Port exposition generation first so subject identity, answer identity, entry order, key metadata, and profile pitch contracts are produced by search rather than repair.
4. Add entry-local support constraints for prepared consonance/dissonance handling, carried outside voices, staggered attacks, and post-entry continuity.
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

Integration verification keeps `generateScore` deterministic, schema-compatible, and diagnostics-visible while the selected output remains the existing legacy path.
