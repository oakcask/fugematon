import { appendFile, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const reviewTestPattern = /\breviewTest\s*\(/;
const regularTestPattern = /(^|[^A-Za-z0-9_])test\s*\(/m;

if (isMainModule()) {
  const options = parseArgs(process.argv.slice(2));
  const files = await listNodeTestFiles({
    profile: options.profile,
    rootPath: options.rootPath,
  });
  const output = `${files.join("\n")}${files.length > 0 ? "\n" : ""}`;
  process.stdout.write(output);
  if (options.githubOutputName !== undefined) {
    await writeGitHubOutput(options.githubOutputName, output);
  }
}

export async function listNodeTestFiles({ profile, rootPath = defaultRootPath() }) {
  if (profile !== "regular" && profile !== "review") {
    throw new Error(`test.file-list.invalid-profile: expected regular or review profile; received=${profile}`);
  }

  const files = (await collectFiles(rootPath)).filter((filePath) => sourceTestFilePattern(filePath)).sort();
  const classifiedFiles = await Promise.all(
    files.map(async (filePath) => ({
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

function parseArgs(args) {
  const options = {
    githubOutputName: undefined,
    profile: undefined,
    rootPath: defaultRootPath(),
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--profile") {
      options.profile = args[++index];
    } else if (arg === "--root") {
      options.rootPath = args[++index];
    } else if (arg === "--github-output") {
      options.githubOutputName = args[++index];
    } else {
      throw new Error(`test.file-list.unknown-argument: unsupported argument; arg=${arg}`);
    }
  }

  return options;
}

async function writeGitHubOutput(name, value) {
  const outputPath = process.env.GITHUB_OUTPUT;
  if (outputPath === undefined || outputPath === "") {
    throw new Error("test.file-list.github-output-missing: GITHUB_OUTPUT is required when --github-output is used");
  }

  const delimiter = `NODE_TEST_FILES_${process.pid}`;
  await appendFile(outputPath, `${name}<<${delimiter}\n${value}${delimiter}\n`, "utf8");
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

function sourceTestFilePattern(filePath) {
  return (
    /^packages\/[^/]+\/src\/.+\.test\.ts$/.test(filePath) ||
    /^scripts\/[^/]+\.test\.mjs$/.test(filePath) ||
    /^workflow-scripts\/[^/]+\.test\.mjs$/.test(filePath)
  );
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
