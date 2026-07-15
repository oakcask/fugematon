# Claim Map

Fugematon 固有の設計判断、review 判断、quality policy と文献根拠の対応を管理します。外部文献そのものの情報は [references.md](references.md) に置きます。

## Entry Format

```text
## <claim-id>

* Claim: <Fugematon 固有の判断>
* Applies to: <design | generation | scoring | diagnostics | review | phase-scope | license>
* Evidence: <ref id または source-family id>
* Confidence: <high | medium | low>
* Verification state: <source-family | edition-checked | page-checked | score-example-checked>
* Limits: <この claim を適用してはいけない範囲>
* Used by: <関連する docs、tests、code area>
```

## Current Claims

既存 Phase/review docs の literature claims は、次に該当文書や関連実装へ触れる時に必要なものから claim entry へ昇格します。新しい文献根拠で実装方針、quality gate、phase scope、review 採否を変える場合は、その変更と同じ差分で entry を追加します。

## section-constraint-csp-local-first

* Claim: Fugematon should model continuation voice slots with a deterministic local finite-domain CSP before considering an external solver dependency; section slots may be `note`, `hold`, or internal `intentional-rest`, while public `ScoreEvent` remains limited to note/meta events.
* Applies to: design | generation | diagnostics | phase-scope
* Evidence: `music-constraint-programming`; current `Generator Constraint Rebuild` local solver architecture.
* Confidence: medium
* Verification state: page-checked
* Limits: This claim does not prove the local solver is musically complete, does not promote every texture diagnostic to a CI hard gate, and does not reject future external solver comparison after bounded local search fails documented acceptance thresholds.
* Used by: `docs/phases/generator-constraint-rebuild.md`, `docs/reference/quality-metrics/diagnostics.md`, `docs/reviews/generator-constraint-rebuild-density-structural.md`, `docs/reviews/generator-constraint-rebuild-metrical-boundary.md`, `docs/reviews/generator-constraint-rebuild-voice-pair-independence.md`

## sustained-vertical-dissonance-soft-repair

* Claim: Fugematon should treat meter-length semitone or minor-ninth stacks, tritones, and fourths above the lowest active voice as generator-response soft costs when the window is held and not explained as a prepared, stepwise-resolving suspension.
* Applies to: generation | scoring | diagnostics | review
* Evidence: `species-dissonance-treatment`; focused `seed-1wudr38-0fbqzth` score-window evidence.
* Confidence: medium
* Verification state: page-checked
* Limits: This claim keeps sustained severe vertical dissonance out of `unresolvedDissonanceCount` hard failures for now, preserves ordinary short weak passing/neighbor evidence as review-required, and does not ban prepared suspensions or style-profile-specific dissonance.
* Used by: `docs/reference/quality-metrics/diagnostics.md`, `docs/reviews/sustained-vertical-dissonance-soft-repair.md`

## keyboard-writing-profile-separates-compass-and-playability

* Claim: Fugematon should model piano, harpsichord, and music-box target constraints as `WritingProfile` generation constraints, not as `PerformanceProfile` playback settings; absolute pitch compass is necessary but piano also needs hand-assignment and reach evidence, while music-box targets need supported pitch-set and mechanism-limit enforcement.
* Applies to: design | generation | diagnostics | phase-scope
* Evidence: `keyboard-playability-and-compass`; current `WritingProfile` / `PerformanceProfile` boundary in design docs.
* Confidence: medium
* Verification state: page-checked
* Limits: This claim does not require a complete fingering solver in the first implementation, does not set universal hand-span thresholds, and does not require every four-voice texture to survive unchanged under a music-box profile.
* Used by: `docs/reference/design.md`, `docs/phases/generator-constraint-rebuild.md`, `docs/reviews/music-box-n20-voice-crossing-structural-review.md`

## episode-motivic-development-basis

* Claim: Fugematon should treat short subject-free spans as potentially valid, but Phase 8 should wait until free counterpoint and episode material have review-visible derivation from subject, answer, counter-subject, cadence figure, or prior episode material.
* Applies to: generation | diagnostics | review | phase-scope
* Evidence: `common-practice-fugue-episodes`; existing Phase 5-11 and Texture continuity review evidence.
* Confidence: medium
* Verification state: score-example-checked
* Limits: This claim does not require every episode to be long, every note to literally match the subject, or historical WTC measure counts to become thresholds.
* Used by: `docs/reference/design.md`, `docs/phases/generator-constraint-rebuild.md`, `docs/reviews/generator-constraint-rebuild-episode-free-counterpoint.md`

## initial-subject-rhetoric-diversity

* Claim: Initial subject generation should assemble answer-compatible subjects from independently varied opening gesture, climax area, rhythm profile, meter stress, modal color, and tail motion decisions instead of choosing the adopted planner subject from a fixed full-profile list.
* Applies to: generation | diagnostics | review | phase-scope
* Evidence: `common-practice-fugue-subjects`; Initial subject rhetoric diversity repair seed sweep evidence.
* Confidence: medium
* Verification state: source-family
* Limits: This claim does not require learned subject generation, historical subject templates, or maximum difference between all seeds. Motivic recurrence inside one score remains valid when it is function-bearing.
* Used by: `docs/reference/design.md`, `docs/reference/quality-metrics/diagnostics.md`

## endless-program-coda-continuity

* Claim: `endless-program` coda quality should not be accepted from stable terminal sonority alone; the terminal span should use a historically plausible ending process such as final subject return, stretto, pedal-supported final entry, thematic liquidation, or texture compaction that preserves recent musical material until the cadence.
* Applies to: generation | diagnostics | review | phase-scope
* Evidence: `historical-fugue-endings`; `historical-terminal-cadences`; current `buildTerminalCodaNotes` implementation pattern and user-reported all-voice long-tone symptom.
* Confidence: medium
* Verification state: score-example-checked
* Limits: This claim does not require strict Bach style for every style profile, does not ban prepared pedal points or final held sonorities, and does not make every non-thematic final bar a failure when liquidation or cadence function is review-visible. Chorale-style final cadence evidence is a closure floor, not sufficient proof of fugal coda quality. Archetype diversity is review-required evidence, not a CI hard gate.
* Used by: `docs/phases/endless-program-terminal-stretta-planner.md`, `docs/reviews/endless-program-coda-historical-ending-review.md`, `docs/reference/quality-metrics/diagnostics.md`

## playback-source-notices-required

* Claim: Fugematon should expose a user-facing notices page before distributing third-party synthesizer software or audio assets; the page must distinguish OSS software licenses from sound/sample-library licenses and must be generated from package and asset metadata where practical.
* Applies to: license | phase-scope
* Evidence: `playback-source-licensing`
* Confidence: medium
* Verification state: license-page-checked
* Limits: This does not decide final commercial redistribution rights for a release bundle; exact asset files and bundled notices must be rechecked at implementation time.
* Used by: `docs/phases/playback-source-realism-feasibility.md`

## playback-source-pilot-order

* Claim: For Fugematon's next audio-realism step, a SoundFont-backed SpessaSynth pilot is lower implementation risk than a custom VSCO WAV sampler, while a curated VSCO sampler remains a stronger long-term path if the product goal shifts from organ-like fugue playback to exposed chamber-instrument realism.
* Applies to: phase-scope | design
* Evidence: `playback-source-licensing`; current WebAudio oscillator renderer and `PerformanceProfile` boundary.
* Confidence: medium
* Verification state: license-page-checked
* Limits: This claim assumes browser playback remains the primary target and does not compare native audio engines, paid sample libraries, or server-side rendering.
* Used by: `docs/phases/playback-source-realism-feasibility.md`

## reference-evaluation-learning-loop

* Claim: Fugematon should compare historical four-voice works and generated scores through the same contextual, normalized, explainable feature vocabulary, while keeping hard constraints, score-window blockers, reference-relative evidence, and pairwise preference as separate adoption layers. The first learned pairwise model should run in shadow mode and must not change generated output or become the default from sparse listening data.
* Applies to: design | scoring | diagnostics | review | phase-scope | license
* Evidence: `reference-corpus-and-generative-evaluation`; `common-practice-fugue-subjects`; `common-practice-fugue-episodes`; `species-dissonance-treatment`; existing quality-vector and score-window false-acceptance reviews.
* Confidence: medium
* Verification state: page-checked
* Limits: This claim does not treat chorales as fugue-form positives, does not authorize redistribution of external scores, does not prove a Bradley-Terry-style model will outperform current heuristics, and does not make manual pairwise listening an implementation completion blocker.
* Used by: `docs/phases/reference-evaluation-learning-loop.md`, `docs/phases/pairwise-listening-review-tool.md`, `docs/reference/design.md`, `docs/reference/technical-plan-full.md`, future implementation completion review.
