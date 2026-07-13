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

test("accepts a breaking PR title when the description explains the breaking change", () => {
  const result = validatePullRequestDescription(
    [
      "## Intent",
      "",
      "Replace the compatibility aliases with the semantic fields.",
      "",
      "## Consequences",
      "",
      "Consumers must read the semantic diagnostic fields.",
      "",
      "BREAKING CHANGE: Generated diagnostics no longer emit the old numbered aliases.",
      "",
      "## Risks",
      "",
      "Downstream callers may still read the removed aliases.",
      "",
      "## Verification",
      "",
      "- pnpm test",
    ].join("\n"),
    { title: "refactor(core)!: remove legacy diagnostic aliases" },
  );

  assert.equal(result.valid, true);
});

test("rejects a breaking PR title without a BREAKING CHANGE line", () => {
  const result = validatePullRequestDescription(
    [
      "## Intent",
      "",
      "Replace the compatibility aliases with the semantic fields.",
      "",
      "## Consequences",
      "",
      "Consumers must read the semantic diagnostic fields.",
      "",
      "## Risks",
      "",
      "This is a breaking API cleanup.",
      "",
      "## Verification",
      "",
      "- pnpm test",
    ].join("\n"),
    { title: "refactor(core)!: remove legacy diagnostic aliases" },
  );

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, [
    "PRs marked breaking with ! in the title must include a BREAKING CHANGE: line describing the compatibility impact.",
  ]);
});

test("rejects an empty BREAKING CHANGE line for a breaking PR title", () => {
  const result = validatePullRequestDescription(
    [
      "## Intent",
      "",
      "Replace the compatibility aliases with the semantic fields.",
      "",
      "## Consequences",
      "",
      "BREAKING CHANGE:",
      "",
      "## Risks",
      "",
      "Downstream callers may still read the removed aliases.",
      "",
      "## Verification",
      "",
      "- pnpm test",
    ].join("\n"),
    { title: "refactor(core)!: remove legacy diagnostic aliases" },
  );

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, [
    "PRs marked breaking with ! in the title must include a BREAKING CHANGE: line describing the compatibility impact.",
  ]);
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

test("accepts benchmark methodology for a performance PR", () => {
  const result = validatePullRequestDescription(
    [
      "## Intent",
      "Reduce candidate-search latency.",
      "",
      "## Consequences",
      "Generation uses less CPU time.",
      "",
      "## Risks",
      "Cached inputs must remain immutable during search.",
      "",
      "## Verification",
      "",
      "### Benchmark method",
      "",
      "- Baseline: main before the optimization",
      "- Workload: fixed seed at 38,400 ticks with default profiles",
      "- Procedure: rebuild each revision, then time only the generator command",
      "- Samples: one timed run per revision, reported as a single-run measurement",
      "- Result: 14.79 seconds before and 8.42 seconds after",
      "- Correctness: generated score JSON is byte-for-byte identical",
    ].join("\n"),
    { title: "perf(core): reuse candidate checkpoint analysis" },
  );

  assert.equal(result.valid, true);
});

test("rejects a performance PR without benchmark methodology", () => {
  const result = validatePullRequestDescription(
    [
      "## Intent",
      "Reduce candidate-search latency.",
      "",
      "## Consequences",
      "Generation uses less CPU time.",
      "",
      "## Risks",
      "Cached inputs must remain immutable during search.",
      "",
      "## Verification",
      "- pnpm test",
    ].join("\n"),
    { title: "perf(core): reuse candidate checkpoint analysis" },
  );

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, [
    "ci.pr-description.performance-benchmark-method: missing ### Benchmark method under ## Verification; why=reviewers cannot reproduce or evaluate a performance claim without its comparison method; action=add the benchmark subsection with Baseline, Workload, Procedure, Samples, Result, and Correctness fields",
  ]);
});

test("rejects incomplete benchmark methodology for a performance PR", () => {
  const result = validatePullRequestDescription(
    [
      "## Intent",
      "Reduce candidate-search latency.",
      "",
      "## Consequences",
      "Generation uses less CPU time.",
      "",
      "## Risks",
      "Cached inputs must remain immutable during search.",
      "",
      "## Verification",
      "",
      "### Benchmark method",
      "",
      "- Baseline: main before the optimization",
      "- Workload: fixed seed at 38,400 ticks with default profiles",
      "- Procedure: rebuild each revision, then time only the generator command",
      "- Result: 14.79 seconds before and 8.42 seconds after",
    ].join("\n"),
    { title: "perf(core)!: replace candidate evaluation" },
  );

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, [
    "PRs marked breaking with ! in the title must include a BREAKING CHANGE: line describing the compatibility impact.",
    "ci.pr-description.performance-benchmark-method: incomplete ### Benchmark method (missing: Samples, Correctness); why=reviewers need the comparison, workload, procedure, sampling, result, and correctness evidence to assess a performance claim; action=add reviewer-facing values for every benchmark field in .github/pull_request_template.md",
  ]);
});
