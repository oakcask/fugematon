# Constrained Keyboard Writing Profiles Completion Review

## Findings

No blocker findings.

Finding: the default `four-voice-default` score path is preserved.

Affected seeds: `bach-001`, `fugue-smoke`, `minor-entry`, `modal-cadence`, `dense-modal`, and `seed-19l7uit-1u226cc`.

Theory basis: project compatibility policy. The new writing-profile boundary must not change existing four-voice fugue output unless a later quality phase explicitly changes the generator.

Project response: accept. Current default ScoreEvent JSON and MIDI match the target baseline exactly for all six listed seeds. Existing diagnostics metrics also match; the current diagnostics add `writingProfile` metadata and profile-constraint fields.

Finding: constrained profiles expose generation-side pitch and playability evidence.

Affected seeds: focused profile pass across `bach-001`, `fugue-smoke`, and `minor-entry` for `piano-two-hand`, `harpsichord-manual`, `music-box-n20`, and `music-box-n40`.

Theory basis: `keyboard-playability-and-compass` source family and claim `keyboard-writing-profile-separates-compass-and-playability`. Pitch compass is a generation constraint, while piano and harpsichord reach and music-box mechanism limits need separate review-visible evidence.

Project response: accept. All focused constrained-profile outputs report 0 `writingProfilePitchViolations` and 0 `unavailablePitchClassCount`. Piano and harpsichord span/leap findings and music-box repeat-rate findings remain diagnostics evidence instead of hidden playback assumptions.

## Evidence

Generated current default review evidence:

* `samples/target-constrained-keyboard-writing-profiles-current/review` with `pnpm fugematon review --out samples/target-constrained-keyboard-writing-profiles-current/review --ticks 129600 --performance-profile organ-default --writing-profile four-voice-default`.
* Current review summary: schema version 20, 22 seeds, `section-local-planner`, `organ-default`, `four-voice-default`, hard constraint failures 0, subject-family findings 0.
* Target baseline review summary had the same schema version, seed count, selection model, performance profile, hard constraint failures, subject-family findings, and review-signal counts. The current summary adds writing-profile metadata.

Generated current individual default evidence:

* `bach-001`: ScoreEvent JSON equal to target baseline; MIDI equal to target baseline; range violations 0; voice crossings 0; unresolved dissonance 0; profile pitch violations 0.
* `fugue-smoke`: ScoreEvent JSON equal to target baseline; MIDI equal to target baseline; range violations 0; voice crossings 0; unresolved dissonance 0; profile pitch violations 0.
* `minor-entry`: ScoreEvent JSON equal to target baseline; MIDI equal to target baseline; range violations 0; voice crossings 0; unresolved dissonance 0; profile pitch violations 0.
* `modal-cadence`: ScoreEvent JSON equal to target baseline; MIDI equal to target baseline; range violations 0; voice crossings 0; unresolved dissonance 0; profile pitch violations 0.
* `dense-modal`: ScoreEvent JSON equal to target baseline; MIDI equal to target baseline; range violations 0; voice crossings 0; unresolved dissonance 0; profile pitch violations 0.
* `seed-19l7uit-1u226cc`: ScoreEvent JSON equal to target baseline; MIDI equal to target baseline; range violations 0; voice crossings 0; unresolved dissonance 0; profile pitch violations 0.

Focused constrained-profile diagnostics:

* `piano-two-hand`: 0 profile pitch violations across the focused seeds; hand-span windows remain review-visible, with 99 for `bach-001`, 89 for `fugue-smoke`, and 80 for `minor-entry`.
* `harpsichord-manual`: 0 profile pitch violations across the focused seeds; hand-span windows remain review-visible, with 18 for `bach-001`, 53 for `fugue-smoke`, and 33 for `minor-entry`.
* `music-box-n20`: 0 profile pitch violations and 0 simultaneity violations across the focused seeds; repeat-rate windows remain review-visible, with 100 for `bach-001`, 95 for `fugue-smoke`, and 78 for `minor-entry`.
* `music-box-n40`: 0 profile pitch violations and 0 simultaneity violations across the focused seeds; repeat-rate windows remain review-visible, with 46 for `bach-001`, 23 for `fugue-smoke`, and 43 for `minor-entry`.

Verification:

* `pnpm test` passed 435 tests.

## Tradeoffs

Manual listening remains incomplete. The generated MIDI files exist for piano and music-box profile inspection, but no human listening judgement is recorded here.

The current review verifies emitted ScoreEvent JSON, MIDI, diagnostics, CLI selection, and regression tests. It does not prove by inspection that every internal candidate path is profile-constrained before selection; keep that as an implementation-audit concern if future work deepens music-box reduction or piano hand-playability.

## CI / Review Scope

`writingProfilePitchViolations`, unsupported pitch-class checks, and snapshot writing-profile mismatch are `ci-blocking` for this phase because they protect public generation contracts.

Piano and harpsichord hand-span/leap costs are `review-required`; they expose playability pressure but are not calibrated enough to block all generated output.

Music-box repeat-rate findings are `review-required`; pitch-set and simultaneity violations remain hard mechanism evidence.
