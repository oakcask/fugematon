# Phase 13Y Entry-Continuity Generalization Review

This planning review records why entry-boundary continuity should be generalized after Phase 13X rather than kept as a bass-specific rule.

Evidence basis: Phase 13W completion evidence for post-exposition bass entries, Phase 13X first-bass-entry review evidence, and the project model note that the current exposition order is an implementation choice rather than a music-theory rule.

Source family basis: Fux/species counterpoint for line independence, oblique motion, preparation, suspension, and resolution; common-practice fugue for exposition pacing, answer rhetoric, counter-subject continuity, and the possibility of varied entry order. Specific editions were not rechecked in this planning pass, so the theory basis remains source-family level.

## Findings

### 1. The confirmed blocker is bass-local, but the musical rule is not

Affected evidence: Phase 13X confirms that the current 22 seed bundle places the exposition bass answer at quarter 12 and resets the three outside voices together. Phase 13W confirms that post-exposition bass-entry resets were also a real generator pattern.

Musical judgement: these are valid blockers, but they do not prove that bass is uniquely special. The deeper rule is that an important entry should not mechanically cut the already-entered contrapuntal fabric unless the score prepares a cadence, tutti gesture, or other collective articulation.

Project response: keep Phase 13X narrow so it repairs the confirmed first-bass-answer defect. Add Phase 13Y immediately afterward to generalize diagnostics, support candidates, and scoring by entry role and entry order.

### 2. A bass-only diagnostic would become fragile when entry order changes

Symptom risk: if a future generator starts the subject in another voice order, the same synchronized outside-voice reset could appear at a soprano, alto, or tenor entry while first-bass-specific fields still look clean.

Current diagnostics coverage: Phase 13X exposes first-bass-entry evidence separately from post-exposition bass-entry evidence, which fixes the current blind spot. It does not yet prove that non-bass entries or alternate exposition orders are reviewed with the same continuity standard.

Project response: Phase 13Y should expose entry-continuity windows keyed by `entryVoice`, `entryOrderIndex`, `sectionState`, `entryForm`, and already-entered voices. The review question becomes whether an entry preserves line agency, not whether the entering voice is bass.

### 3. This remains distinct from solo texture and functional thinning

Symptom risk: a synchronized entry-boundary reset can occur while three or four voices are active, so active voice count alone can miss it. Conversely, a true one-voice tenor passage can be a `soloTexture` or `functionalThinning` issue even when it is not an entry-boundary reset.

Project response: keep `soloTexture` and `functionalThinning` for density and function of thin passages. Use generalized `entryBoundaryContinuity` for entry-local line continuity: outside voices ending at the entry, carried voices, suspensions, resolutions, delayed support, staggered continuation, and prepared collective articulation.

### 4. Structural hypothesis

Symptom: important entries can sound mechanically inserted when already-entered voices cut and restart together.

Repeated pattern: confirmed for current bass-entry windows; plausible for future non-bass or alternate-order entries unless the model is generalized.

Theory basis: fugue texture should balance entry clarity with ongoing line agency. Prepared collective articulation is allowed, but unprepared synchronized reset is weak counterpoint.

Evidence strength: confirmed for bass-entry windows, plausible for generalized entry-order risk. No new generated bundle was produced for non-bass entry windows in this planning pass.

Project response: generator, scoring, and diagnostics change in Phase 13Y. Phase 8 remains deferred until generalized score-window evidence and focused listening notes are recorded.

## Phase 13Y Plan

Insert [Phase 13Y](../phases/phase-13y.md) after Phase 13X and before Phase 8.

Completion conditions:

* generalized entry-continuity windows exist for important subject and answer entries;
* non-bass entries are included in focused score-window review;
* the first-bass-answer repair remains intact;
* prepared collective articulation is distinguished from mechanical reset;
* focused `organ-default` and `strict-counterpoint` listening notes cover both repaired bass-entry and non-bass entry-continuity examples.

## Open Gaps

This is a planning review, not a new generated-evidence pass. Non-bass entry-window review, alternate entry-order stress cases, and focused listening remain Phase 13Y work.
