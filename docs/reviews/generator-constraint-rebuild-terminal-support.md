# Generator Constraint Rebuild Terminal Support Review

This review covers the terminal-support part of implementation order item 6 in [Generator Constraint Rebuild](../phases/generator-constraint-rebuild.md).

## Findings

1. Terminal-support behavior now participates in the continuation-local solver surface.

   Review command: `pnpm fugematon review --out samples/generator-constraint-rebuild-target/terminal-support-review/review --ticks 129600 --performance-profile organ-default`.

   ScoreEvent command shape: `pnpm fugematon generate --seed <seed> --ticks 129600 --out samples/generator-constraint-rebuild-target/terminal-support-review/scores/<seed>.score.json`.

   Across the 22 target seeds, `generatorSearchTrace` stayed in solver mode and emitted 715 candidate rows. Terminal-support explanations appeared in 22 terminal candidate rows with 38 `terminal-support-*` reason mentions.

   | Terminal-support reason | Count |
   | --- | ---: |
   | `terminal-support-cadence-target` | 15 |
   | `terminal-support-low-voice` | 19 |
   | `terminal-support-outer-voice-landing` | 1 |
   | `terminal-support-final-rest` | 1 |
   | `terminal-support-unsupported-texture-collapse` | 2 |

2. The 22 seed target bundle keeps hard failures at 0.

   | Metric | TARGET baseline | Current |
   | --- | ---: | ---: |
   | Seed count | 22 | 22 |
   | Length ticks | 129600 | 129600 |
   | Hard-contract failures | 0 | 0 |
   | Review warnings | 54 | 54 |
   | `entrySupportInstabilityCount` | 1856 | 1856 |
   | `unresolvedEntrySupportInstabilityCount` | 1492 | 1492 |
   | `severeEntryIntervalCount` | 1130 | 1130 |
   | `unresolvedSevereEntryIntervalCount` | 884 | 884 |
   | `unsupportedSoloRunCount` | 0 | 0 |
   | `abruptTextureDropCount` | 0 | 0 |

3. Continuous-fugue terminal closure remains `not-required`, but weak terminal support stays review-visible.

   | Terminal closure diagnostic | Current |
   | --- | ---: |
   | `terminalClosureReview.classification = not-required` | 22 |
   | `terminalClosureReview.terminalClosureSource = not-required` | 22 |
   | `lowVoiceSupport = missing` | 19 |
   | `lowVoiceSupport = stable-chord-tone` | 1 |
   | `lowVoiceSupport = unsupported` | 2 |
   | `thinningExplanation = unsupported-collapse` | 17 |
   | `thinningExplanation = prepared-reduction` | 3 |
   | `thinningExplanation = cadence-support` | 2 |
   | `finalRestClassification = silence-failure` | 1 |

   The target is accepted as explicit classification rather than metric reduction. The unsupported terminal thinning and low-voice support failures are not hidden behind terminal-coda acceptance or final silence handling.

4. Final repair-pass downgrade remains deferred.

   This slice adds terminal-support costs to terminal continuation candidate selection and trace output. It does not remove repair passes because the remaining repair surfaces still cover non-terminal harmonic stasis, harmonic continuity, texture crossing, and support cleanup. Downgrade or removal should happen only when the matching repair behavior has a direct solver replacement and a focused before/after review confirms that review-visible failures are not being masked.

## Music-Theory Basis

Theory basis remains source-family level. Common-practice cadence expectations support requiring a terminal target, root or stable chord-tone low voice, stable outer voices, and a final rest that follows a stable sonority. Fux/species counterpoint supports treating unsupported terminal collapse and unresolved dissonance as review-visible counterpoint costs. These are solver soft costs and review classifications, not new hard gates.

## Remaining Review Gaps

Manual listening was not performed. The terminal-support trace now explains the target symptoms across the 22 seed bundle, but final repair-pass downgrade still needs a separate focused review before any repair is removed.
