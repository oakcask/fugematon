# Endless Program Terminal Cadence Review

## Findings

The generated baseline did not provide acceptable terminal closure for the focused seed set. The repeated symptom was not a single bad cadence label: the last inspected window usually had no active low-voice support or stable outer-voice landing at the cadence target, so the boundary would be hidden by playback behavior rather than proven by score evidence.

Theory basis: common-practice cadence and fugue-form source families for authentic cadence closure, plus modal-cadence source family for modal seeds. The project response is generator and diagnostics repair, not UI-only smoothing.

| Seed | Baseline classification | Baseline cadence | Baseline symptom | Repaired classification | Repaired cadence |
| --- | --- | --- | --- | --- | --- |
| `fugue-smoke` | generator-response-required | half | missing low support and outer landing | accepted | authentic |
| `modal-cadence` | generator-response-required | modal | missing low support and outer landing | accepted | modal |
| `sparse-cadence` | generator-response-required | deceptive | missing low support and outer landing | accepted | authentic |
| `dense-modal` | generator-response-required | modal | missing low support and outer landing | accepted | modal |
| `tight-stretto` | generator-response-required | evaded | missing low support and outer landing | accepted | authentic |
| `circle-fifths` | generator-response-required | authentic | missing low support and outer landing | accepted | authentic |
| `bach-001` | generator-response-required | half | missing low support and outer landing | accepted | authentic |
| `minor-entry` | generator-response-required | evaded | missing low support and outer landing | accepted | authentic |

The repair is structural: `endless-program` and `regenerative-cycle` reserve the terminal boundary for a cadence sonority and mark the final cadence as authentic or modal based on the target key. `continuous-fugue` keeps hidden-boundary semantics and reports terminal closure as `not-required`.

## Verification

The focused after-pass used the same seed set with `mode: "endless-program"` and `lengthTicks: 129600`. Every repaired seed produced root-supported low voice, stable outer voices, and zero unresolved boundary dissonances in `terminalClosureReview`.

The final target review regenerated `fugue-smoke`, `modal-cadence`, `sparse-cadence`, `dense-modal`, `tight-stretto`, `circle-fifths`, `bach-001`, and `minor-entry` under `samples/endless-program-terminal-cadence-current/`. It compared the regenerated ScoreEvent and diagnostics files against the baseline ScoreEvent files listed in `prompts/TARGET.md` by re-running the terminal-closure helper over the baseline section plans.

| Seed | Baseline terminal review | Current terminal review | Current support evidence |
| --- | --- | --- | --- |
| `fugue-smoke` | generator-response-required, half cadence | accepted, authentic cadence | root-supported low voice, stable outer voices, 0 unresolved boundary dissonances |
| `modal-cadence` | generator-response-required, modal cadence | accepted, modal cadence | root-supported low voice, stable outer voices, 0 unresolved boundary dissonances |
| `sparse-cadence` | generator-response-required, deceptive cadence | accepted, authentic cadence | root-supported low voice, stable outer voices, 0 unresolved boundary dissonances |
| `dense-modal` | generator-response-required, modal cadence | accepted, modal cadence | root-supported low voice, stable outer voices, 0 unresolved boundary dissonances |
| `tight-stretto` | generator-response-required, evaded cadence | accepted, authentic cadence | root-supported low voice, stable outer voices, 0 unresolved boundary dissonances |
| `circle-fifths` | generator-response-required, authentic cadence | accepted, authentic cadence | root-supported low voice, stable outer voices, 0 unresolved boundary dissonances |
| `bach-001` | generator-response-required, half cadence | accepted, authentic cadence | root-supported low voice, stable outer voices, 0 unresolved boundary dissonances |
| `minor-entry` | generator-response-required, evaded cadence | accepted, authentic cadence | root-supported low voice, stable outer voices, 0 unresolved boundary dissonances |

Focused tests cover authentic, modal, half, deceptive, evaded, unsupported-thinning, and final-rest boundary cases. Generation tests compare `continuous-fugue` and `endless-program` for the same seed and confirm the intent changes only terminal-boundary score material.

Validation commands:

* `pnpm build`
* `node --test packages/core/dist/generate-terminal-closure-review.test.js packages/core/dist/public-contract.integration.test.js packages/core/dist/infinite-playback.test.js packages/web/dist/generation-worker.test.js`
* `pnpm ui:inspect`
* `pnpm test`

## CI / Review Scope

Touched metric: `terminalClosureReview`.

Classification: `ci-blocking` for schema, mode behavior, and focused synthetic boundary cases; `ci-observed` for focused generated seed classifications; `manual-listening` for final subjective cadence quality.

Reason: the summary is deterministic, cheap, and maps directly to generator or diagnostics repair when a required terminal segment lacks cadence evidence. Broader aesthetic judgement of cadence quality still needs listening review.

Action: keep synthetic and public-contract checks in CI, keep focused seed results as review evidence, and do not promote the whole seed set to a permanent blocker until runtime and false rejection behavior are reviewed.

Evidence gap: no human listening pass was performed.
