import assert from "node:assert/strict";
import test from "node:test";
import { validatePullRequestDescription } from "./check-pr-description-template.mjs";

test("accepts the PR template sections with optional stack preface", () => {
  const result = validatePullRequestDescription(
    [
      "Stack: 2 of 3. Depends on #123.",
      "",
      "## Intent",
      "",
      "Explain why this change is needed.",
      "",
      "## Consequences",
      "",
      "None.",
      "",
      "## Risks",
      "",
      "Review the boundary behavior.",
      "",
      "## Verification",
      "",
      "- pnpm test",
    ].join("\n"),
  );

  assert.equal(result.valid, true);
});

test("rejects the old summary and tests section format", () => {
  const result = validatePullRequestDescription(
    [
      "Stack: 2 of 3. Depends on #280.",
      "",
      "Summary:",
      "- extract counter-subject support-collision counting into named predicates",
      "",
      "Tests:",
      "- pnpm lint",
    ].join("\n"),
  );

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, [
    "Use exactly these H2 sections in this order: ## Intent, ## Consequences, ## Risks, ## Verification.",
  ]);
});

test("rejects missing, extra, or reordered H2 sections", () => {
  const result = validatePullRequestDescription(
    [
      "## Intent",
      "Motivation.",
      "",
      "## Verification",
      "- pnpm test",
      "",
      "## Risks",
      "Unexpected order.",
      "",
      "## Notes",
      "Extra section.",
    ].join("\n"),
  );

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, [
    "Use exactly these H2 sections in this order: ## Intent, ## Consequences, ## Risks, ## Verification.",
  ]);
});

test("rejects template sections left with only comments", () => {
  const result = validatePullRequestDescription(
    [
      "## Intent",
      "<!-- Explain the motivation. -->",
      "",
      "## Consequences",
      "None.",
      "",
      "## Risks",
      "None.",
      "",
      "## Verification",
      "- pnpm test",
    ].join("\n"),
  );

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, ["## Intent must contain reviewer-facing content."]);
});
