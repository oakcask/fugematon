# Endless Program Coda Quality Gap Review

This review checks the current `endless-program` coda against a broader historical ending model: WTC fugues, inventions, chorales, and Art of Fugue-style fugal writing. It extends the earlier terminal-coda completion review from "does a generated coda exist and close stably?" to "does the coda behave like historically plausible ending rhetoric?"

## Findings

The current generated coda is structurally stable across the 22 representative, boundary, review, rotation, and adversarial seeds checked at 30720 ticks in `endless-program`. Every seed reports `terminalClosureReview.classification: "accepted"`, `terminalClosureSource: "generated-coda"`, prepared voice re-entry, root-supported low voice, stable outer-voice landing, zero unresolved boundary dissonances, and zero hard failures for range, crossing, subject identity, and answer plan.

The musical gap is narrower than the older failure but still real: the coda vocabulary is overconcentrated in three archetypes and does not yet show enough historically distinct closing processes. Of the 22 seeds, 12 use `stretto-compaction`, 5 use `liquidation-cadence`, and 5 use `cadential-echo`. No seed in this pass used `final-fragment-entry` or `pedal-entry-cadence`. Most pre-cadence derivation is `answer-form` or `prior-episode-figure`; only `tight-stretto` exposes `subject-head` derivation in the terminal span.

Historical basis: WTC and Art of Fugue examples support final subject return, stretto, simultaneous subject combination, pedal support, texture compaction, and thematic liquidation as ending signals. Inventions support compact two-voice endings that still carry subject, episode, or canonic continuity. Chorales support plain final harmonic closure, but as a different genre: the closure burden is strong V-I voice leading, phrase-ending melody, and often Picardy-third behavior in minor, not fugal subject rhetoric.

## Historical Reference Pass

WTC fugue evidence remains valid but is not enough by itself. Prykhodko's WTC ending study identifies ending signals including texture compaction, added or delayed voices, splitting, and thematic load. The existing WTC examples in the coda review cover final episodes, final stretto, motive doubling, final subject over pedal, and subject-dense closing.

Art of Fugue evidence broadens the target. The teoría analysis of Contrapunctus V describes a fugue organized around stretto permutations; the final measures end with simultaneous presentation of both subject forms. This supports a coda target where the final span can combine subject identities rather than merely reuse generic answer-form fragments.

Invention evidence adds a small-form control. The teoría overview classifies BWV 772-786 into single-subject, double-subject, and canonic designs, with fugue-like episodes in the subject-based inventions. This argues against requiring a long WTC-scale coda for every generated ending, but it still requires the short close to remain connected to recognizable contrapuntal material.

Chorale evidence sets the lower boundary for acceptable plain closure. De Clercq's Bach chorale corpus study reports that final chorale cadences overwhelmingly close in tonic with perfect-authentic behavior, and minor-key final tonic cadences strongly favor Picardy-third major endings. Burridge's pedagogical chorale cadence summary also emphasizes root-position V-I, decorated passing sevenths, the Bach third, and Picardy-third final cadences. This supports the current root-supported final sonority, but it does not justify a fugal coda that lacks subject, stretto, pedal, or liquidation evidence.

## Generated Evidence

Seed set: `bach-001`, `fugue-smoke`, `minor-entry`, `wide-key`, `lyrical-line`, `modal-dorian`, `circle-fifths`, `close-imitation`, `sparse-cadence`, `bright-answer`, `dark-episode`, `ornament-test`, `long-arc`, `contrary-motion`, `restless-line`, `tight-stretto`, `quiet-cadence`, `angular-answer`, `modal-answer`, `modal-cadence`, `contrary-answer`, and `dense-modal`.

Summary:

| Evidence | Result |
| --- | --- |
| Accepted terminal closure | 22 / 22 |
| Generated coda source | 22 / 22 |
| Prepared voice re-entry | 22 / 22 |
| Final-attack re-entry voices | 0 in every seed |
| Root-supported low voice | 22 / 22 |
| Stable outer-voice landing | 22 / 22 |
| Unresolved boundary dissonances | 0 in every seed |
| Pre-cadence moving voices | 4 in every seed |
| Pre-cadence derivation count | 10-22 notes per seed |
| `stretto-compaction` | 12 / 22 |
| `liquidation-cadence` | 5 / 22 |
| `cadential-echo` | 5 / 22 |
| `final-fragment-entry` | 0 / 22 |
| `pedal-entry-cadence` | 0 / 22 |

Representative score-window reading:

* `fugue-smoke`: accepted `liquidation-cadence`; 20 derived pre-cadence notes, all four voices moving, longest all-voice static span 480 ticks. This is the strongest current model for phrase-level coda continuity.
* `bach-001`, `circle-fifths`, `sparse-cadence`, `modal-cadence`, and `dense-modal`: accepted `stretto-compaction`; 22 derived pre-cadence notes, all four voices moving, but the same answer-form-heavy recipe recurs.
* `modal-dorian`, `dark-episode`, `ornament-test`, `quiet-cadence`, and `tight-stretto`: accepted `cadential-echo`; 10-11 derived pre-cadence notes, all four voices moving, zero all-voice static span, but a 960-tick non-terminal held span. These are acceptable as sparse endings, but they need listening review for whether they sound like rhetorical close or merely a short echo before the cadence.

## Quality Gap

Current coda quality is no longer blocked by final-chord weakness, sudden all-voice re-entry, or static long tones. The remaining gap is historical specificity and variety:

* Missing final subject return: no reviewed seed chose `final-fragment-entry`; subject-head evidence appears in only one seed.
* Missing pedal-supported close: no reviewed seed chose `pedal-entry-cadence`, despite pedal-supported final entries being a common fugal ending strategy.
* Overreliance on answer-form derivation: many codas are accepted because they derive from answer-form fragments, but historical endings often make the subject, countersubject, or combined subjects rhetorically audible near the final cadence.
* Sparse coda rhetoric needs listening: `cadential-echo` passes the score-window checks, but a short echo can still sound lightweight next to Art of Fugue or WTC ending models unless the cadence timing and release make the phrase feel intentional.
* Chorale-style closure is not enough for fugal style: the current root-supported V-I or modal final landing satisfies the chorale-like closure floor, but fugal terminal quality should additionally prove thematic or contrapuntal closure.

## Structural Hypothesis

Hypothesis: current archetype selection is biased toward local texture/contour summaries rather than ending-function diversity. When recent texture is dense or energetic, the coda tends to `stretto-compaction`; when it is subject-return dense, it tends to `liquidation-cadence`; when sparse, it tends to `cadential-echo`. That explains stable, accepted endings, but it under-selects terminal processes that require an explicit final subject/pedal goal.

Evidence strength: plausible. The 22-seed pass confirms the distribution pattern, but it does not prove whether candidate generation lacks final-fragment and pedal options or whether selection scoring rejects them.

Project response: review-required generator/scoring follow-up. Add a focused review that forces or rewards `final-fragment-entry` and `pedal-entry-cadence` candidates on representative major, minor, modal, sparse, and stretto-heavy seeds, then compare score-window evidence and listening notes.

## CI / Review Scope

Touched metric: `terminalClosureReview.codaContinuity`.

Classification: `review-required`.

Reason: the current deterministic diagnostics confirm structural closure and expose the historical-style gap, but archetype diversity and rhetorical cadence quality are not hard failures. They need score-window review plus listening before any threshold can become CI-blocking.

Action: keep current terminal-closure checks as passing completion evidence; add a follow-up review bundle for terminal archetype diversity and manual listening of sparse echoes, final subject returns, and pedal-supported closes.

Evidence gaps:

* No human listening pass was performed.
* This pass used generated diagnostics and score events, not a bar-by-bar edition check of every cited historical score.
* The current CLI does not expose `mode: "endless-program"` directly, so the focused review used direct core generation rather than `pnpm fugematon review`.

## After-Pass

The repair pass regenerated the same 22 seed set at `30720` ticks in `endless-program`. Score-event diagnostics remain stable while the coda vocabulary is broader: accepted terminal closure is 22 / 22, unresolved boundary dissonance is 0, final-attack re-entry voices are 0, and every seed still reports `terminalClosureSource: "generated-coda"`.

Archetype distribution after repair:

| Archetype | Count |
| --- | --- |
| `stretto-compaction` | 11 / 22 |
| `final-fragment-entry` | 4 / 22 |
| `pedal-entry-cadence` | 2 / 22 |
| `cadential-echo` | 5 / 22 |

`terminalClosureReview.codaContinuity` is now schema version 2. It preserves existing fields and adds `subjectDerivedNoteCount`, `pedalRootCoverageRatio`, and `historicalFunctionCoverage`. The 22 seed pass reports subject-derived coda notes in 17 seeds. Both `pedal-entry-cadence` seeds have `pedalRootCoverageRatio: 0.56`, `movingVoiceCountBeforeCadence: 4`, and `historicalFunctionCoverage` including `pedal-supported`.

Focused controls also passed: short `endless-program` remains `fallback-terminal-closure`; `continuous-fugue` remains `not-required`; `regenerative-cycle` remains `bridge-compatible-closure`; `modal-cadence` and `dense-modal` keep modal terminal cadence rhetoric with no tonal cadence overuse warning.

Remaining gap: sparse `cadential-echo` codas still need human listening review before archetype diversity or echo weight becomes any stronger than `review-required`.
