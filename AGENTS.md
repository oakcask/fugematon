# Rules for Agents

## Always

- Do not include environment-specific information or personal information in any deliverable.
- This applies to source code, generated files, documentation, comments, tests, examples, logs, and commit messages.
- Treat gitignored files the same way: do not quote, copy, summarize, or expose their contents unless explicitly requested and sanitized.
- Avoid absolute local paths, usernames, hostnames, machine names, local repository locations, private tokens, email addresses, and other personally identifying details.
- Use generic placeholders or relative paths when such information is necessary for explanation.
- Keep `AGENTS.md` as a short entry point. Move task-specific procedures, commands, checklists, and troubleshooting into skills, leaving only always-on rules or skill links here.

## Project Context

- When looking for project plans, implementation phases, design rationale, or open work, start with `docs/README.md`.
- Use the docs index to choose only the relevant planning documents.
- Before changing planned behavior or phase scope, check the relevant docs and keep them aligned with the change.
- When literature or citation evidence affects implementation direction, phase scope, quality gates, review acceptance, or license policy, keep `.bibliography-cache/` as working cache and promote the sanitized citation or claim mapping through `docs/reference/bibliography/`.
- When a rejected implementation, failed experiment, or decision not to proceed changes future work, record the durable lesson in the relevant phase, review, or reference doc.
- Use `music-theory-review` before finalizing changes to generation quality, diagnostics thresholds, music-quality gates, scoring models, or section/planner behavior.
- When handling music-quality metric regressions, do not treat the number alone as the reason to accept or reject a change. Record the affected seed or section, the concrete musical symptom, the tradeoff, and whether the response belongs in generation, scoring, diagnostics, docs, or manual listening.

## Code Changes

- When changing code, make small, nearby, behavior-preserving refactors that improve progressive disclosure within the touched ownership boundary.
- Keep PR-sized refactors in prerequisite stacked PRs when they prepare later feature, fix, or scoring work.
- If a change affects a public contract, generated output shape, or planned behavior, update the relevant tests and docs.
- Place scripts invoked from GitHub Workflows under `workflow-scripts/`.

## Task-Specific Skills

- Use `docs-progressive-disclosure` when creating, reorganizing, splitting, merging, or maintaining documentation structure.
- Use `repo-guardrails` when adding, revising, or evaluating agent behavior rules, repository policies, AGENTS.md instructions, workflow safety, or enforcement mechanisms.
- Use `conventional-commits` when authoring commit messages or PR titles.
- Use `change-rationale-writing` when drafting commit bodies, PR descriptions, changelog entries, release notes, or decision records.
- Use `github-pr-operations` when creating, editing, or managing pull requests with GitHub CLI.
- Use `github-actions-inspection` when inspecting GitHub Actions workflow runs, jobs, logs, artifacts, or check failures with GitHub CLI.
- Use `ui-inspection` when browser-level Web UI validation is needed.
- Use `dependency-review` before adding, choosing, upgrading, or approving third-party dependencies.
- Use `music-theory-review` when reviewing generated music, diagnostics, MIDI, score events, music-quality gates, or phase plans for counterpoint, harmony, fugue form, style fit, or literature-grounded music-theory issues.
- Use `bibliography-fetch` when finding references, citations, source lists, papers, books, standards, URLs, or source verification for research, writing, documentation, or literature reviews.
- Use `bibliography-cache` when creating, updating, inspecting, normalizing, or validating cached bibliography records for references, citations, search results, source metadata, and access dates.
