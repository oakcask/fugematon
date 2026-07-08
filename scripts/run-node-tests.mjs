import { spawn } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import { availableParallelism } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageDistRootPattern = /^packages\/[^/]+\/dist\/.+\.test\.js$/;
const scriptTestFilePattern = /^(scripts|workflow-scripts)\/[^/]+\.test\.mjs$/;
const reviewTestPattern = /\breviewTest\s*\(/;
const regularTestPattern = /(^|[^A-Za-z0-9_])test\s*\(/m;
const reviewTestNamePattern = "^\\[review\\]";

if (isMainModule()) {
  const testFiles = await collectNodeTestFiles();
  const exitCode = await runNodeTests(testFiles);
  process.exitCode = exitCode;
}

export async function collectNodeTestFiles({ rootPath = defaultRootPath() } = {}) {
  const files = await collectFiles(rootPath);
  const testFiles = files
    .filter((filePath) => packageDistRootPattern.test(filePath) || scriptTestFilePattern.test(filePath))
    .sort();
  return await filterNodeTestFilesForProfile(testFiles, { rootPath, profile: currentTestProfile() });
}

export async function runNodeTests(testFiles, { concurrency = defaultNodeTestConcurrency(testFiles.length) } = {}) {
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

  const shards = createNodeTestShards(testFiles, concurrency);
  if (shards.length > 1) {
    console.error(
      [
        `test.node-runner-local-shards: running ${testFiles.length} test files across ${shards.length} node --test shards;`,
        "why=local tests should use available CPU cores;",
        "action=set FUGEMATON_NODE_TEST_CONCURRENCY to override local parallelism",
      ].join(" "),
    );
  }

  const results = await Promise.all(
    shards.map(async (shardFiles, shardIndex) => {
      const result = await runNodeTestShard(shardFiles, { shardIndex, shardCount: shards.length });
      writeBufferedOutput(result);
      return result;
    }),
  );

  return results.every((result) => result.exitCode === 0) ? 0 : 1;
}

export function createNodeTestShards(testFiles, concurrency) {
  const requestedConcurrency = Number.isFinite(concurrency) ? Math.floor(concurrency) : 1;
  const shardCount = Math.max(1, Math.min(testFiles.length, requestedConcurrency));
  const shards = Array.from({ length: shardCount }, () => []);

  for (const [index, testFile] of testFiles.entries()) {
    shards[index % shardCount].push(testFile);
  }

  return shards.filter((shard) => shard.length > 0);
}

export function defaultNodeTestConcurrency(testFileCount) {
  const explicitConcurrency = Number.parseInt(process.env.FUGEMATON_NODE_TEST_CONCURRENCY ?? "", 10);
  if (Number.isInteger(explicitConcurrency) && explicitConcurrency > 0) {
    return Math.min(testFileCount, explicitConcurrency);
  }

  return Math.min(testFileCount, availableParallelism());
}

async function runNodeTestShard(testFiles, { shardIndex, shardCount }) {
  const args = ["--test", "--test-isolation=none"];
  if (currentTestProfile() === "review") {
    args.push("--test-name-pattern", reviewTestNamePattern);
  }
  args.push(...testFiles);

  const child = spawn(process.execPath, args, {
    stdio: ["ignore", "pipe", "pipe"],
  });

  const stdout = [];
  const stderr = [];
  child.stdout.on("data", (chunk) => stdout.push(chunk));
  child.stderr.on("data", (chunk) => stderr.push(chunk));

  return await new Promise((resolve) => {
    child.on("error", (error) => {
      resolve({
        exitCode: 1,
        shardIndex,
        shardCount,
        stderr: Buffer.concat([
          ...stderr,
          Buffer.from(
            [
              "",
              [
                "test.node-runner-spawn-failed: failed to start node --test;",
                "why=local tests could not execute;",
                `action=check Node.js installation and test runner arguments; detail=${error.message}`,
              ].join(" "),
            ].join("\n"),
          ),
        ]),
        stdout: Buffer.concat(stdout),
      });
    });
    child.on("exit", (code, signal) => {
      const exitCode = signal === null ? (code ?? 1) : 1;
      if (signal !== null) {
        stderr.push(
          Buffer.from(
            [
              "",
              [
                "test.node-runner-terminated: node --test was terminated by a signal;",
                "why=local tests did not complete;",
                `action=rerun pnpm test or inspect resource limits; signal=${signal}`,
              ].join(" "),
            ].join("\n"),
          ),
        );
      }
      resolve({
        exitCode,
        shardIndex,
        shardCount,
        stderr: Buffer.concat(stderr),
        stdout: Buffer.concat(stdout),
      });
    });
  });
}

export async function filterNodeTestFilesForProfile(
  testFiles,
  { rootPath = defaultRootPath(), profile = "regular" } = {},
) {
  const classifiedFiles = await Promise.all(
    testFiles.map(async (filePath) => ({
      filePath,
      classification: classifyTestSource(await readFile(path.join(rootPath, filePath), "utf8")),
    })),
  );

  return classifiedFiles
    .filter(({ classification }) =>
      profile === "review"
        ? classification.hasReviewTests
        : !classification.hasReviewTests || classification.hasRegularTests,
    )
    .map(({ filePath }) => filePath);
}

export function classifyTestSource(source) {
  return {
    hasReviewTests: reviewTestPattern.test(source),
    hasRegularTests: regularTestPattern.test(source),
  };
}

function currentTestProfile() {
  return process.env.FUGEMATON_TEST_PROFILE === "review" ? "review" : "regular";
}

function writeBufferedOutput({ shardIndex, shardCount, stdout, stderr }) {
  if (shardCount > 1) {
    process.stderr.write(`test.node-runner-shard-output: shard=${shardIndex + 1}/${shardCount}\n`);
  }
  if (stdout.length > 0) {
    process.stdout.write(stdout);
    if (stdout.at(-1) !== 10) {
      process.stdout.write("\n");
    }
  }
  if (stderr.length > 0) {
    process.stderr.write(stderr);
    if (stderr.at(-1) !== 10) {
      process.stderr.write("\n");
    }
  }
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
