# Generator Constraint Rebuild Final Repair Downgrade Review

This review covers the first focused final-repair downgrade in [Generator Constraint Rebuild](../phases/generator-constraint-rebuild.md). It compares the target baseline bundle with a refreshed 22 seed bundle generated after the downgrade.

## Findings

1. Harmonic-stasis rearticulation is no longer repaired only by the final `generateScore` pass.

   Section-local continuation candidates now include `harmonic-stasis` solver variants when the unrepaired candidate has generator-response harmonic-stasis windows and the repaired local candidate reduces them. If such a variant is selected, `generatorSearchTrace` also keeps the unrepaired source candidate as `*-unrepaired-final-repair-evidence`.

2. Score-level support cleanup keeps before / after evidence instead of hiding repair success.

   Functional thinning, post-entry continuation support, bass-answer tail texture, and short-episode harmonic-continuity support can still introduce harmonic-stasis rearticulation after section selection. That score-level surface now snapshots the unrepaired score, applies the harmonic-stasis solver only when it reduces generator-response windows, and emits:

   | Trace candidate | Purpose |
   | --- | --- |
   | `score-harmonic-stasis-unrepaired-final-repair-evidence` | before evidence; shows the unrepaired soft-cost surface |
   | `score-harmonic-stasis-solver-repaired` | after evidence; shows the score adopted by generation |

3. Focused seeds keep generator-response harmonic-stasis windows at 0.

   Focused check: `seed-1syy921-0025pp1`, `seed-07mwf08-1te3e2o`, `seed-1db5j19-1nhjtae`, `fugue-smoke`, `modal-cadence`, `dark-episode`, and `tight-stretto` at 64 quarters with `section-local-planner`.

   | Evidence | Current |
   | --- | ---: |
   | Focused seeds checked | 7 |
   | `harmonicStasisRearticulation.generatorResponseWindowCount > 0` | 0 |
   | Focused seeds with score-level before / after trace rows | 2 |
   | Hard-contract failures in focused tests | 0 |

4. The refreshed 22 seed bundle preserves the target metrics while adding direct final-repair downgrade evidence.

   The refreshed bundle uses the same 22 review seeds and 129600 tick length as the target baseline. It keeps the pre-downgrade quality surface stable and adds harmonic-stasis before / after trace rows where the score-level solver replacement is needed.

   | Evidence | Target baseline | Current |
   | --- | ---: | ---: |
   | Review seeds | 22 | 22 |
   | Hard-contract failures | 0 | 0 |
   | Reference-profile outside seed count | 3 | 3 |
   | Reference-profile max distance | 0.033 | 0.033 |
   | Unsupported solo runs | 0 | 0 |
   | Abrupt texture drops | 0 | 0 |
   | Entry support instability count | 1856 | 1856 |
   | Unresolved entry support instability count | 1492 | 1492 |
   | Unresolved severe entry interval count | 884 | 884 |
   | Terminal-support reason seed coverage | 22 | 22 |
   | Terminal closure `not-required` seeds | 22 | 22 |
   | Low-voice support `missing` / `unsupported` / `stable-chord-tone` | 19 / 2 / 1 | 19 / 2 / 1 |
   | Terminal unresolved boundary dissonances | 19 | 19 |
   | Harmonic-stasis generator-response windows | 0 | 0 |
   | Seeds with score-level harmonic-stasis before / after trace rows | 0 | 10 |

   Current score-level before / after rows appear for `bach-001`, `bright-answer`, `contrary-answer`, `contrary-motion`, `lyrical-line`, `modal-dorian`, `quiet-cadence`, `restless-line`, `sparse-cadence`, and `wide-key`.

5. Remaining final repair surfaces were not downgraded by this slice.

   Texture crossing, harmonic-continuity support, entry support cleanup, and terminal-support weakness remained review-visible unless their matching solver replacement and focused before / after evidence were present. The later [Generator Constraint Rebuild Harmonic Continuity Support Review](generator-constraint-rebuild-harmonic-continuity-support.md) records the harmonic-continuity support replacement. Terminal closure stays `not-required` for continuous-fugue and is not used as proof that low-voice support is musically solved.

## Music-Theory Basis

The theory basis stays source-family level. Fux/species counterpoint supports treating unsupported repeated short rearticulation and unresolved dissonance as counterpoint costs. Common-practice fugue and episode practice support preserving motivic free-counterpoint function while avoiding mechanical same-pitch reattacks that do not clarify cadence, sequence, or entry handoff. The implemented rule remains a local soft-cost solver surface, not a new hard gate.

## Verification

* `pnpm build`
* `pnpm fugematon review --out samples/generator-constraint-rebuild-final-repair-current --ticks 129600`
* `node --test packages/core/dist/generate-harmonic-stasis-rearticulation.test.js packages/core/dist/generate-section-local-planner.test.js packages/core/dist/generate.test.js packages/core/dist/generation/constraint-core.test.js packages/core/dist/public-contract.integration.test.js`

Manual listening was not performed. The refreshed 22 seed bundle is enough to downgrade only harmonic-stasis final repair behavior because it keeps the target metrics stable and makes the replacement evidence visible; it is not evidence for downgrading the other final repair surfaces.
