# Endless program terminal coda historical style repair

Status: complete.

This plan follows [Endless program terminal coda planning](endless-program-terminal-coda-planning.md). The completed coda work moved `endless-program` away from a one-beat terminal sonority override, but the current coda generator still has a narrow phrase model: each voice receives fixed preparation degrees and then a fixed final sonority. In practice that can sound like the segment ignores the previous musical character and turns into all-voice long tones.

## Reported Symptom

Human feedback: in `endless-program`, the generated coda ignores the previous style and turns into long tones in all voices.

Interpretation for review: the problem is not only cadence acceptance. The ending may satisfy `TerminalClosureReviewSummary` with root support, stable outer voices, and prepared re-entry while still failing as a continuation of the preceding fugue texture. A natural terminal span needs a visible ending process, not only an acceptable last chord.

Likely structural cause: `buildTerminalCodaNotes` currently builds a generic coda from fixed scale degrees, fixed voice order, and long preparation durations. It does not inspect the preceding section's subject fragment, counter-subject behavior, rhythmic activity, texture density, local mode, or whether the piece was moving by stretto, episode, sequence, pedal, or cadence figure before the reserved coda.

## Historical Reference Findings

Source-family basis: `historical-fugue-endings` and claim `endless-program-coda-continuity` in [../reference/bibliography/claim-map.md](../reference/bibliography/claim-map.md).

Checked examples and implications:

* BWV 846: the analysis records a subject-saturated fugue where the subject is absent only in one earlier measure and the final two measures. Implication: a subject-free final liquidation can work when it releases clearly established subject continuity, not when it replaces unrelated preceding material with generic long tones.
* BWV 847: the final subject returns at original pitch over a bass pedal point, with fuller chordal support near the end. Implication: a held low voice can be idiomatic, but it should support a final entry or cadence process while other voices retain functional motion.
* BWV 851: the last episode uses inverted motive material, leads to final stretto, and the final measures present motive forms doubled in thirds. Implication: density and doubling can signal closure when they intensify thematic work rather than freeze all voices.
* BWV 861: the final episode leads into repeated subject presentations, including stretto. Implication: a terminal coda can be energetic and entry-driven; long final values should be the landing after compaction, not the whole coda.
* Prykhodko's WTC ending study identifies ending signals such as texture compaction, added voices, delayed or split voices, and new voices carrying noticeable thematic load. Implication: added voices should have thematic or cadential function before the final attack; adding all voices as static support is weak evidence.

Working conclusion: the generator needs multiple terminal-coda archetypes selected from recent score context. The final held sonority remains useful, but only as the end of a process whose preceding beats still sound related to the segment.

## Goal

Make `endless-program` terminal coda generation preserve the preceding musical character while producing a stable final cadence.

The coda should choose a context-aware ending process:

* final subject or answer fragment in tonic / modal final;
* final stretto-like compaction when recent material supports entry overlap;
* pedal-supported final entry or cadence figure;
* thematic liquidation from recent subject, counter-subject, episode, or cadence material;
* prepared texture compaction with added or delayed voices that carry motivic or cadential function.

The normal successful path should avoid all voices entering or sustaining generic long tones for the whole reserved coda. A final held sonority is allowed at the cadence target, and a bass pedal may be longer when other voices remain active or thematic.

## Scope

* Add a terminal-coda context summary derived from the last pre-coda section: recent subject stem, counter-subject stem, rhythmic cell, cadence figure, active voice count, texture density, contour energy, local key/mode, and recent state sequence.
* Replace the single fixed `buildTerminalCodaNotes` recipe with a small set of deterministic coda archetypes chosen by the context summary.
* Keep `TerminalClosureReviewSummary` as the cadence safety surface, but extend it or add a sibling terminal-coda continuity review that can detect all-voice long-tone preparation, missing recent-material derivation, and unearned texture freeze.
* Keep `continuous-fugue` hidden-boundary semantics unchanged.
* Keep `regenerative-cycle` bridge-compatible closure separate from self-contained `endless-program` coda behavior.

## Out Of Scope

* Requiring literal Bach-style endings for every style profile.
* Banning final long notes, final rests, pedal points, Picardy-like modal/tonal color, or prepared full-voice terminal chords.
* Rewriting the full fugue planner, subject generator, or Web UI playback loop.
* Fixing one seed, pitch, key, time signature, voice, or measure as a special case.
* Promoting subjective ending beauty directly to CI-blocking status before false positives are reviewed.

## Workstreams

### EPCH-A: Baseline score-window review

Generate focused `endless-program` endings before changing generation. Review the last four measures and classify:

* all-voice long-tone span before the terminal attack;
* number of moving voices per beat inside the coda;
* whether any moving voice uses recent subject, counter-subject, episode, or cadence material;
* whether the bass is pedal, root support, or generic static support;
* whether texture compaction is staged or all voices freeze together.

Initial seeds: `fugue-smoke`, `modal-cadence`, `sparse-cadence`, `dense-modal`, `tight-stretto`, `circle-fifths`, `bach-001`, `minor-entry`, and at least one short-segment fallback control.

Record findings in `../reviews/` if they change acceptance criteria or diagnostics scope.

### EPCH-B: Terminal coda context summary

Add a planner-visible summary for the coda builder. It should read the existing score and section plans immediately before the coda reservation and expose:

* recent melodic/rhythmic cells by voice and role;
* recent entry or episode state;
* current density and moving-voice count;
* active bass function and whether a pedal is already implied;
* cadence kind, target mode, meter context, and available coda duration.

This summary should be deterministic and small enough to appear in diagnostics without exposing full score excerpts.

### EPCH-C: Context-aware archetypes

Implement a conservative archetype set:

* `final-fragment-entry`: one upper or middle voice carries a recognizable subject or answer fragment into the cadence while support voices move by shorter cadential figures.
* `stretto-compaction`: two or more voices overlap shortened subject fragments before the terminal landing when recent texture is entry-dense.
* `pedal-entry-cadence`: bass holds or repeats a root/final pedal while upper voices retain fragment or cadence motion.
* `liquidation-cadence`: recent material is shortened into cadence figures when the preceding section was already subject-saturated.
* `cadential-echo`: a sparse ending where one or two voices echo a fragment and other voices enter only as prepared final support.

Each archetype should reserve the last beat or final measure for stable landing but keep at least one non-bass voice moving with derivation evidence before the cadence target unless the coda is intentionally sparse and review-visible.

### EPCH-D: Diagnostics and scoring

Add review evidence for terminal-coda continuity:

* longest all-voice static span inside generated coda;
* longest non-terminal held span by voice;
* moving voice count before the cadence target;
* recent-material derivation count and top derivation source;
* coda archetype and selection reason;
* pedal classification: prepared pedal, cadence support, or generic static support.

Initial scope classification: `review-required`. Promote only narrow deterministic failures later, such as generated coda source with all voices static for the full prepared window and no recent-material derivation.

### EPCH-E: Tests and review evidence

Focused tests should prove:

* existing terminal closure acceptance still requires cadence target, root support, stable outer voices, and no unresolved boundary clash;
* normal-length `endless-program` uses a generated coda archetype, not fallback terminal closure;
* coda notes include recent-material or cadence-figure derivation before the final landing;
* a synthetic all-voice long-tone coda is classified as review-required or generator-response-required by the new continuity surface;
* short segments retain fallback behavior and report that full coda continuity was unavailable;
* modal cadence seeds keep modal closure and do not get forced into tonal authentic-cadence rhetoric.

Before completion, review at least one related variant or control so the repair is not tied to the user-reported seed or current voice order.

## Completion Conditions

* `endless-program` generated codas choose a context-aware terminal archetype instead of the single fixed all-voice preparation recipe.
* Focused seeds no longer show all voices sustaining generic long tones across the prepared coda window.
* At least one moving voice before the final landing carries recent material, cadence figure, or explicit echo/pedal function, unless the ending is intentionally sparse and review-visible.
* `TerminalClosureReviewSummary` still accepts only stable terminal closure, while the new or extended coda-continuity surface prevents stable final sonority from hiding style-disconnected coda material.
* Historical reference basis is traceable through `historical-fugue-endings` and `endless-program-coda-continuity`.
* `continuous-fugue` and `regenerative-cycle` mode boundaries remain unchanged.
* Any accepted regressions are documented as musical tradeoffs, not only metric deltas.

## Completion Record

Implemented context-aware terminal coda generation for `endless-program`. The coda builder now derives a compact `terminalCodaContext` from the pre-coda score window and section plans, including recent state sequence, subject stem, rhythmic cell, texture density, contour energy, mode, cadence kind, and pedal implication. It selects one of `final-fragment-entry`, `stretto-compaction`, `pedal-entry-cadence`, `liquidation-cadence`, or `cadential-echo` instead of using the previous fixed all-voice preparation recipe.

`TerminalClosureReviewSummary` schema version 3 keeps the cadence safety checks from schema version 2 and adds `codaContinuity` evidence. The coda-continuity surface now uses schema version 2 and includes selected archetype and reason, longest all-voice static span, longest non-terminal held span, moving voice count before cadence, derivation count, subject-derived note count, pedal root coverage ratio, historical function coverage, top derivation source, and pedal classification. A synthetic stable all-voice long-tone coda is now `review-required`, so stable terminal sonority alone cannot hide missing recent-material or cadence-function evidence.

Focused generated evidence for `fugue-smoke`, `modal-cadence`, `sparse-cadence`, `dense-modal`, `tight-stretto`, `circle-fifths`, `bach-001`, and `minor-entry` reports accepted terminal closure, generated coda source, prepared voice re-entry, root-supported final landing, stable outer voices, zero unresolved boundary dissonance, accepted coda continuity, and at least one moving pre-cadence voice with derivation evidence. The focused set selected several archetypes, including `stretto-compaction`, `cadential-echo`, and `liquidation-cadence`, with source-family rationale still traced through `historical-fugue-endings` and claim `endless-program-coda-continuity`.

Mode boundaries remain unchanged: short `endless-program` segments keep fallback terminal-boundary safety, `continuous-fugue` remains `not-required` for terminal closure and receives no self-contained coda, and `regenerative-cycle` remains bridge-compatible rather than adopting self-contained `endless-program` coda behavior. No accepted metric regressions were introduced in the focused review; human listening of cadence rhetoric and release timing remains a review gap rather than a CI-blocking gate.

Completion refresh: the TARGET focused seeds were regenerated and compared against the TARGET baseline artifacts. The baseline had cadence-stable schema version 2 evidence but no coda-continuity surface or planner-visible `terminalCodaContext`; the refreshed output uses schema version 3, selects `liquidation-cadence`, `stretto-compaction`, and `cadential-echo` across the focused set, reports accepted `codaContinuity` with nonzero derivation evidence, and keeps hard constraint failures at 0. The short fallback control remains fallback-only and review-visible. See [Endless Program Terminal Coda Review](../reviews/endless-program-terminal-coda-review.md) for the seed-by-seed comparison.
