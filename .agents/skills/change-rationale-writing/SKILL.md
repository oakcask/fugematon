---
name: change-rationale-writing
description: Use when drafting or revising commit message bodies, pull request descriptions, merge request descriptions, changelog-style summaries, or release note text. Focus the writing on the purpose, intent, consequences, tradeoffs, risks, and reviewer-relevant context behind code changes rather than restating what the diff already shows.
---

# Change Rationale Writing

## Goal

When writing commit message bodies or pull request descriptions, explain why the change exists and what it means. Do not spend most of the text restating implementation details that reviewers can read directly from the diff.

## Core Emphasis

Prioritize:

- **Intent**: What problem, user need, operational pain, or design goal motivated the change?
- **Reasoning**: Why is this approach appropriate compared with the likely alternatives?
- **Consequences**: What behavior, compatibility, workflow, performance, security, or maintenance effects should readers expect?
- **Risks**: What could still fail, regress, or surprise users and maintainers?
- **Confidence**: What evidence reduces risk, such as tests, manual checks, logs, rollout constraints, or prior incidents?

De-emphasize:

- File-by-file summaries.
- Function-by-function narration.
- Repeating renamed symbols, moved code, or mechanical edits unless those details explain intent or risk.
- Generic phrases such as "updated code", "made changes", or "refactored logic" without rationale.

## Workflow

Before drafting:

1. Inspect the actual diff, issue context, tests, and user request when available.
2. Infer the central intention of the change.
3. Identify direct consequences for users, operators, developers, APIs, data, or deployment.
4. Identify residual risks and any verification performed.
5. Write the body or description so a future reader understands the decision without rereading the entire diff.

If the intent or risk cannot be inferred, state the uncertainty briefly instead of inventing a reason.

## Commit Message Bodies

Use a commit body when the subject alone does not explain the reason or implications. Keep it concise, usually one to three short paragraphs.

Good commit bodies answer:

- Why was this change necessary now?
- What important behavior or contract changes?
- What tradeoff or risk should future maintainers know?

Avoid bodies that only say what files changed.

## Pull Request Descriptions

Prefer this structure when no repository template exists:

```markdown
## Intent

...

## Consequences

...

## Risks

...

## Verification

...
```

Adapt headings to the repository's existing template. If a template asks for "Summary", use that section to describe intent and impact, not just implementation.

## Writing Style

- Be specific and concrete.
- Tie risks to affected behavior, data, compatibility, or operations.
- Mention implementation details only when they clarify the rationale, consequence, or review focus.
- Keep claims proportional to evidence.
- Do not include environment-specific or personal information.

## Examples

Weak:

```text
Updated the parser and added tests.
```

Better:

```text
The parser now treats empty input as a valid no-op so callers can pass optional configuration without pre-filtering. This keeps the API tolerant while preserving existing error behavior for malformed input.

The main risk is that downstream code may have relied on the previous exception path for empty input, so the tests cover both empty and invalid cases.
```

Weak:

```markdown
## Summary

- Changed auth middleware
- Updated session tests
```

Better:

```markdown
## Intent

Expired sessions were being reported as generic authorization failures, which made support and retry behavior harder to distinguish from genuine permission problems.

## Consequences

Clients now receive a session-specific failure path and can prompt reauthentication without treating the account as unauthorized.

## Risks

This changes an error classification that some callers may have matched directly. The compatibility risk is limited to expired-session handling.

## Verification

Covered the expired-session branch and the existing unauthorized branch in tests.
```
