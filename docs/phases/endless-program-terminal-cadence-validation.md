# Endless program terminal cadence validation

Status: planned.

This plan turns `endless-program` from a defined playback semantic into a validated Web UI experience. The first question is not whether the UI can queue another segment, but whether the generator can make a segment end like a piece. If terminal closure is weak, the generator and diagnostics must be repaired before the UI hides the problem behind automatic playback.

## Goal

Validate that an `endless-program` segment can end with a musically meaningful cadence, then implement a UI path that plays multiple terminal segments in sequence.

`continuous-fugue` remains the mode for hidden boundaries and non-terminal continuation. `endless-program` requires audible boundaries and terminal cadence evidence for each segment.

## Musical Closure Review

Add a focused closure review surface before changing the playback loop. The review should inspect the last two to four measures of each segment and classify the boundary as accepted, review-required, or generator-response-required.

This is a generator and diagnostics gate, not a UI polish step. The current playback-mode contract says `endless-program` requires terminal cadence evidence, but score generation still needs an explicit terminal-closure intent before it can reliably reserve and validate a final cadence section.

Minimum evidence:

* A terminal cadence target exists near the segment end and is marked as authentic or modal.
* Half, deceptive, evaded, or modulatory cadence labels are not accepted as terminal closure by default. They remain review-required unless the review helper records an explicit terminal function and a stable final sonority.
* Bass or another low voice supports the terminal sonority rather than leaving an unrooted ending.
* Outer voices land on stable chord tones or mode-appropriate final tones.
* Leading tones, sevenths, strong accented clashes, and entry-local dissonances do not remain unresolved at the boundary.
* Texture thinning near the end is explained by cadence, prepared reduction, suspension, pedal, echo, or phrase closure, not unsupported collapse.
* Any all-voice rest or gap after the terminal sonority is classified as a piece boundary, not a silence failure.

The helper should expose a `TerminalClosureReviewSummary` from core diagnostics. At minimum, it should include schema version, segment index, inspected tick range, terminal cadence kind, cadence target tick, low-voice support, outer-voice landing status, unresolved boundary dissonance count, thinning explanation, final rest classification, classification, and representative windows or reasons. Worker and UI review snapshots should carry the summary status so weak closure cannot be hidden by fallback, silence, or playback smoothing.

Initial review seeds:

* `fugue-smoke` as the default representative.
* `modal-cadence` and `sparse-cadence` as cadence stress cases.
* `dense-modal` as a density and modal-color stress case.
* `tight-stretto` and `circle-fifths` as entry and harmonic-pressure stress cases.
* A small subset of the current readiness seed set as controls.

Record concrete findings in `../reviews/endless-program-terminal-cadence-review.md`. If the review changes diagnostics scope, classify the affected signals through `../reference/quality-metrics/ci-review-scope.md`.

## Implementation Route

1. Add `mode` or an equivalent terminal-closure intent to the core generation input. `continuous-fugue` should keep non-terminal continuation semantics, while `endless-program` should request terminal closure.
2. Add a terminal segment closure review helper in core and expose its `TerminalClosureReviewSummary` through `GenerationDiagnostics`.
3. Generate the focused seed set without changing generator behavior and classify whether current segment endings are accepted, review-required, or generator-response-required.
4. Treat generator-response-required endings as a blocker for UI chaining. Repair section planning, harmonic planning, candidate scoring, or final texture generation before UI work.
5. Add focused tests for authentic, modal, half, deceptive, evaded, unsupported-thinning, and final-rest boundary cases.
6. Add `mode` to the Web Worker request and response path.
7. Use `endless-program` mode in the worker when selected, preserving deadline, fallback records, and terminal closure status.
8. Add a Web UI mode selector for `continuous fugue` and `endless program`.
9. For `endless program`, prefetch the next segment while the current segment plays, then start it after a short audible boundary.
10. Show segment index, generation status, deadline result, fallback status, and terminal closure status so fallback or weak closure remains visible.

## Generator Repair Scope

If terminal closure fails, prefer structural repair over seed-specific patches.

Likely repair points:

* Reserve a cadence-oriented final section for `endless-program` segments.
* Bias or require final harmonic plans toward a terminal cadence target.
* Prevent the final section from ending on half, deceptive, evaded, or unresolved modulatory motion unless the segment is explicitly classified as review-required rather than accepted.
* Score final bass and outer-voice landings as cadence evidence.
* Penalize unresolved dissonance, unsupported thinning, and weak bass support at the boundary.
* Keep modal cadence acceptance separate from tonal authentic cadence acceptance.

Do not hard-code repairs to one seed, key, time signature, pitch name, cadence label, measure, or voice. Preserve any reported seed as regression evidence and verify at least one related seed or control.

## Completion Conditions

* `endless-program` closure review exists and classifies terminal boundaries from ScoreEvent data.
* Core generation can receive `continuous-fugue` versus `endless-program` intent, and tests show the intent changes only terminal-boundary behavior.
* The focused seed review is recorded before UI playback is accepted.
* Current generator behavior is either accepted with evidence or repaired with before/after evidence.
* Web Worker requests carry the selected infinite playback mode instead of hard-coding `continuous-fugue`.
* Web UI can select `continuous fugue` or `endless program`.
* `endless program` can play at least two generated segments in sequence with an audible boundary.
* Each played `endless-program` segment exposes terminal closure status, deadline result, and fallback status.
* `continuous-fugue` still avoids terminal cadence requirements and preserves hidden-boundary semantics.
* Existing review signals from Phase 8 and Phase 9 remain visible and are not masked by boundary silence, playback smoothing, fallback, or UI presentation.

## Out Of Scope

* Full `regenerative-cycle` UI.
* AudioWorklet, OffscreenCanvas, SharedWorker, or Service Worker changes.
* Human preference testing as a blocker. Human listening remains useful follow-up after score evidence passes.
* New third-party playback or scheduling dependencies.
