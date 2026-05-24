# Texture Continuity Replan

This review records the plan change after user feedback on exposed free-counterpoint and sudden texture thinning.

Reported symptom:

* In `seed-0i335vx-1n54a1x`, measure 5 sounds as if soprano and tenor stop abruptly.
* In measure 6 and later windows, a part can become solo-like.
* Measures 9 and 28 expose solo free-counterpoint lines whose phrases sound dull.

The review used ScoreEvent windows and diagnostics. No broad manual listening pass has been completed.

## Findings

### 1. Measure 5 is a real bass-answer tail thinning window

Affected seed: `seed-0i335vx-1n54a1x`.

The score is in 4/4, so measure 5 starts at tick 7680. From tick 7680 to 9120, soprano and tenor are resting while alto free-counterpoint supports the bass answer. This is not literal all-voice silence, and it is not bass-only collapse, but the texture falls to bass answer plus one outside support voice.

Current diagnostics partially detect the condition. `bassAnswerTailTexture` reports one-outside support ticks in the first bass-answer tail, but classifies the window as `supported-tail` because zero-outside and bass-only ticks are absent.

Theory basis: bass answer continuation can be thinner than the exposition entry texture, but a sustained tail with only one outside support voice is fragile unless it has cadence, pedal, suspension, echo, or prepared two-part function.

Project response: change first bass-answer tail planning and diagnostics so one outside support is review-required when it sustains the tail without a clear function. The generator should prefer two outside supports, carried support, staggered continuation, or an explicitly functional two-part tail.

### 2. Later exposed free-counterpoint solo is still possible

Affected seed: `seed-0i335vx-1n54a1x`.

The same score has many solo runs. Diagnostics report `soloRunCount` 39, `unsupportedSoloRunCount` 1, and `abruptTextureDropCount` 1. Measure 9 includes a one-beat bass-only free-counterpoint segment. Measure 28 exposes tenor free-counterpoint for two quarters while the other voices rest.

This is not the same failure as the old all-voice silence or bass-only first-answer collapse. The generator has learned to avoid the most severe texture holes, but it still permits exposed free-counterpoint filler in non-cadential continuation windows.

Theory basis: a solo line is acceptable when it is a prepared rhetorical solo, cadence approach, echo, or motivic development. A short free-counterpoint formula exposed by withdrawal of the other voices sounds weaker than the same formula inside a fuller texture.

Project response: add an exposed free-counterpoint solo review surface and a generator repair that adds a non-colliding support line or gives the solo a recorded musical function.

### 3. The dull phrase symptom is tied to exposure, not only phrase vocabulary

Affected seed: `seed-0i335vx-1n54a1x`; related prior evidence from Phase 14 post-entry free-counterpoint phrase reviews.

The exposed measure-28 tenor window uses a simple two-note free-counterpoint motion. Similar short degree-pattern cells recur elsewhere in the score. Previous Phase 14 work reduced cross-seed free-counterpoint phrase-signature concentration in focused sets, but the current symptom shows that even a reduced formula vocabulary is weak when one part is left alone.

Theory basis: repeated figuration is usable when it changes function, register, sequence direction, cadence target, or contrapuntal pressure. When the line is exposed, it must carry more melodic and formal responsibility.

Project response: order the work so support-density repair comes before phrase-vocabulary enrichment. First stop unsupported exposure, then improve the remaining exposed free-counterpoint phrases.

## Structural Hypothesis

Confirmed symptom: the generator accepts one-outside bass-answer tail support and later exposes single free-counterpoint lines in non-cadential windows.

Plausible generator cause: continuation planning treats one free-counterpoint line as a valid default tail unless severe all-voice silence or bass-only collapse appears. Existing post-entry support repairs target long answer/stretto-like windows and first-bass bass-only tail collapse, but they do not make exposed free-counterpoint filler a first-class generator problem.

Evidence strength: confirmed for the reported seed and consistent with earlier Phase 14 evidence. Cross-seed scope still needs a focused review bundle after implementation.

Project response: insert Texture continuity repair before Infinite playback MVP. Treat exposed free-counterpoint solo and one-outside first-bass tail as score-window review signals with generator and scoring responses.

## Implementation Order

1. Add or derive `exposedFreeCounterpointSolo` review evidence with seed, tick, voice, role, section state, duration, previous active voice count, and functional classification.
2. Raise first bass-answer tail acceptance so sustained one-outside support is no longer silently accepted as enough.
3. Add support generation for exposed free-counterpoint solo windows using available voices and harmonic anchors.
4. Add planner/scoring pressure so continuation tails choose functional texture floors rather than default one-voice filler.
5. Improve exposed free-counterpoint phrase grammar only after support density is stable.
6. Review focused seeds and record tradeoffs before handing back to Infinite playback MVP.

## CI / Review Scope

Touched seeds and metrics:

* `seed-0i335vx-1n54a1x`;
* focused controls `bach-001`, `fugue-smoke`, `minor-entry`, `modal-cadence`, `dense-modal`;
* `soloTexture`;
* `bassAnswerTailTexture`;
* planned exposed free-counterpoint solo evidence;
* free-counterpoint phrase-signature evidence.

Classification: `review-required`.

Reason: the symptom is deterministic and musically concrete, but acceptable thinning depends on section role and local phrase function. Cadential thinning, pedal, echo, suspension preparation, and deliberate exposed solo rhetoric must remain possible.

Action:

* Use the reported seed as a focused regression seed for the repair.
* Keep the broader seed set in review bundles until false positives and runtime are known.
* Consider narrow CI promotion only after the exposed-solo metric has a stable repair target and low false-positive rate.
* Keep manual listening as a handoff gap if no focused listening pass is completed.

Evidence gap: no broad listening pass and no post-repair A/B bundle have been generated yet.
