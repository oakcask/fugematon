---
name: conventional-commits
description: Require Conventional Commits for git commit messages and PR titles authored by Codex. Use whenever Codex is asked to create, amend, squash, rewrite, or otherwise author a commit message or PR title, including direct requests like "commit this", "make a commit", "git commit", "amend the commit", "open a PR", or "create a PR".
---

# Conventional Commits

## Overview

Use Conventional Commits for every commit message and PR title authored by Codex. Choose a clear type, optional scope, and concise imperative summary based on the actual staged changes or PR contents.

## Message And Title Rules

Use this format:

```text
<type>[optional scope][!]: <description>

[optional body]

[optional footer(s)]
```

- Use common types such as `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `chore`, or `revert`.
- Use `chore` for CI-related changes, including workflow, pipeline, and automation updates.
- Use `chore` for agent-instruction changes, including `AGENTS.md` and skills updates.
- Add a scope when it makes the affected area clearer, for example `fix(auth): handle expired tokens`.
- Use `!` and a `BREAKING CHANGE:` footer when the change breaks public behavior or compatibility.
- Keep the subject short, lower-case after the type when natural, and do not end it with a period.
- Use an imperative description, for example `fix(parser): handle empty input`.

## Workflow

Before creating or amending a commit:

1. Inspect the staged diff and repository status.
2. Infer the primary intent of the staged changes.
3. Select the most specific conventional type and scope.
4. If multiple unrelated intents are staged, tell the user and either split commits when asked or choose the dominant intent.
5. Create the commit with a Conventional Commit message.

Before creating or updating a PR title:

1. Inspect the PR diff or branch changes.
2. Infer the primary intent of the PR.
3. Select the most specific conventional type and scope.
4. Write the PR title as a single Conventional Commit subject line.
5. If the PR combines unrelated intents, tell the user and choose the dominant intent unless asked to split the work.

## Examples

- `feat(cli): add dry-run option`
- `fix(api): preserve request headers`
- `docs(readme): clarify setup steps`
- `refactor(cache)!: replace storage format`
