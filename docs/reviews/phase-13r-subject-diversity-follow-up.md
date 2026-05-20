# Phase 13R Subject Diversity Follow-Up

This review records the Phase 13R follow-up repair for seed-crossing initial subject similarity. It uses score diagnostics and generated review bundles as the agent-side music-theory review evidence required before returning to Phase 8/9.

## Findings

### 1. Initial subjects no longer collapse into three families

Before the repair, the 22 seed review set selected only three top initial subject degree families. The largest families were `0-2-1-3-4-3-2-1` on 10 seeds, `0-1-2-3-4-3-1-2` on 9 seeds, and `0-1-2-3-4-3-2-1` on 3 seeds.

After the first repair, the same 22 seed set reports 4 initial subject families. The largest family share is 0.318, down from 0.455. A later audit of the generated review bundle still reports top subject-fragment family share 0.682 and one `subject-fragment-vocabulary-collapse` finding. This means the initial subject family collapse improved, but the fragment vocabulary layer remains open.

Theory basis: fugue subjects should remain recognizable, but a generated corpus should not make many unrelated seeds start from the same small vocabulary. The new variant keeps a tonic opening and a fourth/fifth-area climax while varying upper-neighbor motion before the climax. Broader leap and cadential-tail candidates were rejected in this pass because they increased leap-recovery and local-sentinel review signals too much for this repair slice.

Project response so far: `buildSubject` now chooses one additional guarded upper-neighbor shape on the adopted planner path. The review bundle summary includes `subjectFamilyDiversity`, and A/B summaries include subject-family deltas. The next repair should target the cross-seed top subject-fragment family directly without undoing the default-path and texture repairs.

### 2. Hard constraints and Phase 7B readiness remain intact

The generated 22 seed review bundles for `organ-default` and `strict-counterpoint` both report:

* hard constraint failures: 0;
* Phase 7B readiness: 22/22;
* effective selection model: `phase10-section-local-planner`;
* unique initial subject families: 4;
* top initial subject family share: 0.318;
* top subject-fragment family share: 0.682;
* `subjectFamilyDiversity.findings`: one `subject-fragment-vocabulary-collapse` review signal.

Quality-vector local sentinel count is a review signal count, not a hard failure. It is higher than the automatic baseline recorded before this follow-up, so it remains a focused playback-review risk rather than a completed musical acceptance claim. No new hard failure, readiness loss, subject identity loss, answer-plan failure, or unresolved dissonance appears in the review bundle evidence. The open blocker is vocabulary concentration across seeds, not a local hard-constraint failure.

### 3. Focused convergence seeds improve automatically, and the final follow-up repairs the confirmed blockers

The focused Phase 13R seed sweep (`bach-001`, `fugue-smoke`, `modal-cadence`, `dense-modal`, `angular-answer`, `modal-answer`, `minor-entry`, `sparse-cadence`, `random-listen-check`) reports 4 top subject families across 9 seeds, hard constraint failures 0, and top family share 0.444.

Agent-side score review did not find a new counterpoint, harmony, rhythm, texture, or form blocker in the generated diagnostics. That was incomplete evidence, not a completed human listening pass. Post-Phase-13R human playback feedback reported that similar structure and phrase material still recurred both within a score and across seeds. This meant the subject-diversity repair was insufficient as a musical closeout even though it improved the aggregate detector.

The same listening feedback reported abrupt three-part silence. This is a texture / form blocker when the silence is not explained by cadence, phrase boundary, or staged functional thinning.

Final repair evidence: the follow-up test seed set now reports no Phase 13R subject-fragment concentration findings and no abrupt texture drops. Across the full 22 seed set, hard constraint failures remain 0, Phase 7B readiness remains 22/22, unsupported solo runs and abrupt texture drops are both 0, and Phase 13R subject-fragment concentration findings are 0. Eleven subject-stem concentration findings remain as review signals for recognizable subject returns rather than mechanical episode-fragment recurrence.

Theory basis: fugue subjects must recur recognizably, but episodes should vary fragment role, contour, or direction enough that the continuation does not sound like the same filler cell. The repair therefore changes episode phrase material by phrase-density arc while leaving subject-return recurrence visible as a review signal. For texture, a solo upper voice can be effective at a cadence or phrase boundary, but a long upper solo created by three simultaneous rests before the boundary sounds like an unsupported drop; the repair adds functional support for those runs instead of treating the section ending alone as sufficient explanation.

Tradeoff: aggregate quality-vector local sentinels are 367, with aggregate unison overlap / shared rhythm / leap recovery misses at 14456 / 19065 / 520. These remain review signals rather than hard failures. The accepted tradeoff is that a small amount of added support motion is preferable to abrupt unsupported three-part silence, while hard constraints, Phase 7B readiness, subject identity, and answer planning remain intact.

### 4. Lower-voice support must remain vocal, not only present

Post-review playback of `seed-0jt0g5o-11s90sf` showed that the bass and tenor problem was not long duration by itself. The concrete symptom was that low support notes could sound like held functional padding instead of a singable line.

Project response: `lowerVoiceVocality` now records bass/tenor support-line connection quality, unvocal long-support duration, and representative long-support examples. The generator-side repair splits functional thinning support and all-voice gap fillers into short connected support lines instead of single sustained filler notes.

Evidence: in the focused check, `seed-0jt0g5o-11s90sf` has no bass or tenor support note at 2 quarters or longer, no unvocal long-support examples, hard constraint failures 0, and `lowerVoiceVocality.score` 0.917. Across the 22 review seeds, hard constraint failures remain 0, no seed has unvocal long-support duration, and average `lowerVoiceVocality.score` is 0.960. One review seed remains below 0.900 because of static or large-leap lower-support connections, so this is improved generator evidence rather than a completed listening pass.

## Handoff

This repair completes the automated subject-diversity detector, the first conservative generator-side diversity response, and the post-listening repairs for per-score mechanical subject-fragment convergence, abrupt three-part silence, and unvocal low support. It does not complete the bundle-level fragment vocabulary repair. Phase 13S now takes over the open vocabulary and listening-review signals, and also treats subject rhythm, entry friction, voice lockstep, counter-subject identity, and metric truthfulness as Phase 8/9 blockers.

## Residual Repair Plan

Finding: the 22 seed bundle still concentrates its top subject-fragment family across seeds. The dominant fragment family is `0-2-1-3`, appearing on 15 of 22 seeds in the current audit. This is detected by `subjectFamilyDiversity` as `subject-fragment-vocabulary-collapse` even though per-score `phase13RReview` reports 0 `subject-fragment-family-concentration` findings.

Structural hypothesis: the remaining symptom is no longer the old product-boundary fallback or a single-score episode loop. It is a seed-crossing vocabulary issue: the adopted planner can vary section cycles and local fragment concentration while still drawing many episodes from the same short leading cell. Evidence strength is confirmed for diagnostics and plausible for listening; focused listening notes are still missing as durable artifacts.

Theory basis: recognizable subject-fragment recurrence is useful in fugue, but unrelated seeds should not repeatedly derive episodes from the same short cell unless the recurrence has changed role, direction, cadence preparation, or contrapuntal tension. Popular loop tolerance does not justify this by itself in a long generative fugue, because infinite playback makes vocabulary collapse more audible.

Recommended response:

1. Add a focused generator repair that gives high-share fragment families guarded alternatives. Prefer alternate fragment direction, tail motion, rhythmic stress, or derivation function over random contour churn.
2. Preserve subject identity, answer compatibility, hard constraints, Phase 7B readiness, per-score subject-fragment concentration at 0, and the repaired `unsupportedSoloRunCount` / `abruptTextureDropCount` at 0.
3. Add a regression test for bundle-level `subjectFamilyDiversity` across the 22 seed set, so a top fragment family share above the configured collapse threshold fails review or is explicitly documented as function-bearing recurrence.
4. Re-run `organ-default` and `strict-counterpoint` review bundles and record the final unique initial subject family count, top initial subject family share, top subject-fragment family share, Phase 13R finding counts, quality-vector local sentinel count, unison / shared-rhythm / leap-recovery movement, and lower-voice vocality movement.
5. Fill focused listening notes for `bach-001`, `fugue-smoke`, `modal-cadence`, `dense-modal`, `angular-answer`, `modal-answer`, `minor-entry`, `sparse-cadence`, and `random-listen-check` under both `organ-default` and `strict-counterpoint`. Each note should classify repeated fragment material as functional recurrence, mechanical filler, false positive, or unresolved blocker.
6. If the repair worsens voice-pair lockstep, leap recovery, entry harmony, or lower-voice vocality, record the affected seed, concrete musical symptom, and whether the response belongs in generation, scoring, diagnostics, or manual listening before adopting it.
