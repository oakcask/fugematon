import { rm } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const buildOutputPaths = [
  "packages/core/dist",
  "packages/performance/dist",
  "packages/midi/dist",
  "packages/cli/dist",
  "packages/web/dist",
  "packages/web/app-dist",
];

export async function cleanBuildOutput({ rootPath = defaultRootPath(), logger = console } = {}) {
  for (const relativePath of buildOutputPaths) {
    const targetPath = resolve(rootPath, relativePath);
    assertInsideRoot(rootPath, targetPath, relativePath);
    await rm(targetPath, { force: true, recursive: true });
    logger.log(`Cleaned ${relativePath}`);
  }
}

function defaultRootPath() {
  return fileURLToPath(new URL("..", import.meta.url));
}

function assertInsideRoot(rootPath, targetPath, relativePath) {
  const rootRelativePath = relative(rootPath, targetPath);
  if (rootRelativePath.startsWith("..") || rootRelativePath === "") {
    throw new Error(
      [
        "clean-build-output.path-outside-root: build output path is outside the repository root;",
        "why=cleaning outside configured build outputs risks deleting source or user data;",
        `action=check scripts/clean-build-output.mjs entry ${relativePath}`,
      ].join(" "),
    );
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await cleanBuildOutput();
}
