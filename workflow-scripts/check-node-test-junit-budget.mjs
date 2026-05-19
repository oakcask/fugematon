import { access, readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const cwd = process.cwd();
const isGitHubActions = process.env.GITHUB_ACTIONS === "true";
const slowTestCaseSampleLimit = 5;

if (isMainModule()) {
  try {
    await main();
  } catch (error) {
    reportScriptError(error);
    process.exit(1);
  }
}

async function main() {
  const { reportPath, maxSeconds } = parseArguments(process.argv.slice(2));
  const reports = await readJUnitReports(reportPath);
  const testCases = reports.flatMap(({ report }) => parseJUnitTestCases(report));
  const testFiles = summarizeTestFileDurations(testCases);
  const slowTestFiles = testFiles.filter((testFile) => testFile.seconds > maxSeconds);

  if (slowTestFiles.length > 0) {
    console.error(`Slow test files exceeded the ${maxSeconds.toFixed(2)}s budget:`);
    for (const testFile of slowTestFiles) {
      console.error(`- ${formatTestFileDuration(testFile)}`);
      for (const testCase of testFile.testCases.slice(0, slowTestCaseSampleLimit)) {
        console.error(`  - ${formatTestCaseDuration(testCase)}`);
      }
      await reportSlowTestFile(testFile, maxSeconds);
    }
    console.error("\nSplit slow test files so node --test can distribute the work across more test processes.");
  }

  console.log("JUnit test file durations:");
  for (const testFile of testFiles) {
    console.log(`- ${formatTestFileDuration(testFile)}; slowest ${formatTestCaseDuration(testFile.testCases[0])}`);
  }

  if (slowTestFiles.length > 0) {
    process.exit(1);
  }
}

async function readJUnitReports(reportPath) {
  const reportPaths = await collectJUnitReportPaths(reportPath);
  const reports = [];

  for (const junitReportPath of reportPaths) {
    reports.push({
      report: await readFile(junitReportPath, "utf8"),
    });
  }

  return reports;
}

async function collectJUnitReportPaths(reportPath) {
  const reportStat = await stat(reportPath);
  if (!reportStat.isDirectory()) {
    return [reportPath];
  }

  const reportPaths = [];
  await collectXmlFiles(reportPath, reportPaths);
  reportPaths.sort();

  if (reportPaths.length === 0) {
    throw new Error(`JUnit report directory did not contain any XML files: ${reportPath}`);
  }

  return reportPaths;
}

async function collectXmlFiles(directory, reportPaths) {
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await collectXmlFiles(entryPath, reportPaths);
    } else if (entry.isFile() && entry.name.endsWith(".xml")) {
      reportPaths.push(toPosixRelativePath(entryPath));
    }
  }
}

export function parseJUnitTestCases(xml) {
  const testCases = [];
  const testcasePattern = /<testcase\b([^>]*)\/?>/g;

  for (const match of xml.matchAll(testcasePattern)) {
    const attributes = parseXmlAttributes(match[1]);
    const name = attributes.name;
    const seconds = Number(attributes.time);
    if (name !== undefined && Number.isFinite(seconds)) {
      testCases.push({
        file:
          attributes.file === undefined ? normalizeNodeTestFilePath(name) : normalizeNodeTestFilePath(attributes.file),
        name,
        seconds,
      });
    }
  }

  if (testCases.length === 0) {
    throw new Error("JUnit report did not contain any testcase durations.");
  }

  return testCases;
}

export function summarizeTestFileDurations(testCases) {
  const summariesByFile = new Map();

  for (const testCase of testCases) {
    let summary = summariesByFile.get(testCase.file);
    if (summary === undefined) {
      summary = {
        file: testCase.file,
        seconds: 0,
        testCases: [],
      };
      summariesByFile.set(testCase.file, summary);
    }

    summary.seconds += testCase.seconds;
    summary.testCases.push(testCase);
  }

  for (const summary of summariesByFile.values()) {
    summary.testCases.sort((left, right) => right.seconds - left.seconds);
  }

  return Array.from(summariesByFile.values()).sort((left, right) => right.seconds - left.seconds);
}

function normalizeNodeTestFilePath(filePath) {
  const normalized = filePath.replaceAll("\\", "/");
  const sourceMatch = normalized.match(/(?:^|\/)((?:packages\/[^/]+\/src\/.+\.ts)|(?:workflow-scripts\/.+\.mjs))$/);
  if (sourceMatch !== null) {
    return sourceMatch[1];
  }

  const packageDistMatch = normalized.match(/(?:^|\/)(packages\/[^/]+)\/dist\/(.+)\.js$/);
  if (packageDistMatch !== null) {
    return `${packageDistMatch[1]}/src/${packageDistMatch[2]}.ts`;
  }

  return normalized;
}

function formatTestFileDuration(testFile) {
  return `${testFile.file}: ${testFile.seconds.toFixed(2)}s across ${formatTestCaseCount(testFile.testCases.length)}`;
}

function formatTestCaseDuration(testCase) {
  return `${testCase.name}: ${testCase.seconds.toFixed(2)}s`;
}

function formatTestCaseCount(count) {
  return `${count} test ${count === 1 ? "case" : "cases"}`;
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

async function reportSlowTestFile(testFile, maxSeconds) {
  if (!isGitHubActions) {
    return;
  }

  const annotationFile = await resolveAnnotationFile(testFile.file);
  const message = `${testFile.file} took ${testFile.seconds.toFixed(2)}s across ${formatTestCaseCount(
    testFile.testCases.length,
  )}, exceeding the ${maxSeconds.toFixed(
    2,
  )}s node --test file duration budget. Slowest test case: ${formatTestCaseDuration(
    testFile.testCases[0],
  )}. Split the file so node --test can distribute the work across more test processes.`;

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

function isMainModule() {
  return process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
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
