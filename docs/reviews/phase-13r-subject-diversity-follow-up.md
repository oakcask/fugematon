# Phase 13R Subject Diversity Follow-Up

This review records the Phase 13R follow-up repair for seed-crossing initial subject similarity. It uses score diagnostics and generated review bundles as the agent-side music-theory review evidence required before returning to Phase 8/9.

## Findings

### 1. Initial subjects no longer collapse into three families

Before the repair, the 22 seed review set selected only three top initial subject degree families. The largest families were `0-2-1-3-4-3-2-1` on 10 seeds, `0-1-2-3-4-3-1-2` on 9 seeds, and `0-1-2-3-4-3-2-1` on 3 seeds.

After the repair, the same 22 seed set reports 4 initial subject families. The largest family share is 0.318, down from 0.455. Top subject-fragment family share is 0.409. `subjectFamilyDiversity.findings` is empty.

Theory basis: fugue subjects should remain recognizable, but a generated corpus should not make many unrelated seeds start from the same small vocabulary. The new variant keeps a tonic opening and a fourth/fifth-area climax while varying upper-neighbor motion before the climax. Broader leap and cadential-tail candidates were rejected in this pass because they increased leap-recovery and local-sentinel review signals too much for this repair slice.

Project response: `buildSubject` now chooses one additional guarded upper-neighbor shape on the adopted planner path. The review bundle summary is schema version 13 and includes `subjectFamilyDiversity`; A/B summaries are schema version 3 and include subject-family deltas.

### 2. Hard constraints and Phase 7B readiness remain intact

The generated 22 seed review bundles for `organ-default` and `strict-counterpoint` both report:

* hard constraint failures: 0;
* Phase 7B readiness: 22/22;
* effective selection model: `phase10-section-local-planner`;
* unique initial subject families: 4;
* top initial subject family share: 0.318;
* top subject-fragment family share: 0.409.

Quality-vector local sentinel count is 386. This is a review signal count, not a hard failure. It is higher than the automatic baseline recorded before this follow-up, so it remains a focused playback-review risk rather than a completed musical acceptance claim. No new hard failure, readiness loss, subject identity loss, answer-plan failure, or unresolved dissonance appears in the review bundle evidence.

### 3. Focused convergence seeds improve, but still need human playback review

The focused Phase 13R seed sweep (`bach-001`, `fugue-smoke`, `modal-cadence`, `dense-modal`, `angular-answer`, `modal-answer`, `minor-entry`, `sparse-cadence`, `random-listen-check`) reports 4 top subject families across 9 seeds, hard constraint failures 0, and top family share 0.444.

Agent-side score review did not find a new counterpoint, harmony, rhythm, texture, or form blocker in the generated diagnostics. The concentrated focused-family result is a residual review signal, not a completed human listening pass. The generated `organ-default` and `strict-counterpoint` review bundles include the MIDI files and `listening-review.json` templates needed for playback judgement, but no human manual listening judgement has been entered in source.

## Handoff

This repair completes the automated subject-diversity detector and generator-side diversity response. It does not honestly close the human focused listening requirement by itself. Phase 8/9 should resume only after a human or playback-capable reviewer fills the focused `organ-default` and `strict-counterpoint` listening notes, or the Phase 13R requirement is explicitly revised to accept agent-side score review as the completion evidence.
