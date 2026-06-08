import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { collectNodeTestFiles, createNodeTestShards, defaultNodeTestConcurrency } from "./run-node-tests.mjs";

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

test("createNodeTestShards spreads files across the requested local concurrency", () => {
  assert.deepEqual(createNodeTestShards(["a.test.js", "b.test.js", "c.test.js", "d.test.js", "e.test.js"], 3), [
    ["a.test.js", "d.test.js"],
    ["b.test.js", "e.test.js"],
    ["c.test.js"],
  ]);
});

test("createNodeTestShards caps concurrency to the number of test files", () => {
  assert.deepEqual(createNodeTestShards(["a.test.js", "b.test.js"], 8), [["a.test.js"], ["b.test.js"]]);
});

test("createNodeTestShards falls back to one shard for invalid concurrency", () => {
  assert.deepEqual(createNodeTestShards(["a.test.js", "b.test.js"], Number.NaN), [["a.test.js", "b.test.js"]]);
});

test("defaultNodeTestConcurrency honors the local override", () => {
  const originalConcurrency = process.env.FUGEMATON_NODE_TEST_CONCURRENCY;
  process.env.FUGEMATON_NODE_TEST_CONCURRENCY = "2";
  try {
    assert.equal(defaultNodeTestConcurrency(5), 2);
    assert.equal(defaultNodeTestConcurrency(1), 1);
  } finally {
    if (originalConcurrency === undefined) {
      delete process.env.FUGEMATON_NODE_TEST_CONCURRENCY;
    } else {
      process.env.FUGEMATON_NODE_TEST_CONCURRENCY = originalConcurrency;
    }
  }
});

async function writeProjectFile(rootPath, relativePath) {
  const filePath = join(rootPath, relativePath);
  await mkdir(join(filePath, ".."), { recursive: true });
  await writeFile(filePath, "");
}
