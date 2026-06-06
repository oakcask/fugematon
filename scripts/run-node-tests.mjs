import { spawn } from "node:child_process";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageDistRootPattern = /^packages\/[^/]+\/dist\/.+\.test\.js$/;
const scriptTestFilePattern = /^(scripts|workflow-scripts)\/[^/]+\.test\.mjs$/;

if (isMainModule()) {
  const testFiles = await collectNodeTestFiles();
  const exitCode = await runNodeTests(testFiles);
  process.exitCode = exitCode;
}

export async function collectNodeTestFiles({ rootPath = defaultRootPath() } = {}) {
  const files = await collectFiles(rootPath);
  return files
    .filter((filePath) => packageDistRootPattern.test(filePath) || scriptTestFilePattern.test(filePath))
    .sort();
}

export async function runNodeTests(testFiles) {
  if (testFiles.length === 0) {
    console.error(
      [
        "test.no-test-files-found: no node test files matched the local test runner patterns;",
        "why=pnpm test would otherwise pass without exercising the project tests;",
        "action=run pnpm build and check scripts/run-node-tests.mjs patterns",
      ].join(" "),
    );
    return 1;
  }

  const child = spawn(process.execPath, ["--test", ...testFiles], {
    stdio: "inherit",
  });

  return await new Promise((resolve) => {
    child.on("error", (error) => {
      console.error(
        [
          "test.node-runner-spawn-failed: failed to start node --test;",
          "why=local tests could not execute;",
          `action=check Node.js installation and test runner arguments; detail=${error.message}`,
        ].join(" "),
      );
      resolve(1);
    });
    child.on("exit", (code, signal) => {
      if (signal !== null) {
        console.error(
          [
            "test.node-runner-terminated: node --test was terminated by a signal;",
            "why=local tests did not complete;",
            `action=rerun pnpm test or inspect resource limits; signal=${signal}`,
          ].join(" "),
        );
        resolve(1);
      } else {
        resolve(code ?? 1);
      }
    });
  });
}

async function collectFiles(rootPath, directory = ".") {
  const entries = await readdir(path.join(rootPath, directory), { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const relativePath = directory === "." ? entry.name : `${directory}/${entry.name}`;
    if (entry.isDirectory()) {
      if (shouldSkipDirectory(relativePath)) {
        continue;
      }
      files.push(...(await collectFiles(rootPath, relativePath)));
    } else if (entry.isFile()) {
      files.push(relativePath);
    }
  }

  return files;
}

function shouldSkipDirectory(relativePath) {
  return (
    relativePath === ".cache" ||
    relativePath === ".git" ||
    relativePath === "node_modules" ||
    relativePath === "packages/web/app-dist"
  );
}

function defaultRootPath() {
  return fileURLToPath(new URL("..", import.meta.url));
}

function isMainModule() {
  return import.meta.url === `file://${process.argv[1]}`;
}
