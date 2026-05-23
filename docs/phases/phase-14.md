# Phase 14: Score-Led Musical Beauty Rebuild

Phase 14 is inserted after Phase 13Z and before Phase 8. Its purpose is to make musical beauty the primary acceptance criterion for the generator. Existing metrics, compatibility fields, and guardrail margins are secondary when they contradict the score.

Status: planned. Phase 8 is deferred until Phase 14 records score-window, diagnostics, and focused listening evidence that the generated music is beautiful as counterpoint and fugue, not merely metric-ready.

Planning reviews:

* [Phase 14 beauty replan review](../reviews/phase-14-beauty-replan-2026-05.md): latest 22 seed + focused seed review and CI / review scope classification.
* [Phase 14 score-led beauty review](../reviews/phase-14-score-led-beauty-review.md): initial score-led audit after Phase 13Z.

## Rationale

The latest 22 seed review bundle plus `random-listen-check` and `seed-0zereox-1v729ih` shows that current metrics still fail to express musical beauty. The reference aggregate can be green while every inspected seed still has review-required pitch-class unison and duration lockstep. The refreshed bundle has 288 local sentinels, including 219 unresolved entry severe intervals and 69 long pitch-class unison spans, while all 22 bundle seeds remain Phase 7B ready. The first bass answer no longer has the old all-voice reset, but all 24 inspected first-bass windows still count as `continuity-supported` while two outside voices end and re-articulate at the entry. Counter-subject material often does not survive as an independent musical idea, and phrase recurrence still reads as continuation more often than development.

A focused post-Phase 13Z inspection also shows an uneven passing-tone semitone-clash tradeoff. Phase 13Z remains complete because it repaired long-run phrase convergence, but Phase 14 must now treat the new local dissonance distribution as the first score-window risk: `contrary-motion` gained a clear weak-passing semitone-clash increase, `tight-stretto` gained broader passing/neighbor clashes and unresolved accented entry clashes, while `circle-fifths`, `modal-cadence`, and `dense-modal` improved or moved mixed signals.

Phase 13X, Phase 13X2, Phase 13Y, and Phase 13Z are still useful, but they are narrow repairs. Phase 14 treats the shared cause: the generator often chooses score windows that satisfy local constraints without creating living contrapuntal lines, durable counter-subject identity, or function-bearing development.

Phase 14 is therefore the beauty trunk before Phase 8. It may change generator behavior, expected values, metric classifications, and guardrail margins when score-window review shows that the old values preserve less beautiful music.

The acceptance order is:

1. Local entry dissonance and continuity must be acceptable in the score.
2. Independent line agency must be generated, not only diagnosed.
3. Counter-subject material must survive or transform recognizably.
4. Phrase development must improve musical function without worsening the first three layers.
5. Aggregate metrics may support adoption only after the score-window evidence is accepted.

## Scope

* Replace metric-first adoption with score-window musical acceptance for entry, line-agency, counter-subject, and phrase-development changes.
* Add a post-Phase 13Z regression triage before any new generator repair. It must compare representative, rotation, modal, and adversarial seeds for passing-tone semitone clashes, entry adjacent-second friction, and unresolved accented clashes.
* Rebuild important-entry support so enough outside material carries, suspends, resolves, or staggers through the entry to create audible continuity; one carried voice is not automatically sufficient when other voices reset together.
* Rebuild passing/neighbor and offbeat support selection so weak dissonance is accepted only when it prepares, passes, neighbors, suspends, or resolves in the local voice-leading window.
* Rebuild voice-pair and support-texture generation so independent rhythm, contour, register, contrary/oblique motion, and dissonance preparation are generated alternatives, not only diagnostics.
* Make counter-subject survivability a generator objective across exposition, subject-return, episode, and stretto-like windows.
* Link phrase recurrence to function-bearing development: contour change, inversion, sequence direction, cadence target, density arc, register transfer, voice assignment, and contrapuntal tension.
* Reclassify metrics that cannot explain representative score windows. Metrics that remain should point to seed, tick, voices, role, theory basis, and musical response.
* Keep seed and metric scope classified under [CI and review scope](../reference/quality-metrics/ci-review-scope.md): uncertain beauty signals stay `review-required`, not PR CI blockers.
* Use `organ-default` and `strict-counterpoint` focused listening notes as adoption evidence after score-window inspection.

## Out Of Scope

* UI, visualizer, Worker fallback, or playback-profile changes that hide score-level weaknesses.
* Treating Phase 7B readiness, reference aggregate pass, or old expected values as evidence of musical beauty.
* Preserving legacy generator compatibility when it blocks audible improvement.
* Optimizing one seed at the expense of representative, boundary, rotation, modal, adversarial, and user-reported seed classes.

## Completion Conditions

* A focused seed set including representative, boundary, rotation, modal, adversarial, ad hoc listening, and user-reported seeds is reviewed from ScoreEvent windows before metrics are accepted.
* The Phase 13Z tradeoff is classified by seed and section before broader Phase 14 changes are adopted. At minimum, `contrary-motion`, `tight-stretto`, `circle-fifths`, `modal-cadence`, and `dense-modal` are checked for weak-passing semitone clashes, broader passing/neighbor semitone clashes, entry adjacent-second friction, and unresolved accented entry clashes.
* The 22 seed review bundle no longer has universal review-required pitch-class unison and duration lockstep without a score-window explanation and a musical response.
* Important entry windows show audible continuity: carried, suspended, resolving, staggered, or prepared collective articulation is visible in the score, and the review distinguishes one-voice carry from real contrapuntal continuity.
* Counter-subject windows are preserved or transformed recognizably; "tradeoff" is not the default outcome.
* Subject-return, episode, and stretto-like recurrence is accepted only when the repeated material changes musical function or developmental pressure.
* Reference aggregate and Phase 7B policy output are documented as safety/context signals, not as top-level beauty acceptance. Quality vector axes remain review inputs unless the score window confirms the musical symptom and response.
* The review records CI / review scope for every seed or metric addition, removal, promotion, demotion, or archival decision.
* Focused `organ-default` and `strict-counterpoint` listening notes include repaired entry windows, line-agency windows, counter-subject survival windows, and long-run phrase-development windows.

## Workstreams

### 14A0: Post-13Z dissonance triage

Before changing generator weights again, record a small before/current review for Phase 13Z tradeoffs. Treat `contrary-motion` and `tight-stretto` as high-risk seeds, with `circle-fifths`, `modal-cadence`, and `dense-modal` as mixed/control seeds. The output should identify whether the response belongs in generator candidate construction, candidate scoring, diagnostics classification, or accepted tradeoff documentation. This workstream stays first because phrase novelty must not be allowed to make entry dissonance or weak-passing semitone friction worse.

Implementation note: `phase14DissonanceTriage` now records the focused seed set's weak-passing, passing-neighbor/offbeat, entry adjacent-second, and unresolved accented-clash evidence as review-required score-window diagnostics. See the [Phase 14 dissonance triage implementation review](../reviews/phase-14-dissonance-triage-implementation.md). This completes the diagnostics-harness part of 14A0; generator candidate construction and scoring responses remain in 14B/14C.

### 14A: Score-window acceptance harness

Add review output that reports important entries, weak-passing and passing/neighbor semitone clashes, active voice-pair spans, counter-subject windows, phrase-development windows, and metric explanations before aggregate metrics. The harness should name seed, tick, voices, roles, intent, section state, theory basis, and proposed response.

Implementation note: `phase14ScoreWindowAcceptance` now combines important-entry continuity, dissonance triage, active voice-pair spans, counter-subject survival, phrase-development, and metric-explanation windows into one review surface. See the [Phase 14 score-window acceptance implementation review](../reviews/phase-14-score-window-acceptance-implementation.md). This completes the diagnostics-harness part of 14A; generator-side responses remain in 14B/14C.

### 14B: Entry dissonance and continuity generation

Tighten entry-continuity classification so one delayed or carried support line is not enough when the rest of the texture resets. Add generation candidates for carried support, suspensions, prepared resolutions, staggered continuation, contrary/oblique support, and weak dissonance that resolves by step. Candidate scoring should penalize repeated pitch-class stacks plus adjacent seconds when the score window cannot explain them as prepared, passing, neighboring, cadential, or stretto-functional.

Implementation note: entry-boundary reset softening now carries/delays two outside support voices when all outside voices would otherwise restart together. This removes the focused one-voice carry with outside reset windows in the Phase 14B review seeds. See the [Phase 14 entry continuity generation review](../reviews/phase-14-entry-continuity-generation.md). Broader entry dissonance scoring and weak-dissonance generation responses remain open.

### 14C: Line-agency, counter-subject, and phrase-development generation

Add independent rhythmic and contour alternatives after the dissonance triage is stable. Make counter-subject preservation and transformation selectable objectives. Rebuild phrase-development selection so recurrence must show changed role, register, cadence target, contour, density, or contrapuntal pressure, not only a changed state label. Do not let phrase novelty rewards select windows that increase unprepared semitone friction. The generator should improve line agency before phrase-development rewards are trusted, because a novel phrase over block-like support is still weak fugue writing.

### 14D: Metric truthfulness and scope cleanup

Reclassify or remove metrics that cannot explain the accepted score windows. Keep reference aggregate and Phase 7B readiness as `ci-observed` or safety/context evidence, not beauty acceptance. Keep pitch-class unison, lockstep, entry severe interval, line agency, counter-subject survivability, entry formula novelty, and subject-stem concentration as `review-required` until score-window evidence, fix target, and runtime justify CI promotion.

### 14E: Bundle and listening evidence

Regenerate the 22 seed bundle and the focused seed set, then record focused `organ-default` and `strict-counterpoint` listening notes and accepted tradeoffs. The completion review must state which signals remain review-only, which are CI-observed, and which old expected values are removed or archived.

## Phase 8 Handoff

Phase 8 may resume only after Phase 14 records score-led beauty evidence. Infinite playback must not use segment boundaries, visual smoothing, playback profiles, or UI controls to make weak counterpoint, repeated formulae, entry resets, or same-family fatigue less audible.
