import { readFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_MAX_SECONDS = 45;
const DEFAULT_REPORT_PATH = "test-results/node-test-junit.xml";

const cwd = process.cwd();
const reportPath = toPosixRelativePath(process.env.NODE_TEST_JUNIT_REPORT ?? process.argv[2] ?? DEFAULT_REPORT_PATH);
const maxSeconds = readPositiveNumber("TEST_FILE_MAX_SECONDS", DEFAULT_MAX_SECONDS);
const report = await readFile(reportPath, "utf8");
const testCases = parseJUnitTestCases(report);
const slowTestCases = testCases.filter((testCase) => testCase.seconds > maxSeconds);

if (slowTestCases.length > 0) {
  console.error(`Slow test files exceeded the ${maxSeconds.toFixed(2)}s budget:`);
  for (const testCase of slowTestCases.toSorted((left, right) => right.seconds - left.seconds)) {
    console.error(`- ${testCase.name}: ${testCase.seconds.toFixed(2)}s`);
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

function readPositiveNumber(name, fallback) {
  const rawValue = process.env[name];
  if (rawValue === undefined) {
    return fallback;
  }

  const value = Number(rawValue);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive number.`);
  }
  return value;
}
