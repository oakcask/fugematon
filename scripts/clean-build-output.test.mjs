import assert from "node:assert/strict";
import { mkdir, mkdtemp, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { cleanBuildOutput } from "./clean-build-output.mjs";

test("removes build outputs without touching sibling files", async () => {
  const rootPath = await mkdtemp(join(tmpdir(), "fugematon-clean-build-output-"));
  const packageDistPath = join(rootPath, "packages/core/dist");
  const outputPath = join(rootPath, "packages/web/app-dist");
  const siblingPath = join(rootPath, "packages/web/public/og-image.png");
  const logMessages = [];

  await mkdir(packageDistPath, { recursive: true });
  await mkdir(join(outputPath, "assets"), { recursive: true });
  await mkdir(join(rootPath, "packages/web/public"), { recursive: true });
  await writeFile(join(packageDistPath, "index.js"), "export {};\n", "utf8");
  await writeFile(join(outputPath, "assets/index.js"), "console.log('built');\n", "utf8");
  await writeFile(siblingPath, "generated image placeholder\n", "utf8");

  await cleanBuildOutput({
    rootPath,
    logger: { log: (message) => logMessages.push(message) },
  });

  await assert.rejects(stat(packageDistPath), { code: "ENOENT" });
  await assert.rejects(stat(outputPath), { code: "ENOENT" });
  assert.equal((await stat(siblingPath)).isFile(), true);
  assert.deepEqual(logMessages, [
    "Cleaned packages/core/dist",
    "Cleaned packages/performance/dist",
    "Cleaned packages/midi/dist",
    "Cleaned packages/cli/dist",
    "Cleaned packages/web/dist",
    "Cleaned packages/web/app-dist",
  ]);
});
