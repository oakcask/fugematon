# Rules for Agents

- Do not include environment-specific information or personal information in any deliverable.
- This applies to source code, generated files, documentation, comments, tests, examples, logs, and commit messages.
- Avoid absolute local paths, usernames, hostnames, machine names, local repository locations, private tokens, email addresses, and other personally identifying details.
- Use generic placeholders or relative paths when such information is necessary for explanation.

## Project Context

- When looking for project plans, implementation phases, design rationale, or open work, start with `docs/README.md`.
- Use the docs index to choose only the relevant planning documents, such as `docs/technical-plan.md`, `docs/design.md`, and the current phase notes.
- Before changing planned behavior or phase scope, check the relevant docs and keep the docs aligned with the code change.

## Change Messages

- Write all commit messages, PR titles, PR descriptions, changelog entries, and release notes authored by agents in English.
- If source material, user requests, or generated drafts are in another language, translate the final change message into clear reviewer-facing English before publishing it.
- Avoid GitHub mention syntax in change messages unless deliberately notifying a user or team. In PR descriptions, prefer root scripts such as `pnpm build`, package directory names such as `packages/web`, or escaped scoped package names.

## GitHub CLI

- When creating or editing pull requests, run `gh pr create` or `gh pr edit` directly so existing command-prefix approval rules can match it.
- Do not wrap `gh pr create` or `gh pr edit` in `bash -lc`, shell functions, command substitutions, or inline environment assignments unless the user explicitly requests that form.
- If a direct `gh pr create` or `gh pr edit` fails with a GitHub API connection error, treat it as a sandbox network failure and retry the same direct command with the existing GitHub CLI approval prefix instead of stopping at the first failure.

## UI Inspection

- When inspecting the Web UI in a browser, start the Vite development server with `pnpm web:dev`.
- Use the local URL printed by Vite for browser automation, screenshots, console checks, and responsive layout checks.
- Run `pnpm ui:inspect` for the headless Playwright smoke inspection when browser-level validation is needed.

## Dependencies

- Before adding a new dependency, prefer actively maintained projects with recent releases, responsive issue handling, and clear ownership.
- Do not choose stale or abandoned packages when a maintained alternative exists.
- Review the dependency's source, install scripts, published package contents, and transitive dependency surface for security risks before adoption.
- Avoid or mitigate risks such as credential access, unexpected network calls, filesystem writes, postinstall behavior, obfuscated code, excessive permissions, and unexpected native code.
- Use the `dependency-review` skill for detailed dependency evaluation, especially when adding a new runtime dependency or when the dependency has broad permissions, install scripts, native code, or unclear maintenance status.
- Document the reason for adding the dependency and any relevant risk mitigation in the change description.
