# Endless Program Terminal Stretta Planner

Status: planned.

This plan follows the current coda diagnostics and [Endless Program Coda Historical Ending Review](../reviews/endless-program-coda-historical-ending-review.md).

## Problem

The current `endless-program` coda is terminally safe but can still sound appended. It reserves a terminal section, summarizes recent context, and chooses a coda archetype, but it does not yet plan a convincing end-directed fugal process. The result can behave like a prepared cadence added after the continuation, rather than like the continuation has been aiming toward its ending.

The most important style gap is terminal stretta. In common-practice fugal endings, a final subject return, stretto, pedal-supported entry, or combined subject treatment often makes the close feel earned. Fugematon currently treats `stretto-compaction` as one archetype among several, selected mostly from recent state and contour energy. For a fugal `endless-program` ending, terminal stretta should be the primary planned goal when the subject can support it, not only a local texture option.

## Goal

Add a coda-specific planner for `endless-program` that builds the last span backward from the terminal cadence.

The planner should choose a terminal process before note realization:

* preferred: terminal stretta with two or more overlapping subject or answer fragments leading into the cadence;
* strong alternative: final subject or answer fragment over a root/final pedal;
* compact alternative: invention-like final imitation or echo when available duration or texture cannot support stretta;
* fallback: cadence-only closure, explicitly review-visible and not treated as full fugal coda success.

## Scope

* Introduce a `TerminalCodaPlan` or equivalent planner surface separate from note realization.
* Plan coda function, entry order, fragment voices, overlap spacing, pedal role, cadence target, and release shape before emitting notes.
* Make terminal stretta the default strict-classical fugal goal when duration, subject stem, register, and dissonance checks allow it.
* Keep modal endings modal: terminal stretta may target modal final and characteristic tones without forcing tonal authentic-cadence rhetoric.
* Preserve `continuous-fugue` hidden-boundary semantics and `regenerative-cycle` bridge-compatible closure.
* Keep sparse echo and cadence-only endings review-visible instead of letting them count as strong historical closure.

## Out Of Scope

* Requiring the same terminal stretta formula for every seed.
* Making every `endless-program` ending longer than the reserved terminal span.
* Turning historical examples into fixed measure-count thresholds.
* Promoting subjective terminal rhetoric directly to CI-blocking status before listening and false-positive review.

## Workstreams

### EPSP-A: Terminal plan model

Create a small terminal coda planning model with explicit fields:

* `terminalProcess`: `terminal-stretta`, `final-subject-over-pedal`, `compact-final-imitation`, `cadential-echo`, or `cadence-only-fallback`;
* `entryVoices` and `supportVoices`;
* subject or answer fragment degrees;
* overlap spacing in beats;
* pedal voice and target degree when present;
* cadence preparation and final release ticks;
* reason when stretta is unavailable.

### EPSP-B: Stretta-first selection

Select `terminal-stretta` when:

* the reserved coda duration can fit at least two overlapping fragments plus cadence release;
* the subject stem has at least three usable degrees;
* entry spacing avoids immediate unresolved seconds/sevenths at the overlap points;
* registers avoid crossing and exposed exact unison;
* the final cadence can still land with low root/final support.

If stretta fails, choose the strongest available alternative and record why.

### EPSP-C: Note realization

Replace direct archetype note construction with realization from the terminal plan. The realization should preserve subject-derived motivic metadata on stretta voices and keep cadence figures or pedal support in subordinate voices.

The generated coda should sound like a final contrapuntal event followed by a cadence, not like a cadence preparation with decorative fragments.

### EPSP-D: Diagnostics

Extend `terminalClosureReview.codaContinuity` or add a sibling summary with:

* terminal process id;
* stretta candidate availability;
* stretta rejection reason;
* subject or answer fragment overlap count;
* overlap interval safety summary;
* pedal role;
* final release shape;
* whether the coda is full fugal closure, compact closure, or fallback closure.

### EPSP-E: Review Evidence

Review at least the existing 22 coda seeds and the 5 sparse echo seeds:

* `lyrical-line`;
* `modal-dorian`;
* `close-imitation`;
* `contrary-motion`;
* `angular-answer`.

The target is not 22 / 22 terminal stretta. The target is that every non-stretta ending has a musical reason, and that cadence-only or sparse echo endings are clearly marked as compact or fallback closure.

## Completion Conditions

* The coda generation path has an explicit terminal coda plan before note realization.
* Terminal stretta is the preferred fugal ending process when constraints allow it.
* Generated diagnostics distinguish full fugal closure from compact or fallback closure.
* The 22 seed review keeps terminal cadence safety: accepted closure, root/final support, stable outer voices, 0 unresolved terminal-boundary dissonance, and 0 final-attack re-entry voices.
* Sparse echo seeds either gain a stronger terminal process or remain review-visible with a recorded reason.
* Human listening gap remains explicit until terminal rhetoric and release timing are heard.
