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
- For generation-quality changes, do not preserve old regression-test expected values just because they are already fixed. If review bundles, diagnostics, and music-beauty review across relevant seeds show that the generated music improved, update regression-test expectations to the new quality baseline. Record affected seeds, tradeoffs, and any remaining regressions in the relevant phase or review doc.

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
