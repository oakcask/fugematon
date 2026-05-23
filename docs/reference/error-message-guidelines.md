# Error Message Guidelines

Design CI failures, exceptions, warnings, and logs so agents and humans can act on them without needing extra context. New messages and message changes should include `id`, `why`, and `action` whenever practical.

## Required Fields

* `id`: A stable identifier for searching, issues, PRs, and log aggregation. Do not rename it without a clear reason.
* `why`: A short explanation of why the failure or warning matters, not only what happened. For CI, name the protected gate or contract. For warnings, name the risk of ignoring it.
* `action`: A concrete next step. When useful, include the verification command, relative path, affected seed, setting name, or ownership boundary.

## Scope

This guidance applies to:

* CI failure annotations, workflow script `console.error` output, and test failure helpers.
* Production exceptions, warnings, logs, and CLI errors.
* Diagnostics or review summaries that present failures or warnings to humans or agents.

Low-level internal assertions should move toward the same shape when they can surface through a user-facing or CI-facing layer.

## Message Shape

Use structured object fields where the surface supports them.

```text
id: ci.seed-diagnostics.missing-report
why: CI cannot compare diagnostics because one expected seed report was not produced.
action: Re-run the diagnostics command for the listed seed, then check whether the generator failed before writing the report.
```

If the message must be a single-line exception or log entry, keep the three elements readable.

```text
ci.seed-diagnostics.missing-report: missing diagnostics report; why=CI cannot compare the expected seed output; action=rerun diagnostics for the listed seed and inspect the generator error before report writing
```

## Writing Rules

* Keep `id` short and searchable, using lower-kebab or dotted form.
* Do not let `why` restate only the symptom. Name the protected contract, quality gate, compatibility concern, reproducibility concern, or user impact.
* Do not let `action` end at generic advice such as "fix the error." Name the smallest useful next step.
* Do not expose environment-specific details, absolute paths, usernames, hostnames, tokens, private URLs, or gitignored file contents unless they are necessary to fix the failure.
* When changing an error shape that is part of a public contract, update compatibility notes, tests, and docs together.
* For security-sensitive errors, include `why` and `action` only to the extent that they do not give attackers useful extra information. Split sensitive details into internal logs when needed.

## When Full Detail Is Not Practical

When third-party exceptions, short assertions, or hot-path logs cannot directly include all fields, add `id`, `why`, and `action` in the wrapper, CI helper, or catch-site annotation. The first failure surface a human sees should provide all three elements whenever practical.
