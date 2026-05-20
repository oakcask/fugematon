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

### 3. Focused convergence seeds improve automatically, and the final follow-up repairs the confirmed blockers

The focused Phase 13R seed sweep (`bach-001`, `fugue-smoke`, `modal-cadence`, `dense-modal`, `angular-answer`, `modal-answer`, `minor-entry`, `sparse-cadence`, `random-listen-check`) reports 4 top subject families across 9 seeds, hard constraint failures 0, and top family share 0.444.

Agent-side score review did not find a new counterpoint, harmony, rhythm, texture, or form blocker in the generated diagnostics. That was incomplete evidence, not a completed human listening pass. Post-Phase-13R human playback feedback reported that similar structure and phrase material still recurred both within a score and across seeds. This meant the subject-diversity repair was insufficient as a musical closeout even though it improved the aggregate detector.

The same listening feedback reported abrupt three-part silence. This is a texture / form blocker when the silence is not explained by cadence, phrase boundary, or staged functional thinning.

Final repair evidence: the follow-up test seed set now reports no Phase 13R subject-fragment concentration findings and no abrupt texture drops. Across the full 22 seed set, hard constraint failures remain 0, Phase 7B readiness remains 22/22, unsupported solo runs and abrupt texture drops are both 0, and Phase 13R subject-fragment concentration findings are 0. Eleven subject-stem concentration findings remain as review signals for recognizable subject returns rather than mechanical episode-fragment recurrence.

Theory basis: fugue subjects must recur recognizably, but episodes should vary fragment role, contour, or direction enough that the continuation does not sound like the same filler cell. The repair therefore changes episode phrase material by phrase-density arc while leaving subject-return recurrence visible as a review signal. For texture, a solo upper voice can be effective at a cadence or phrase boundary, but a long upper solo created by three simultaneous rests before the boundary sounds like an unsupported drop; the repair adds functional support for those runs instead of treating the section ending alone as sufficient explanation.

Tradeoff: aggregate quality-vector local sentinels are 367, with aggregate unison overlap / shared rhythm / leap recovery misses at 14456 / 19065 / 520. These remain review signals rather than hard failures. The accepted tradeoff is that a small amount of added support motion is preferable to abrupt unsupported three-part silence, while hard constraints, Phase 7B readiness, subject identity, and answer planning remain intact.

## Handoff

This repair completes the automated subject-diversity detector, the first conservative generator-side diversity response, and the post-listening repair for mechanical subject-fragment convergence and abrupt three-part silence. Phase 8 may resume from this baseline. Remaining subject-stem concentration and voice-pair / leap-recovery movements stay visible as review signals for Phase 8 listening, not as blockers to hide with playback controls.
