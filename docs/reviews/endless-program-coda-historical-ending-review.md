# Endless Program Coda Historical Ending Review

This review checks the current `endless-program` coda against fetched historical ending evidence from WTC fugues, Bach inventions, and Art of Fugue analysis. It uses the existing bibliography claim `endless-program-coda-continuity` and source families `historical-fugue-endings` / `historical-terminal-cadences`.

## Findings

The current generated coda is accepted as terminal closure in all 22 reviewed seeds. The old hard failure is not present: every seed uses `terminalClosureSource: "generated-coda"`, reports root-supported closure, has 0 unresolved terminal-boundary dissonances, and has 0 final-attack re-entry voices. The coda is therefore no longer just a hidden playback boundary or a last-chord patch.

The remaining quality gap is rhetorical weight, not cadence safety. Historical endings usually make the end audible as an intensification, return, combination, pedal close, or liquidation of already important material. Current generated codas expose those functions in diagnostics, but the distribution is still narrow: `stretto-compaction` accounts for 11 / 22 seeds, `cadential-echo` for 5 / 22, `final-fragment-entry` for 4 / 22, and `pedal-entry-cadence` for only 2 / 22. The rarest historical functions, final subject return and pedal-supported close, are now reachable but still underrepresented.

Follow-up user feedback sharpens this gap: the current ending can still sound appended rather than like the real end of the fugue. That points to a coda-specific planner, not just better archetype weighting. For a fugal `endless-program` ending, terminal stretta should be the preferred planned ending process when the subject, duration, register, and dissonance checks allow it.

Sparse `cadential-echo` endings remain the highest-risk accepted case. They are structurally prepared and cadence-stable, but 5 seeds have 0 subject-derived coda notes and rely mainly on cadence-figure echo or liquidation. That can be historically plausible in compact invention-like writing, but it needs listening review before it should count as strong fugal ending rhetoric.

## Historical Ending Model

WTC fugues support several ending behaviors rather than one fixed coda shape. The fetched WTC ending sources describe final subject return, final stretto, motive inversion or doubling, pedal-supported final subject, texture compaction, added or delayed voices, and thematic load as ending signals. The important implication for Fugematon is that a stable final sonority is necessary but insufficient: the terminal span should still carry thematic, cadential, textural, or pedal function.

Art of Fugue evidence raises the bar for contrapuntal closure. The fetched Contrapunctus V analysis describes a stretto-saturated design whose final measures combine subject forms. This supports `stretto-compaction` as a valid generated archetype, but only when the overlap reads as subject combination or compaction rather than a generic dense texture.

Inventions are a useful lower-scale control. The fetched invention overview classifies the pieces as single-subject, double-subject, or canonic compact designs. That argues against forcing every generated coda into a long WTC-scale ending, while still requiring audible connection to subject, episode, echo, or canonic/cadential continuity.

Chorale cadence evidence remains a floor, not the target. Bach chorale cadence sources support strong root-position final closure and Picardy-like final major behavior in minor contexts, but chorale-style final harmony does not prove fugal coda quality without thematic or contrapuntal ending function.

## Generated Evidence

Review setup: 22 representative, boundary, rotation, and adversarial seeds generated at `FUGUE_FORM_REVIEW_LENGTH_TICKS` in `endless-program`.

| Evidence | Current result |
| --- | ---: |
| Accepted terminal closure | 22 / 22 |
| Generated coda source | 22 / 22 |
| Unresolved terminal-boundary dissonance | 0 |
| Final-attack re-entry voices | 0 |
| Seeds with subject-derived coda notes | 17 / 22 |
| `stretto-compaction` | 11 / 22 |
| `final-fragment-entry` | 4 / 22 |
| `pedal-entry-cadence` | 2 / 22 |
| `cadential-echo` | 5 / 22 |

Pedal-supported seeds: `dark-episode`, `dense-modal`. Both report `pedalRootCoverageRatio: 0.56`, moving voices before cadence, and `historicalFunctionCoverage` including `pedal-supported`.

Sparse echo seeds: `lyrical-line`, `modal-dorian`, `close-imitation`, `contrary-motion`, `angular-answer`. These are accepted and have prepared motion before the cadence, but each has `subjectDerivedNoteCount: 0`; they should remain review-required until cadence release and echo rhetoric are heard.

Representative readings:

* `minor-entry`, `quiet-cadence`, `modal-answer`, and `contrary-answer` use `final-fragment-entry`, with 11 subject-derived coda notes and 4 moving voices before cadence. These are closest to the WTC final-subject-return target.
* `bach-001`, `fugue-smoke`, `wide-key`, `sparse-cadence`, `bright-answer`, `ornament-test`, `long-arc`, `restless-line`, and `modal-cadence` use `stretto-compaction`, with final-subject, liquidation, and stretto-combination functions. This is broadly aligned with WTC and Art of Fugue models, but the count shows selection bias toward this archetype.
* `dark-episode` and `dense-modal` use `pedal-entry-cadence`, which addresses the older gap where no reviewed seed selected a pedal-supported ending.
* `lyrical-line`, `close-imitation`, and `angular-answer` have high pedal coverage despite `cadential-echo`, but their historical function is weaker because subject derivation is absent.

## Quality Gap

1. Final-subject rhetoric is still too rare.

Affected seeds: the 18 seeds that do not select `final-fragment-entry`, especially the 5 sparse echo seeds with 0 subject-derived coda notes.

Theory basis: WTC examples and Art of Fugue practice make the ending feel earned through final subject return, stretto, or combined subject identity. Inventions allow brevity, but not total disconnection from contrapuntal material.

Current diagnostics detect part of the issue through `subjectDerivedNoteCount`, `historicalFunctionCoverage`, and `codaArchetype`. Project response: keep this review-required; increase preference for final subject or answer fragment when recent context contains usable subject-return material.

2. Terminal stretta is not yet planned as the normal fugal close.

Affected seeds: any seed where `stretto-compaction` appears only because recent density or contour energy triggered it, plus non-stretta accepted endings where no rejection reason is recorded.

Theory basis: WTC and Art of Fugue examples support final subject overlap, stretto, and subject combination as strong terminal rhetoric. This should not mean every ending must be stretto, but a strict-classical fugal ending should try terminal stretta first when constraints allow it.

Current diagnostics expose `stretto-compaction` but do not show whether a terminal stretta was attempted, rejected, or unavailable. Project response: add [Endless program terminal stretta planner](../phases/endless-program-terminal-stretta-planner.md), with explicit terminal process planning before note realization.

3. Pedal-supported closure is valid but underused.

Affected seeds: only `dark-episode` and `dense-modal` select `pedal-entry-cadence`.

Theory basis: WTC-style final subject over pedal and broader fugue cadence practice make a pedal close idiomatic when upper voices remain active. A bass pedal should not become all-voice stasis.

Current diagnostics detect the positive cases with `pedalRootCoverageRatio` and `pedal-supported`. Project response: add review coverage for medium-density authentic/modal endings where a pedal candidate is available but not selected.

4. Sparse cadential echo needs listening before acceptance is strengthened.

Affected seeds: `lyrical-line`, `modal-dorian`, `close-imitation`, `contrary-motion`, `angular-answer`.

Theory basis: compact invention endings can close briefly, and chorale evidence supports strong final harmony, but fugal coda quality still depends on audible rhetorical release. A short echo can sound intentional, or it can sound like the generator ran out of phrase material.

Current diagnostics confirm structural safety but not perceived weight. Project response: classify as `manual-listening`; do not promote sparse echo weight to CI-blocking or acceptance evidence without listening notes.

## Structural Hypothesis

Hypothesis: archetype selection still follows recent density and contour energy more strongly than end-directed terminal design. Dense or energetic recent material tends to choose `stretto-compaction`; sparse recent material tends to choose `cadential-echo`; only explicit subject-return or bass-support contexts trigger `final-fragment-entry` / `pedal-entry-cadence`. This can pass diagnostics while still sounding appended, because the generator has not planned a terminal stretta or final subject process as the goal of the last span.

Evidence strength: plausible. The 22 seed pass confirms the archetype distribution and the sparse-echo subject-derivation gap, but it does not prove whether candidate generation lacks alternatives or whether scoring rejects them.

Project response: generator-planner follow-up, not only scoring. Add a coda-specific terminal planner that attempts terminal stretta first, records rejection reasons, and then chooses final subject over pedal, compact final imitation, sparse echo, or cadence-only fallback.

## CI / Review Scope

Touched metric: `terminalClosureReview.codaContinuity`.

Classification: `review-required` for terminal process planning, archetype diversity, subject-derived coda evidence, and pedal-root coverage; `manual-listening` for sparse `cadential-echo` rhetorical quality.

Reason: deterministic diagnostics show closure safety and historical-function coverage, but they cannot prove whether the ending feels rhetorically satisfying.

Action: keep current terminal-closure checks passing; add the terminal stretta planner follow-up; keep coda historical-function diversity as review evidence; add listening notes for the 5 sparse echo seeds before changing acceptance policy.

Evidence gaps:

* No human listening pass was performed.
* Historical evidence was taken from cached and promoted references, not from a fresh bar-by-bar score edition review in this pass.
* The generated review used diagnostics and ScoreEvent summaries, not rendered audio release timing.
