import assert from "node:assert/strict";
import test from "node:test";
import { parseJUnitTestCases, summarizeTestFileDurations } from "./check-node-test-junit-budget.mjs";

test("aggregates JUnit durations by source test file", () => {
  const xml = [
    '<testsuite name="node:test">',
    '  <testcase name="slower batch" time="20.00" classname="test" file="packages/core/src/generate.test.ts"/>',
    '  <testcase name="second batch" time="19.50" classname="test" file="packages/core/src/generate.test.ts"/>',
    '  <testcase name="single slow case" time="34.75" classname="test" file="packages/core/src/other.test.ts"/>',
    "</testsuite>",
  ].join("\n");

  const testFiles = summarizeTestFileDurations(parseJUnitTestCases(xml));

  assert.deepEqual(
    testFiles.map((testFile) => ({
      file: testFile.file,
      seconds: testFile.seconds,
      testCaseNames: testFile.testCases.map((testCase) => testCase.name),
    })),
    [
      {
        file: "packages/core/src/generate.test.ts",
        seconds: 39.5,
        testCaseNames: ["slower batch", "second batch"],
      },
      {
        file: "packages/core/src/other.test.ts",
        seconds: 34.75,
        testCaseNames: ["single slow case"],
      },
    ],
  );
});

test("normalizes dist testcase file paths to source test files", () => {
  const xml = [
    '<testsuite name="node:test">',
    '  <testcase name="uses dist" time="1.23" classname="test" file="repo/packages/core/dist/generate.test.js"/>',
    '  <testcase name="falls back from name" time="2.34" classname="test"/>',
    "</testsuite>",
  ].join("\n");

  assert.deepEqual(
    parseJUnitTestCases(xml).map((testCase) => testCase.file),
    ["packages/core/src/generate.test.ts", "falls back from name"],
  );
});
