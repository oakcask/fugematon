# Phase 14 Dissonance Triage Implementation Review

This review records the first Phase 14A0 implementation slice. It adds `phase14DissonanceTriage` as score-window evidence for the post-13Z dissonance tradeoff. The change does not alter generated notes; it makes the weak-passing, passing-neighbor/offbeat, and entry-local clash evidence visible before generator adoption.

## Findings

### 1. Focused triage seeds expose the expected dissonance tradeoff

Affected seeds: `contrary-motion`, `tight-stretto`, `circle-fifths`, `modal-cadence`, and `dense-modal`.

| Seed | Weak-passing semitone clash ticks | Passing-neighbor/offbeat semitone clash ticks | Entry adjacent-second friction | Unresolved accented entry clash |
| --- | ---: | ---: | ---: | ---: |
| `contrary-motion` | 4800 | 19920 | 97 | 32 |
| `tight-stretto` | 7440 | 18000 | 60 | 27 |
| `circle-fifths` | 2160 | 17040 | 122 | 37 |
| `modal-cadence` | 2400 | 6240 | 65 | 11 |
| `dense-modal` | 1680 | 6720 | 62 | 2 |

Theory basis: species counterpoint permits passing and neighboring dissonance only when it is prepared and resolved by local voice leading. Fugue entry practice also requires the subject or answer to remain intelligible, so repeated semitone friction around entries remains review-required evidence.

Current diagnostics coverage: improved. The evidence is now grouped under `phase14DissonanceTriage` with representative windows carrying section state, voices, roles, metrical-harmony intents, and review-required response.

Project response: keep this as Phase 14A0 score-window evidence. Do not treat the aggregate counts as hard failures until a later generator repair identifies a deterministic, localized acceptance target.

## Structural Hypothesis

Symptom: Phase 13Z improved long-run phrase development but left local semitone friction around weak-passing and entry windows uneven across focused seeds.

Repeated pattern: weak-passing and passing-neighbor/offbeat support can create repeated semitone clashes while entry windows still show adjacent-second friction and unresolved accented clashes.

Evidence strength: confirmed as diagnostics evidence across the five focused Phase 14A0 seeds. No listening pass was added in this implementation slice.

Project response: use the new summary as the score-window harness input for Phase 14B candidate construction and scoring. Generator changes should prefer prepared passing, neighboring, suspended, cadential, or stretto-functional explanations over raw count reduction.

## CI / Review Scope

| Item | Classification | Reason | Action |
| --- | --- | --- | --- |
| `phase14DissonanceTriage` | `review-required` | The signal is musical and context-sensitive; weak dissonance can be valid when prepared and resolved. | Keep in diagnostics and review bundles. Do not make the aggregate counts PR-blocking. |
| Focused Phase 14A0 seed set | `review-required` | The five seeds are needed to classify the post-13Z tradeoff by seed and section, but they are too aesthetic for a new hard gate. | Keep focused test coverage broad and use score-window review for adoption. |
