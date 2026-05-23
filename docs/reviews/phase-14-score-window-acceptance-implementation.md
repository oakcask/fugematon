# Phase 14 Score-Window Acceptance Implementation

This records the Phase 14A diagnostics-harness implementation. It adds `phase14ScoreWindowAcceptance` as a review surface, not as a generation repair.

## Evidence Scope

The coverage seed set spans representative, boundary, rotation, modal, adversarial, ad hoc listening, and user-reported cases: `bach-001`, `tight-stretto`, `circle-fifths`, `dense-modal`, `contrary-motion`, `random-listen-check`, and `seed-0zereox-1v729ih`.

## Finding

The existing diagnostics already expose the needed score-window inputs, but they were spread across entry-boundary continuity, Phase 14 dissonance triage, quality vector voice-pair spans, counter-subject windows, Phase 13Z phrase-development windows, and metric explanations. That made aggregate metrics easier to read than the score-window evidence Phase 14 is supposed to prioritize.

Theory basis: Fux/species counterpoint for entry continuity, dissonance preparation/resolution, and voice independence; fugue source family for counter-subject survival and function-bearing recurrence; diagnostic truthfulness for keeping metric explanations subordinate to score windows.

## Project Response

`phase14ScoreWindowAcceptance` classifies each representative window by kind, tick, state, voices, roles, classification, symptom, theory basis, and response:

* `accepted-context`: the window has a local score explanation.
* `review-required`: the window stays visible for musical review.
* `generator-response-required`: the window points to generation work in 14B or 14C.
* `diagnostic-context`: the metric is explanatory context rather than beauty evidence.

Generated notes are unchanged. This completes the Phase 14A diagnostics harness; it does not complete entry dissonance generation, line-agency generation, counter-subject preservation, phrase-development generation, listening evidence, or metric-scope cleanup.

## CI / Review Scope

`phase14ScoreWindowAcceptance` is `review-required`. The tests keep the surface present across the focused seed set, but they do not make any individual beauty window a hard CI blocker.
