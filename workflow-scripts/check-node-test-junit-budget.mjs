import { access, readFile } from "node:fs/promises";
import path from "node:path";

const cwd = process.cwd();
const isGitHubActions = process.env.GITHUB_ACTIONS === "true";

try {
  await main();
} catch (error) {
  reportScriptError(error);
  process.exit(1);
}

async function main() {
  const { reportPath, maxSeconds } = parseArguments(process.argv.slice(2));
  const report = await readFile(reportPath, "utf8");
  const testCases = parseJUnitTestCases(report);
  const slowTestCases = testCases.filter((testCase) => testCase.seconds > maxSeconds);

  if (slowTestCases.length > 0) {
    console.error(`Slow test files exceeded the ${maxSeconds.toFixed(2)}s budget:`);
    const sortedSlowTestCases = slowTestCases.toSorted((left, right) => right.seconds - left.seconds);
    for (const testCase of sortedSlowTestCases) {
      console.error(`- ${testCase.name}: ${testCase.seconds.toFixed(2)}s`);
      await reportSlowTestCase(testCase, maxSeconds);
    }
    console.error("\nSplit slow test files so node --test can distribute the work across more test processes.");
  }

  console.log("JUnit test file durations:");
  for (const testCase of testCases.toSorted((left, right) => right.seconds - left.seconds)) {
    console.log(`- ${testCase.name}: ${testCase.seconds.toFixed(2)}s`);
  }

  if (slowTestCases.length > 0) {
    process.exit(1);
  }
}

function parseJUnitTestCases(xml) {
  const testCases = [];
  const testcasePattern = /<testcase\b([^>]*)\/?>/g;

  for (const match of xml.matchAll(testcasePattern)) {
    const attributes = parseXmlAttributes(match[1]);
    const name = attributes.name;
    const seconds = Number(attributes.time);
    if (name !== undefined && Number.isFinite(seconds)) {
      testCases.push({ name, seconds });
    }
  }

  if (testCases.length === 0) {
    throw new Error("JUnit report did not contain any testcase durations.");
  }

  return testCases;
}

function parseXmlAttributes(rawAttributes) {
  const attributes = {};
  const attributePattern = /([\w:-]+)="([^"]*)"/g;

  for (const match of rawAttributes.matchAll(attributePattern)) {
    attributes[match[1]] = decodeXmlEntities(match[2]);
  }

  return attributes;
}

function decodeXmlEntities(value) {
  return value
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}

function toPosixRelativePath(filePath) {
  return path.relative(cwd, path.resolve(cwd, filePath)).split(path.sep).join("/");
}

async function reportSlowTestCase(testCase, maxSeconds) {
  if (!isGitHubActions) {
    return;
  }

  const annotationFile = await resolveAnnotationFile(testCase.name);
  const message = `${testCase.name} took ${testCase.seconds.toFixed(2)}s, exceeding the ${maxSeconds.toFixed(
    2,
  )}s node --test file duration budget. Split the file so node --test can distribute the work across more test processes.`;

  writeGitHubErrorAnnotation({
    file: annotationFile,
    title: "Slow node --test file",
    message,
  });
}

function reportScriptError(error) {
  const message = error instanceof Error ? error.message : String(error);
  if (isGitHubActions) {
    writeGitHubErrorAnnotation({
      title: "JUnit duration budget check failed",
      message,
    });
  }
  console.error(message);
}

async function resolveAnnotationFile(testCaseName) {
  const sourceFile = testCaseName.replace(/\/dist\/(.+)\.js$/, "/src/$1.ts");
  if (await fileExists(sourceFile)) {
    return sourceFile;
  }
  if (await fileExists(testCaseName)) {
    return testCaseName;
  }
  return undefined;
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function writeGitHubErrorAnnotation({ file, title, message }) {
  const properties = [
    file === undefined ? undefined : `file=${escapeGitHubAnnotationProperty(file)}`,
    `title=${escapeGitHubAnnotationProperty(title)}`,
  ]
    .filter((property) => property !== undefined)
    .join(",");

  console.error(`::error ${properties}::${escapeGitHubAnnotationMessage(message)}`);
}

function escapeGitHubAnnotationProperty(value) {
  return escapeGitHubAnnotationMessage(value).replaceAll(":", "%3A").replaceAll(",", "%2C");
}

function escapeGitHubAnnotationMessage(value) {
  return value.replaceAll("%", "%25").replaceAll("\r", "%0D").replaceAll("\n", "%0A");
}

function parseArguments(args) {
  const values = parseLongOptions(args);
  const reportPath = values.get("--junit-report");
  const rawMaxSeconds = values.get("--max-seconds");

  if (reportPath === undefined || rawMaxSeconds === undefined) {
    throw new Error(
      "Usage: node workflow-scripts/check-node-test-junit-budget.mjs --junit-report <path> --max-seconds <seconds>",
    );
  }

  const value = Number(rawMaxSeconds);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("--max-seconds must be a positive number.");
  }

  return {
    reportPath: toPosixRelativePath(reportPath),
    maxSeconds: value,
  };
}

function parseLongOptions(args) {
  const values = new Map();

  for (let index = 0; index < args.length; index += 2) {
    const option = args[index];
    const value = args[index + 1];

    if (!option?.startsWith("--")) {
      throw new Error(`Unexpected positional argument: ${option ?? ""}`);
    }
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`${option} requires a value.`);
    }
    if (option !== "--junit-report" && option !== "--max-seconds") {
      throw new Error(`Unknown option: ${option}`);
    }
    if (values.has(option)) {
      throw new Error(`Duplicate option: ${option}`);
    }

    values.set(option, value);
  }

  return values;
}
