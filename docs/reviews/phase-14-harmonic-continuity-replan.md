# Phase 14 Harmonic Continuity Replan

This review records the user-reported harmonic-continuity symptom in `seed-1dxb2n8-1miapx7` and reopens a focused Phase 14 follow-up before Infinite playback MVP work proceeds.

Reported symptom: measures 6-7 sound harmonically unnatural.

## Findings

### 1. The reported measures expose an audible harmonic-continuity failure

Affected seed: `seed-1dxb2n8-1miapx7`.

The focused window is 4/4 in A minor. Measures 6-7 sit inside an episode from measure 5 beat 4 to measure 7 beat 4. The section plan describes a D minor to E minor modulatory episode with `circle-fifths`, `inversion`, and `pivot-harmony`, followed by an A minor stretto-like section at measure 7 beat 4.

The score window does not make that plan audible enough:

* measure 6 beat 1 stacks F across all active voices, so the texture reads as exposed pitch-class doubling rather than a functional D minor sonority;
* measure 6 beat 3 sounds F/E/G against the E minor predominant plan, putting the strongest local friction on a structural beat;
* measure 6 beat 4 through measure 7 thins to one or two active voices, with F# alone or F#/G and A/E sonorities that do not clearly support E minor predominant, dominant, or cadential-tonic function;
* measure 7 beat 4 returns to A/E before the E minor arrival is convincingly prepared or released.

Theory basis: common-practice harmony and Fux-like contrapuntal texture. A modulatory episode can use pivot harmony, sequence, thinning, and evaded cadence, but the audible surface still needs root support, chord-member clarity, prepared dissonance, or a clear rhetorical reason for exposed two-part or one-part writing.

Project response: generator and candidate-scoring change. Do not treat the symptom as solved by playback profile, visual segmentation, or a broader aggregate threshold.

### 2. Existing diagnostics see pieces of the problem but do not express the full listening failure

The selected episode at tick 9120 has no hard failures, but its candidate evaluation records 11 strong-beat dissonance / harmonic-function mismatch events, 4 strong-beat checkpoints with 0 bass-root support, and a nonzero entry-harmony risk. The following stretto-like section at tick 12960 also has no hard failures, but records 11 strong-beat dissonance / harmonic-function mismatch events, 5 strong-beat checkpoints with 0 bass-root support, and unresolved severe entry intervals in the local candidate explanation.

Those signals explain why the passage can pass as structurally valid while still sounding unconvincing. The diagnostics count local mismatches and entry risks, but they do not yet require the score window to demonstrate that a planned modulatory episode is audible as a harmonic progression.

Structural hypothesis: section-local planning currently rewards controlled ambiguity, phrase transformation, and local hard-constraint survival even when bass-root support and chord-tone realization are too thin to make the harmonic plan perceptible. The issue is most likely to recur in short modulatory or pivot-harmony episodes that hand off quickly into stretto-like material.

Evidence strength: confirmed for the reported seed and plausible as a generator pattern. A cross-seed sweep is still missing.

## Plan Impact

Add a focused Phase 14 follow-up before Infinite playback MVP handoff:

1. Add a harmonic-continuity review surface for short episode-to-entry windows. It should report local key path, harmonic anchors, active voices, pitch classes, bass-root support, chord-tone support, structural-beat mismatches, thinning, and the next section handoff.
2. Rework episode and stretto-adjacent candidate scoring so controlled ambiguity, `pivot-harmony`, `circle-fifths`, and evaded cadence receive credit only when the audible score window reaches or clearly prepares the next harmonic anchor.
3. Add generator alternatives for short modulatory episodes: stronger bass-root support at structural beats, chord-tone support during thinning, prepared suspension/passing explanations for F/E/G-like friction, and delayed or clarified handoff when the next stretto-like entry arrives too soon.
4. Review a focused seed set before adoption: `seed-1dxb2n8-1miapx7`, existing circle-fifths and tight-stretto review seeds, modal-cadence controls, and at least two representative seeds.
5. Keep the response score-window based. Aggregate `strongBeatDissonanceCount`, `harmonicFunctionMismatches`, and bass-root support counts should guide inspection, but acceptance requires the local passage to sound like an intentional harmonic progression.

## CI / Review Scope

| Item | Classification | Reason | Action |
| --- | --- | --- | --- |
| `seed-1dxb2n8-1miapx7` measures 6-7 | `review-required` | User-reported, deterministic, and musically clear, but currently supported by one focused score-window inspection rather than cross-seed evidence. | Add to the focused harmonic-continuity review set and use it as a before/after score-window regression target. |
| Short modulatory / pivot-harmony episode handoff windows | `review-required` | Acceptability depends on whether ambiguity, thinning, and handoff are rhetorically explained in the local score. | Add a review surface and candidate-scoring response before considering CI promotion. |
| Aggregate strong-beat dissonance, harmonic-function mismatch, and bass-root support counts | `ci-observed` / `review-required` | They reveal pressure but do not by themselves distinguish expressive ambiguity from unconvincing progression. | Keep as diagnostics and score inputs; do not widen thresholds to pass the reported window. |

No manual listening pass or cross-seed before/after bundle was completed for this review.
