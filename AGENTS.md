# Rules for Agents

- Do not include environment-specific information or personal information in any deliverable.
- This applies to source code, generated files, documentation, comments, tests, examples, logs, and commit messages.
- Avoid absolute local paths, usernames, hostnames, machine names, local repository locations, private tokens, email addresses, and other personally identifying details.
- Use generic placeholders or relative paths when such information is necessary for explanation.

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
