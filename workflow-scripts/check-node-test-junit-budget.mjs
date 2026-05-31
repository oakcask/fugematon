import { appendFile, readdir, readFile, stat } from "node:fs/promises";
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
    console.warn(
      `ci.slow-test-files.refactor-signal: ${slowTestFiles.length} test file(s) exceeded the ${maxSeconds.toFixed(
        2,
      )}s budget.`,
    );
    console.warn("why: slow test files reduce node --test shard parallelism and can lengthen PR feedback.");
    console.warn("action: split or narrow the listed test files when touching their ownership boundary.");
    for (const testFile of slowTestFiles) {
      console.warn(`- ${formatTestFileDuration(testFile)}`);
      for (const testCase of testFile.testCases.slice(0, slowTestCaseSampleLimit)) {
        console.warn(`  - ${formatTestCaseDuration(testCase)}`);
      }
    }
    console.warn("\nThis is a refactor signal only; it does not fail the workflow.");
  }

  console.log("JUnit test file durations:");
  for (const testFile of testFiles) {
    console.log(`- ${formatTestFileDuration(testFile)}; slowest ${formatTestCaseDuration(testFile.testCases[0])}`);
  }

  await writeSlowTestFilesStepSummary({
    maxSeconds,
    slowTestFiles,
    testFiles,
  });
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

async function writeSlowTestFilesStepSummary({ maxSeconds, slowTestFiles, testFiles }) {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (summaryPath === undefined) {
    return;
  }

  await appendFile(summaryPath, buildSlowTestFilesStepSummary({ maxSeconds, slowTestFiles, testFiles }));
}

export function buildSlowTestFilesStepSummary({ maxSeconds, slowTestFiles, testFiles }) {
  const lines = [
    "## Slow test files",
    "",
    "id: `ci.slow-test-files.refactor-signal`",
    "",
    "why: Slow test files reduce `node --test` shard parallelism and can lengthen PR feedback.",
    "",
    "action: Split or narrow the listed test files when touching their ownership boundary.",
    "",
  ];

  if (slowTestFiles.length === 0) {
    lines.push(`No test file exceeded the ${maxSeconds.toFixed(2)}s refactor signal threshold.`, "");
  } else {
    lines.push(
      `The following test files exceeded the ${maxSeconds.toFixed(
        2,
      )}s refactor signal threshold. This does not fail the workflow.`,
      "",
      "| Test file | Duration | Test cases | Slowest test case |",
      "| --- | ---: | ---: | --- |",
    );

    for (const testFile of slowTestFiles) {
      lines.push(
        `| ${escapeMarkdownTableCell(testFile.file)} | ${testFile.seconds.toFixed(2)}s | ${
          testFile.testCases.length
        } | ${escapeMarkdownTableCell(formatTestCaseDuration(testFile.testCases[0]))} |`,
      );
    }

    lines.push("");
  }

  const slowestFiles = testFiles.slice(0, 10);
  lines.push("### Slowest test files", "", "| Test file | Duration | Test cases |", "| --- | ---: | ---: |");

  for (const testFile of slowestFiles) {
    lines.push(
      `| ${escapeMarkdownTableCell(testFile.file)} | ${testFile.seconds.toFixed(2)}s | ${testFile.testCases.length} |`,
    );
  }

  lines.push("");
  return `${lines.join("\n")}\n`;
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

function isMainModule() {
  return process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
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

function escapeMarkdownTableCell(value) {
  return value.replaceAll("\\", "\\\\").replaceAll("|", "\\|").replaceAll("\n", " ");
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
