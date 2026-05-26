# Phase 14 Fugue-Smoke Rhythm And Harmony Replan

This review records the follow-up plan after a focused ScoreEvent and diagnostics review of `fugue-smoke` and the standard 22 seed review set.

Reported symptoms:

* `fugue-smoke` measure 5 has an unnatural rhythm.
* `fugue-smoke` measure 7 has an unnatural harmonic progression.

Evidence source: a fresh review bundle generated under `samples/fugue-smoke-rhythm-harmony-review`, plus direct ScoreEvent inspection for `fugue-smoke`. No broad human listening pass was completed.

## Findings

### 1. Measure 5 rhythm is improved but still review-required

Affected seed: `fugue-smoke`.

The current measure 5 window has 15 attacks, 6 short attacks, and 4 active voices. It is not the worst short-note density in the review set, and it no longer reads as a full-measure default eighth-note run. The passage is the end of the exposition and the pickup into the first episode.

The remaining symptom is the boundary placement. At tick `9120`, the score enters an episode with a bass subject-fragment, phrase boundary, and harmonic anchor on measure offset `1440` in 4/4. `meterConsistencyReview` classifies the entry as `pickup-or-cross-metric` and the phrase boundary / harmonic anchor as `review-required`. This can still sound rhythmically unsettled because the first episode starts before the next downbeat without enough prepared upbeat rhetoric.

Cross-seed evidence: similar or stronger measure 5 short-note density appears in `bach-001`, `bright-answer`, `dark-episode`, `ornament-test`, and `long-arc`, which each have 18 attacks and 12 short attacks in the same measure window. The issue is therefore not a `fugue-smoke` literal special case. It is a section-transition rhythm problem around exposition-to-episode handoff windows.

Theory basis: phrase rhythm and fugue exposition practice. A pickup or cross-metric episode entry can be valid, but the score needs preparatory rhetoric, tied or held support, cadential release, or a clear upbeat gesture. Otherwise the start of the first episode sounds accidental rather than motivated.

Project response: reopen Phase 14 with a focused transition-rhythm workstream. Do not hard-code measure 5, `fugue-smoke`, 4/4, or the bass voice. The generator response should target section-boundary windows where entry start, phrase boundary, and harmonic anchor fall off the downbeat after an exposition or important entry.

### 2. Measure 7 harmonic progression is not repaired

Affected seed: `fugue-smoke`.

The reported measure 7 window lies inside the first pivot episode at tick `9120-13920`. A later implementation attempt made top-level `harmonicContinuity` report this window as `audible-progression`, but the score-window surface still reported sonority-level failures inside the same measure. This means top-level harmonic-continuity acceptance is necessary context, not sufficient handoff evidence.

The score-window acceptance surface also flags the same local passage:

* `harmonic-continuity` at tick `9120`: the short pivot episode must make the planned harmonic path audible at structural beats.
* `harmonic-sonority` at ticks inside measure 7: support texture must not label non-chord tones as structural chord or root support.

This means the earlier Phase 14C4 repair fixed the reported `seed-1dxb2n8-1miapx7` D minor to E minor pivot handoff, but it did not generalize enough to `fugue-smoke` and related short episode patterns. The next implementation must connect `harmonicContinuity` and `harmonic-sonority` evidence rather than letting one accepted window hide generator-response sonorities in the same span.

Cross-seed evidence: measure 7 or overlapping early-episode harmonic-continuity windows remain `generator-response-required` in many review seeds, including `bach-001`, `wide-key`, `modal-dorian`, `circle-fifths`, `dark-episode`, `ornament-test`, `long-arc`, `contrary-motion`, `quiet-cadence`, `modal-cadence`, and `dense-modal`. This is a broad short-episode harmonic-continuity pattern, not a single reported window.

Theory basis: common-practice harmonic continuity and contrapuntal texture. Controlled ambiguity, pivot harmony, sequence, or thinning may be acceptable, but the audible vertical surface must show enough bass-root support, chord-tone support, prepared dissonance, suspension / resolution, or rhetorical thinning to make the planned progression perceptible.

Project response: reopen Phase 14C4 as a general short-episode harmonic-continuity repair. The next repair must cover ascending-step, descending-step, circle-fifths, parallel-shift, sequence, contrary-motion, and inversion windows by structural evidence, not literal pitch names or the earlier reported seed. A focused acceptance check must fail when a reported short episode contains any sonority-level `generator-response-required` window.

Implementation update: the stricter focused repair now requires the `fugue-smoke` first short episode to have accepted top-level harmonic-continuity evidence and no sonority-level `generator-response-required` windows inside the same span. The first implementation closed that focused failure but repaired too many texture change-points with bass-root support. The follow-up generator predicate now limits the repair to first post-exposition short-episode-to-stretto handoffs that need audible support, without hard-coding 4/4. The support edit repairs free-counterpoint structural labels at texture change-points, adds bass-root support only at structural support ticks, and preserves counter-subject notes as motivic material rather than retagging them as harmonic support. A full focused seed refresh is still needed before Phase 8 handoff is complete again.

Motivic-support update: the focused repair now derives added upper support in early short pivot episodes from recent motivic contour and constrains it to the local chord path. This keeps the bass root-led for harmonic clarity while making the free-counterpoint support a decorated transformation of earlier material. The new synthetic regression checks that an ascending motivic outline can produce transformed upper support across tonic, predominant, and dominant anchors without hard-coding the reported seed, voice, meter, or pitch names.

## Structural Hypothesis

Symptom: the score can now avoid the oldest hard failures while still producing off-downbeat transition entrances and short pivot episodes whose harmonic plan is not audible enough.

Repeated pattern: section-local candidate selection rewards controlled ambiguity, fragment transformation, and local hard-constraint survival before it proves that the next section boundary has a convincing rhythmic and harmonic surface. The same tendency appears at early exposition-to-episode handoffs and later short episode-to-entry handoffs.

Evidence strength: confirmed for `fugue-smoke` and supported across the standard 22 seed review set by generated diagnostics and ScoreEvent windows. Human listening remains missing.

Project response: reorganize Phase 14 before Phase 8 resumes:

1. Keep 14C4 focused on structural handoff evidence. The `fugue-smoke` sonority repair and the `seed-1dxb2n8-1miapx7` harmonic-continuity repair remain covered, while blanket bass support at every texture change-point stays rejected because it weakens voice independence.
2. Add a transition-rhythm review surface for section-boundary windows where entry start, phrase boundary, harmonic anchor, and cadence preparation conflict.
3. Generalize short-episode harmonic-continuity generation beyond the earlier `seed-1dxb2n8-1miapx7` pivot pattern without weakening voice independence. Added support should prefer decorated transformations of recent motivic contour over unrelated filler patterns when the local chord path can absorb the transformation.
4. Review the focused seed set before accepting the handoff: `fugue-smoke`, `bach-001`, `bright-answer`, `dark-episode`, `ornament-test`, `long-arc`, `circle-fifths`, `tight-stretto`, `modal-cadence`, `dense-modal`, and `seed-1dxb2n8-1miapx7`.
5. Keep the texture/phrase planning A2 and B2 review batches as regression controls. The follow-up repair keeps B2 hard constraints, leap recovery, and counter-subject identity inside the focused control, but the B2 shared-rhythm allowance is wider. Treat the remaining shared-rhythm excess as a bounded review-required texture tradeoff, not as evidence that blanket bass support is acceptable.
6. Keep Phase 8 blocked until the repaired bundle shows score-window evidence, not only better aggregate counts.

## CI / Review Scope

| Item | Classification | Reason | Action |
| --- | --- | --- | --- |
| `fugue-smoke` measure 5 transition rhythm | `review-required` | The symptom depends on phrase-rhythm judgement and section-boundary context. | Add focused review coverage; do not make it a hard PR CI blocker yet. |
| Section-boundary transition-rhythm review surface | `review-required` | The classifier must distinguish expressive pickup from accidental off-downbeat handoff. | Add diagnostics and score-window acceptance evidence before generator adoption. |
| `fugue-smoke` measure 7 harmonic-continuity window | `review-required` | It is deterministic and generator-response-required, but acceptance remains score-window based. | Add to Phase 14C4 focused regression coverage. |
| Broad short-episode harmonic-continuity windows | `review-required` | The issue recurs across seed families and sequence patterns. | Generalize generation/scoring before Phase 8. |
| Texture/phrase shared-rhythm overlap after harmonic support repair | `ci-observed` | It is a deterministic regression control in existing review-batch tests and represents weaker contrapuntal independence when it rises. | Keep A2 and B2 as regression controls; the current support-placement fix bounds the B2 excess while preventing blanket bass support at every local boundary. |
| Aggregate attack counts, strong-beat dissonance, and harmonic-function mismatch counts | `ci-observed` / `review-required` | They locate pressure but cannot by themselves distinguish expressive pickup, prepared dissonance, or convincing progression. | Use as context only; local score-window acceptance remains primary. |

## Plan Impact

Phase 14 is no longer complete for Phase 8 handoff. The earlier repairs remain accepted evidence, but the current handoff must be reopened for:

* `14C4`: generalized short-episode harmonic-continuity generation.
* `14C5`: section-transition rhythm generation and scoring.
* `14E`: regenerated bundle evidence and focused listening notes after both repairs and the shared-rhythm regression control pass.
