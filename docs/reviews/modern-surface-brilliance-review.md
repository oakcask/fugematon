# Modern Surface Brilliance Review

## Finding

`seed-19l7uit-1u226cc` sounds brighter than `fugue-smoke` because it combines dense short-note motion, active free counterpoint, four-voice texture, and modal color. The effect is musically useful for Fugematon's modern listening target, especially if jazz / pops influence is allowed to coexist with fugue procedure.

The new `surfaceBrilliance` diagnostic records this as a positive review signal rather than a strict-classical error. It does not replace counterpoint, harmony, or score-window acceptance checks.

## Evidence

Reviewed seeds:

| Seed | Role | Musical symptom |
| --- | --- | --- |
| `seed-19l7uit-1u226cc` | reported case | Kinetic modal surface: many short support notes, Bb aeolian / related aeolian contexts, frequent full texture. |
| `fugue-smoke` | representative control | Major-key fugue control with strong counter-subject identity and less modal color. |
| `dense-modal` | modal control | Independent modal seed confirming that modal color is not tied to one reported seed. |
| `bach-001` | tonal control | Major-key control with zero modal-color share. |

The reported seed should be read as evidence for a structural profile: short-note motion plus support-density plus modal color. It should not become a literal seed-specific scoring exception.

## Project Response

`GenerationDiagnostics.surfaceBrilliance` is review-only. It records:

* `score`: aggregate surface-brilliance strength.
* `signals`: short-note motion, support-motion density, upper-register activity, four-voice density, modal color, pivot ambiguity, and stretto compression.
* `tradeoffs`: counter-subject identity loss, entry friction, lockstep texture, and weak ornament support.

The tradeoffs matter because a shiny surface can also mask weak fugue identity. For current adoption, high `surfaceBrilliance.score` is desirable only when score-window acceptance and counter-subject / entry-harmony review do not show unresolved musical problems.

## CI / Review Scope

`surfaceBrilliance` is `review-required`: it is a positive aesthetic signal for manual and bundle review, not a CI-blocking threshold. Keep it in diagnostics and review summaries, and use it to compare seeds or candidate models when evaluating modern color and listening freshness.

