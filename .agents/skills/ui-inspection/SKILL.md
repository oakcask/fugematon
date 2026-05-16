---
name: ui-inspection
description: Use when browser-level Web UI validation is needed, including Vite development server startup, Playwright smoke inspection, screenshots, console checks, and responsive layout checks.
---

# UI Inspection

## Goal

Validate the Web UI through the same local Vite server that users and browser automation exercise.

## Workflow

1. Start the Vite development server with `pnpm web:dev`.
2. Use the local URL printed by Vite for browser automation, screenshots, console checks, and responsive layout checks.
3. Run `pnpm ui:inspect` for the headless Playwright smoke inspection when browser-level validation is needed.
4. Capture or inspect the smallest set of views needed to verify the UI behavior changed by the task.
5. Report any console errors, layout issues, blank canvas states, or responsive breakpoints that remain risky.

## Notes

- Keep the dev server running only while it is needed for inspection.
- If the default port is already in use, use the alternate local URL printed by Vite.
- Prefer screenshots and console output from the running app over assumptions from static code inspection when validating visual behavior.

## Output

When reporting the result, include:

- The local URL used for inspection.
- The inspection command or browser checks run.
- Any viewport sizes or key screens checked.
- Remaining visual, console, or interaction risks.
