import assert from "node:assert/strict";
import test from "node:test";
import {
  analyzeTypeScriptFile,
  createRefactorFinding,
  formatFindingMessage,
  normalizeGitHubBaseRef,
} from "./check-code-metrics.mjs";

test("measures the most complex function in a TypeScript source file", () => {
  const source = [
    "export function simple(value: number) {",
    "  return value + 1;",
    "}",
    "",
    "export function complex(value: number) {",
    "  if (value > 10 && value < 20) {",
    "    return value;",
    "  }",
    "  for (let index = 0; index < value; index += 1) {",
    "    if (index % 2 === 0) {",
    "      return index;",
    "    }",
    "  }",
    "  return value > 0 ? value : 0;",
    "}",
  ].join("\n");

  assert.deepEqual(analyzeTypeScriptFile("packages/core/src/example.ts", source, 12), {
    file: "packages/core/src/example.ts",
    changedLines: 12,
    functionCount: 2,
    maxComplexity: 6,
    maxFunctionLines: 11,
    line: 5,
  });
});

test("does not count nested function branches against the parent function", () => {
  const source = [
    "export function outer(value: number) {",
    "  const inner = () => {",
    "    if (value > 0) {",
    "      return value;",
    "    }",
    "    return 0;",
    "  };",
    "  return inner();",
    "}",
  ].join("\n");

  const metrics = analyzeTypeScriptFile("packages/core/src/example.ts", source, 12);

  assert.equal(metrics.functionCount, 2);
  assert.equal(metrics.maxComplexity, 2);
});

test("creates advisory findings only for changed files with risky metrics", () => {
  const options = {
    changedLineThreshold: 10,
    complexityThreshold: 6,
    functionLineThreshold: 120,
    mode: "changed",
  };

  assert.equal(
    createRefactorFinding(
      {
        file: "packages/core/src/example.ts",
        changedLines: 9,
        functionCount: 1,
        maxComplexity: 6,
        maxFunctionLines: 20,
        line: 1,
      },
      options,
    ),
    undefined,
  );

  assert.equal(
    createRefactorFinding(
      {
        file: "packages/core/src/example.ts",
        changedLines: 12,
        functionCount: 1,
        maxComplexity: 5,
        maxFunctionLines: 20,
        line: 1,
      },
      options,
    ),
    undefined,
  );

  assert.equal(
    createRefactorFinding(
      {
        file: "packages/core/src/example.ts",
        changedLines: 12,
        functionCount: 1,
        maxComplexity: 6,
        maxFunctionLines: 20,
        line: 1,
      },
      options,
    )?.id,
    "ci.code-metrics.refactor-candidate",
  );
});

test("formats refactor findings as design-focused advisory guidance", () => {
  const message = formatFindingMessage({
    id: "ci.code-metrics.refactor-candidate",
    maxComplexity: 13,
    maxFunctionLines: 121,
  });

  assert.match(message, /ci\.code-metrics\.refactor-candidate/);
  assert.match(message, /improves cohesion within one concern/);
  assert.match(message, /decouples distinct concepts/);
  assert.match(message, /adds focused tests/);
  assert.match(message, /This is advisory/);
});

test("normalizes GitHub base refs for pull request and push events", () => {
  assert.equal(normalizeGitHubBaseRef(undefined), undefined);
  assert.equal(normalizeGitHubBaseRef(""), undefined);
  assert.equal(normalizeGitHubBaseRef("   "), undefined);
  assert.equal(normalizeGitHubBaseRef("main"), "origin/main");
  assert.equal(normalizeGitHubBaseRef(" main "), "origin/main");
});
