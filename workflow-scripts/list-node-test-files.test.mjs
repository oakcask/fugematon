import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { classifyTestSource, listNodeTestFiles } from "./list-node-test-files.mjs";

test("classifies regular and review test definitions separately", () => {
  assert.deepEqual(classifyTestSource('test("regular", () => {});'), {
    hasRegularTests: true,
    hasReviewTests: false,
  });
  assert.deepEqual(classifyTestSource('reviewTest("review", () => {});'), {
    hasRegularTests: false,
    hasReviewTests: true,
  });
  assert.deepEqual(classifyTestSource('test("regular", () => {});\nreviewTest("review", () => {});'), {
    hasRegularTests: true,
    hasReviewTests: true,
  });
});

test("lists regular and review files for CI profiles", async () => {
  const root = await mkdtemp(join(tmpdir(), "fugematon-test-files-"));
  await mkdir(join(root, "packages/core/src"), { recursive: true });
  await mkdir(join(root, "workflow-scripts"), { recursive: true });
  await writeFile(join(root, "packages/core/src/regular.test.ts"), 'test("regular", () => {});\n');
  await writeFile(join(root, "packages/core/src/review.test.ts"), 'reviewTest("review", () => {});\n');
  await writeFile(
    join(root, "packages/core/src/mixed.test.ts"),
    'test("regular", () => {});\nreviewTest("review", () => {});\n',
  );
  await writeFile(join(root, "workflow-scripts/tool.test.mjs"), 'test("tool", () => {});\n');

  assert.deepEqual(await listNodeTestFiles({ profile: "regular", rootPath: root }), [
    "packages/core/src/mixed.test.ts",
    "packages/core/src/regular.test.ts",
    "workflow-scripts/tool.test.mjs",
  ]);
  assert.deepEqual(await listNodeTestFiles({ profile: "review", rootPath: root }), [
    "packages/core/src/mixed.test.ts",
    "packages/core/src/review.test.ts",
  ]);
});
