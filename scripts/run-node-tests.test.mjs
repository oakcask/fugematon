import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { collectNodeTestFiles } from "./run-node-tests.mjs";

test("collectNodeTestFiles finds package dist tests recursively and script tests", async () => {
  const rootPath = await mkdtemp(join(tmpdir(), "fugematon-node-tests-"));
  await writeProjectFile(rootPath, "packages/core/dist/top-level.test.js");
  await writeProjectFile(rootPath, "packages/core/dist/generation/nested.test.js");
  await writeProjectFile(rootPath, "packages/core/src/generation/source.test.ts");
  await writeProjectFile(rootPath, "scripts/tool.test.mjs");
  await writeProjectFile(rootPath, "workflow-scripts/workflow.test.mjs");
  await writeProjectFile(rootPath, "workflow-scripts/nested/ignored.test.mjs");

  assert.deepEqual(await collectNodeTestFiles({ rootPath }), [
    "packages/core/dist/generation/nested.test.js",
    "packages/core/dist/top-level.test.js",
    "scripts/tool.test.mjs",
    "workflow-scripts/workflow.test.mjs",
  ]);
});

async function writeProjectFile(rootPath, relativePath) {
  const filePath = join(rootPath, relativePath);
  await mkdir(join(filePath, ".."), { recursive: true });
  await writeFile(filePath, "");
}
