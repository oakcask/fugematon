# Generator Constraint Rebuild Support Cleanup Trace Review

This review covers the score-level support cleanup trace slice in [Generator Constraint Rebuild](../phases/generator-constraint-rebuild.md). It is an evidence-surface change, not a new hard quality gate.

## Findings

1. Score-level support cleanup now uses explicit candidate adoption.
   The score-level adoption loop snapshots the unrepaired score, builds one focused repaired candidate, evaluates both drafts with the constraint core, rejects hard-failure regressions, and then adopts the repaired notes. The emitted ids are `score-<surface>-unrepaired-final-repair-evidence` and `score-<surface>-solver-repaired`, matching the existing harmonic-continuity and harmonic-stasis trace pattern.

2. The refreshed 22 seed check exposes generated support cleanup and closes texture voice-crossing repair as generated no-op evidence.
   The 129600 tick review showed paired repaired rows for `functional-thinning-support`, `bass-answer-tail-texture-support`, and `long-rest-phrase-closure` in all 22 seeds, plus `post-entry-continuation-support` in 9 seeds. `texture-voice-crossing-repair` still has no score delta in this standard bundle, and that absence is now treated as the expected generated path rather than an uncovered generated repair: normal continuation texture already preserves adjacent voice order through voice-order checks, texture-role priority, harmonic-anchor support, and the active `WritingProfile` pitch / range contract before the score-level surface runs. A focused synthetic score remains the regression fixture for the real texture voice-crossing before / after delta and keeps the paired score-level candidate ids tied to that surface.

3. Texture voice-crossing repair is separated as its own score-level surface, but generated bundles should not be forced to manufacture that surface.
   The texture surface runs before the support cleanup group, so pre-existing adjacent texture crossings are no longer accidentally attributed to functional thinning. The score-level repair candidate chooses octave displacement by adjacent voice order, texture-role priority, the active section's harmonic anchor, and the active `WritingProfile` pitch / range contract. The selected generated sections already use the same structural constraints when placing entry and continuity texture, so the standard bundle stays score-identical and emits no generated texture rows unless a future generator change creates a real score delta.

4. The theory basis remains review-level counterpoint evidence.
   Fux/species counterpoint treats crossing, unsupported dissonance, and unresolved entry-local seconds / sevenths as costs, while fugue episode practice allows functional thinning and continuation support when the line has harmonic or contrapuntal purpose. This slice records before / after evidence for those support costs rather than making them new hard failures.

## Metrics Comparison

The regenerated review bundle preserves the target score and metric surface while adding solver evidence rows. All 22 regenerated MIDIs match the target bundle, and the target per-seed metrics for entry support instability, unresolved severe entry intervals, and harmonic-continuity review-required windows have zero delta.

| Metric | Target baseline | Current |
| --- | ---: | ---: |
| Seeds | 22 | 22 |
| Review-policy hard failures | 0 | 0 |
| Review-policy hard constraint failures | 0 | 0 |
| Adoption-ready seeds | 22 | 22 |
| Reference-profile outside seeds | 3 | 3 |
| Reference-profile max distance | 0.033 | 0.033 |
| Unsupported solo runs | 0 | 0 |
| Abrupt texture drops | 0 | 0 |
| Entry support instability count | 1856 | 1856 |
| Severe entry interval count | 1130 | 1130 |
| Unresolved severe entry interval count | 884 | 884 |
| Harmonic-continuity focused windows | 239 | 239 |
| Harmonic-continuity review-required windows | 36 | 36 |
| Harmonic-continuity audible-progression windows | 203 | 203 |
| Harmonic-continuity solver trace seeds | 13 | 13 |
| Harmonic-stasis solver trace seeds | 10 | 10 |

## Trace Coverage

| Score-level surface | Seeds with paired rows |
| --- | ---: |
| `functional-thinning-support` | 22 |
| `post-entry-continuation-support` | 9 |
| `long-rest-phrase-closure` | 22 |
| `bass-answer-tail-texture-support` | 22 |
| `texture-voice-crossing-repair` | 0 |

Focused synthetic coverage:

| Score-level surface | Before row | After row | Result |
| --- | --- | --- | --- |
| `texture-voice-crossing-repair` | `score-texture-voice-crossing-repair-unrepaired-final-repair-evidence` | `score-texture-voice-crossing-repair-solver-repaired` | Alto / tenor texture crossing is repaired by lowering the tenor support note from C4 to C3 while preserving hard constraints. |

## CI / Review Scope

| Touched seed or metric | Classification | Reason | Action |
| --- | --- | --- | --- |
| Standard 22 seed `texture-voice-crossing-repair` trace coverage | `review-required` | Confirms the generated path has no adjacent texture voice-order delta to adopt; absence is meaningful review evidence, not a hard contract counter. | Keep in review bundle summaries and docs; do not add a CI blocker that requires generated texture rows. |
| Focused synthetic `texture-voice-crossing-repair` fixture | `ci-observed` | Deterministically proves the score-level solver can repair a real alto / tenor crossing while preserving hard constraints. | Keep the focused unit test as regression evidence for the synthetic-only surface. |
| `voiceCrossings` hard contract | `ci-blocking` | A final generated score crossing is a hard counterpoint failure with a direct generator or solver repair target. | Keep existing hard failure policy at 0 for generated bundles. |

## Verification

* `pnpm build`
* `node --test packages/core/dist/generate-score-level-support-cleanup.test.js`
* `pnpm fugematon review --out samples/generator-constraint-rebuild-texture-crossing-generated-20260603 --ticks 129600`
* `pnpm fugematon review --out samples/generator-constraint-rebuild-texture-voice-crossing-review --ticks 129600`
* `pnpm fugematon review --out samples/generator-constraint-rebuild-current-review/review --ticks 129600`
* Generated matching score-event JSON for the 22 target seeds under `samples/generator-constraint-rebuild-current-review/scores`
* `node --test packages/core/dist/generate-harmonic-continuity-review.test.js packages/core/dist/generate-harmonic-stasis-rearticulation.test.js packages/core/dist/generate-post-entry-thin-support-review.test.js`
* `node --test packages/core/dist/generate-long-rest-phrase-closure.test.js packages/core/dist/generate-bass-answer-tail-texture-review-c.test.js packages/core/dist/generate-post-entry-thin-support-review.test.js`
* Focused 22 seed comparison against the target bundle
* Refreshed implementation check: the regenerated 22 seed metrics and trace coverage still match this table, and all 22 ScoreEvent JSON files exactly match `samples/generator-constraint-rebuild-next-target/scores`
* Target completion check: regenerated `samples/generator-constraint-rebuild-target-completion/review` and `samples/generator-constraint-rebuild-target-completion/scores` at 129600 ticks; both directories match the target baseline, with no ScoreEvent structural diffs.
* Target review check: a regenerated 129600 tick 22 seed bundle matched `samples/generator-constraint-rebuild-target-current` with summary diff 0, MIDI diff 0, and standard-bundle `texture-voice-crossing-repair` trace rows still 0.
* Texture target check: `samples/generator-constraint-rebuild-texture-voice-crossing-review` keeps the 22 seed hard failures and `voiceCrossings` at 0 and texture voice-crossing generated trace rows at 0; the focused synthetic score provides the required paired texture rows.
* Generated no-op closure check: `samples/generator-constraint-rebuild-texture-crossing-generated-20260603` keeps hard contract failures and `voiceCrossings` at 0 for all 22 seeds, with 0 generated seeds emitting paired `score-texture-voice-crossing-repair-*` rows. This closes the standard generated bundle as synthetic-only / no-op for the texture surface.
* Target completion review: `samples/target-review-current-20260603` was regenerated from the current code at 129600 ticks and matched `samples/generator-constraint-rebuild-next-target-20260603` exactly for `summary.json`, the representative `fugue-smoke` MIDI / diagnostics, and the boundary `bach-001`, modal `modal-dorian`, and stretto `tight-stretto` MIDI / diagnostics. The refreshed summary keeps review-policy hard failures, hard-contract failures, range violations, voice crossings, subject identity violations, answer-plan violations, key metadata mismatches, all-voice silence gaps, and fallback passages at 0; quality-profile status and outside-seed counts match the target baseline; generated `texture-voice-crossing-repair` paired rows remain 0.

Manual listening was not performed. The remaining gap is aesthetic only: this review verifies counterpoint-order safety and trace ownership, but it does not claim a listening preference for the unchanged generated textures.
