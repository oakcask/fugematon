# Generator Constraint Rebuild Slice Review

## Findings

No generated music is adopted from a new solver in this slice. The change is diagnostics and architecture scaffolding: the existing output is evaluated as one diagnostics-only candidate and retained.

The current hard-failure set is contract-backed, not beauty-backed: safe note shape, known voices, MIDI pitch/velocity bounds, active voice range, no voice crossing, subject identity, answer plan identity, key metadata, and `WritingProfile` pitch/range contract.

Soft costs remain review evidence: parallel perfects, entry-support instability, unresolved or strong-beat dissonance, leap recovery, and `WritingProfile` playability signals. These are not promoted to hard gates here because the exact solver behavior and source-backed exceptions still need focused design.

## Scope

* CI-blocking: public schema compatibility, deterministic trace shape, and current-contract hard-failure rejection in unit tests.
* CI-observed: generated-score diagnostics include `generatorSearchTrace` with a diagnostics-only selected legacy candidate.
* Review-required: musical quality movement after exposition, entry-support, episode, or terminal-support solver slices start changing notes.
* Manual-listening: unchanged in this slice because selected notes are still produced by the legacy generator path.

## Theory Basis

This slice uses existing source-family policy only. Fux/species counterpoint, common-practice fugue subject/episode families, generative evaluation, and keyboard playability remain design inputs for later solver slices, but no exact citation is promoted here because no new source-specific musical rule changes a gate or accepted output.

## Remaining Work

The next review must inspect representative generated windows once the exposition solver changes note output. It should compare at least one representative seed, one answer-plan boundary seed, one `WritingProfile` target, and one continuous-fugue continuation control.
