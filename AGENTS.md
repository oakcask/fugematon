# Rules for Agents

## Always

- Do not include environment-specific information or personal information in any deliverable.
- This applies to source code, generated files, documentation, comments, tests, examples, logs, and commit messages.
- Avoid absolute local paths, usernames, hostnames, machine names, local repository locations, private tokens, email addresses, and other personally identifying details.
- Use generic placeholders or relative paths when such information is necessary for explanation.

## Project Context

- When looking for project plans, implementation phases, design rationale, or open work, start with `docs/README.md`.
- Use the docs index to choose only the relevant planning documents, such as `docs/reference/technical-plan.md`, `docs/reference/design.md`, and the current phase notes.
- Before changing planned behavior or phase scope, check the relevant docs and keep the docs aligned with the code change.
- When a rejected implementation, failed experiment, or decision not to proceed changes future work, record the lesson in the relevant phase, review, or reference doc before finalizing. Include the observed tradeoff, affected metrics or seeds when available, and the planning constraint it creates.
- When generating review bundles for verification, write `pnpm fugematon review --out` under `samples/<review-name>` so generated JSON and MIDI files match existing ignore rules. Do not use unignored temporary directories such as `.tmp` for review output.
- When changing a music-quality gate, diagnostics threshold, generator model, candidate scoring model, evaluation weights, or section/planner model, generate scores for several relevant seeds and run a music-theory review without waiting for human listening. Treat this as agent-side evidence that approximates human musical judgement. Include representative, boundary, rotation, or adversarial seeds as appropriate, and record the reviewed seeds, musical findings, affected metrics, tradeoffs, and remaining human-listening gaps in the relevant phase or review doc.
- For generation-quality changes, do not preserve old regression-test expected values just because they are already fixed. If review bundles, diagnostics, and music-beauty review across relevant seeds show that the generated music improved, update regression-test expectations to the new quality baseline. Record affected seeds, tradeoffs, and any remaining regressions in the relevant phase or review doc.

## Code Changes

- When changing code, proactively make small, nearby refactors that improve progressive disclosure and reduce how much context future agents must read.
- Prefer refactors that co-locate highly related data, types, tests, and helpers; extract named helpers or modules that hide incidental complexity behind a small interface; and split long files only when it improves discovery or task-focused reading.
- For PR-sized work, put meaningful behavior-preserving refactors in a prerequisite stacked PR before the feature, fix, or scoring change they prepare. Keep the main PR focused on the intended behavior change; only trivial same-line cleanup should stay in that main PR.
- Keep these refactors behavior-preserving unless the task explicitly changes behavior, and keep them within the touched ownership boundary. Do not start broad architectural rewrites while doing a feature or bug fix.
- If a refactor changes a public contract, generated output shape, or planned behavior, update the relevant tests and docs in the same change.

## Task-Specific Skills

- Use `docs-progressive-disclosure` when creating, reorganizing, splitting, merging, or maintaining documentation structure.
- Use `conventional-commits` when authoring commit messages or PR titles.
- Use `change-rationale-writing` when drafting commit bodies, PR descriptions, changelog entries, release notes, or decision records.
- Use `github-pr-operations` when creating, editing, or managing pull requests with GitHub CLI.
- Use `ui-inspection` when browser-level Web UI validation is needed.
- Use `dependency-review` before adding, choosing, upgrading, or approving third-party dependencies.
- Use `music-theory-review` when reviewing generated music, diagnostics, MIDI, score events, music-quality gates, or phase plans for counterpoint, harmony, fugue form, style fit, or literature-grounded music-theory issues.
- Use `bibliography-fetch` when finding references, citations, source lists, papers, books, standards, URLs, or source verification for research, writing, documentation, or literature reviews.
- Use `bibliography-cache` when creating, updating, inspecting, normalizing, or validating cached bibliography records for references, citations, search results, source metadata, and access dates.
