---
name: github-actions-inspection
description: Use when inspecting GitHub Actions workflow runs, jobs, logs, artifacts, or check failures with GitHub CLI, especially when searching run output or avoiding repeated approval prompts from shell pipelines.
---

# GitHub Actions Inspection

## Goal

Inspect GitHub Actions runs efficiently while preserving approval rules and avoiding repeated prompts caused by piping network output through local tools.

## Workflow

1. Identify the run, job, artifact, or check failure to inspect.
2. Prefer direct `gh run` or `gh api` commands with built-in flags, fields, and JSON filtering when that gives enough information.
3. When log or artifact output needs repeated searching, fetch or save the GitHub data once into a disposable cache file without shell redirection, then run local searches against that file.
4. Search cached files with `rg` in a separate local command.
5. Report only sanitized, task-relevant excerpts or summaries. Do not quote secrets, local paths, hostnames, usernames, or irrelevant log content.

## Command Rules

- Do not combine network-producing `gh run` or `gh api` commands with `rg`, `grep`, `sed`, `awk`, `jq`, `tee`, or similar local processing in a single shell pipeline, except for the cache helper below.
- Avoid command substitutions that embed `gh run` or `gh api` output into another command.
- Avoid shell redirection on network-producing `gh run` or `gh api` commands. Redirection can prevent approval-prefix matching and force approval for the whole command line.
- To cache large output, pipe only into `node .agents/skills/github-actions-inspection/scripts/cache-stdin.mjs OUTPUT_PATH`; keep the `gh` segment direct so approval can match `["gh", "run"]` or `["gh", "api"]`.
- If a command needs approval, request it for the stable GitHub CLI prefix such as `["gh", "run"]` or `["gh", "api"]`, not for the local search step.
- Use cache paths under ignored working directories such as `.cache/` or `tmp/`, and keep cache file names generic.
- Treat cached GitHub output as sensitive working data: do not copy it into docs, commits, PR descriptions, comments, or final answers unless explicitly requested and sanitized.

## Examples

Prefer this shape:

```sh
gh run view RUN_ID --job JOB_ID --log | node .agents/skills/github-actions-inspection/scripts/cache-stdin.mjs .cache/github/job-log.txt
rg -i "failure|error|timeout" .cache/github/job-log.txt
```

Avoid this shape:

```sh
gh run view RUN_ID --job JOB_ID --log > .cache/github/job-log.txt
gh run view RUN_ID --log | rg -i "failure|error|timeout"
```
