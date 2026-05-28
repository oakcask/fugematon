# Rules for Agents

## Always

- Do not include environment-specific information or personal information in any deliverable.
- This applies to source code, generated files, documentation, comments, tests, examples, logs, and commit messages.
- Treat gitignored files the same way: do not quote, copy, summarize, or expose their contents unless explicitly requested and sanitized.
- Avoid absolute local paths, usernames, hostnames, machine names, local repository locations, private tokens, email addresses, and other personally identifying details.
- Use generic placeholders or relative paths when such information is necessary for explanation.
- Keep git commands noninteractive when they might open an editor, unless interactive editor behavior is explicitly requested.
- Do not pass Markdown commit messages or PR descriptions with backticks through shell-interpreted inline strings; pass them through message/body files.
- Keep `AGENTS.md` as a short entry point. Move task-specific procedures, commands, checklists, and troubleshooting into skills, leaving only always-on rules or skill links here.
- Design CI failures, exceptions, warnings, and logs so the message includes a searchable error id, why the failure matters, and the action needed to fix it.

## Project Context

- When looking for project plans, implementation phases, design rationale, or open work, start with `docs/README.md`.
- Use the docs index to choose only the relevant planning documents.
- Before changing planned behavior or phase scope, check the relevant docs and keep them aligned with the change.
- When literature or citation evidence affects implementation direction, phase scope, quality gates, review acceptance, or license policy, keep `.bibliography-cache/` as working cache and promote the sanitized citation or claim mapping through `docs/reference/bibliography/`.
- When a rejected implementation, failed experiment, or decision not to proceed changes future work, record the durable lesson in the relevant phase, review, or reference doc.
- Use `music-theory-review` before finalizing changes to generation quality, diagnostics thresholds, music-quality gates, scoring models, or section/planner behavior.
- When repairing model behavior from a user-reported musical symptom, do not hard-code the fix to one seed, time signature, key signature, pitch name, chord, voice name, or measure unless the feature is explicitly scoped that way. Preserve the reported case as regression evidence, then express the repair in terms of the underlying musical structure and verify it against at least one related variant or control.
- When handling music-quality metric regressions, do not treat the number alone as the reason to accept or reject a change. Record the affected seed or section, the concrete musical symptom, the tradeoff, and whether the response belongs in generation, scoring, diagnostics, docs, or manual listening.

## Code Changes

- When changing code, make small, nearby, behavior-preserving refactors that improve progressive disclosure within the touched ownership boundary.
- Keep PR-sized refactors in prerequisite stacked PRs when they prepare later feature, fix, or scoring work.
- If a change affects a public contract, generated output shape, or planned behavior, update the relevant tests and docs.
- When renaming or removing symbols, fields, exported types, JSON keys, CLI output keys, metrics, diagnostics names, or aliases, use `symbol-rename-audit` before reporting the work complete.
- Follow `docs/reference/error-message-guidelines.md` when adding or changing CI, exception, warning, or log messages.
- Place scripts invoked from GitHub Workflows under `workflow-scripts/`.

## Required Skill Guardrails

- Use `dependency-review` before adding, choosing, upgrading, or approving third-party dependencies.
- Use `bibliography-fetch` and `bibliography-cache` when literature or citation evidence affects implementation direction, phase scope, quality gates, review acceptance, or license policy.
