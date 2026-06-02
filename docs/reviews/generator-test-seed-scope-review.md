# Generator Test Seed Scope Review

## Findings

* `score-beauty` review tests were running the full representative plus rotation sweep in six source files. The guarded metrics are aggregate review signals: initial subject rhythm diversity, local climax diversity, subject-fragment family share, unresolved entry severe interval duration, and counter-subject identity retention. These remain useful as CI evidence, but the full sweep is broader than a PR-blocking set.
* `current-beauty-blockers` repeated the same `score-beauty` batches in six additional source files. The metrics are mostly quality-vector observation and review-readiness signals: lockstep review axes, pitch-class unison review axes, local sentinels, classified entry sonorities, fragment-function evidence, counter-subject windows, and function-aware lockstep coverage. This duplicated generated scores without adding a distinct seed class.
* A module-level generated-score cache would not address the main cost because `node --test` runs matched files in separate test processes. A production `generateScore` cache would create memory and behavior risk outside tests, so seed thinning is the lower-risk change.

## Change

* Reduced `score-beauty` CI coverage to eight seeds:
  `bach-001`, `fugue-smoke`, `minor-entry`, `modal-dorian`, `sparse-cadence`, `close-imitation`, `modal-answer`, and `dense-modal`.
* Reduced `current-beauty-blockers` CI coverage to four focused seeds:
  `fugue-smoke`, `modal-dorian`, `modal-answer`, and `dense-modal`.
* Removed the extra `score-beauty` and `current-beauty-blockers` batch files that only extended review sweep breadth.

## CI / Review Scope

* `score-beauty` aggregate metrics: `ci-observed`. Reason: they catch deterministic drift in diversity, severe-entry interval pressure, and counter-subject retention, but aggregate beauty signals still need review when they regress. Action: keep the focused CI subset and use wider review bundles for phase evidence.
* `current-beauty-blockers` quality-vector readiness metrics: `ci-observed`. Reason: the focused seeds preserve modal and adversarial pressure without rerunning the full sweep. Action: keep as focused CI evidence.
* Removed review-sweep seeds outside the focused subsets: `review-required`. Reason: they are useful for musical trend review but are too broad for routine PR feedback. Action: regenerate wider review bundles when changing scoring, diagnostics, or generator behavior that affects these axes.

## Remaining Work

* The slowest remaining generator test file is the terminal-closure review. It should be handled separately because it covers different continuous/endless-program behavior and longer terminal-coda generation.
