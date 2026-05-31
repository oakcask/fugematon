import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSlowTestFilesStepSummary,
  parseJUnitTestCases,
  summarizeTestFileDurations,
} from "./check-node-test-junit-budget.mjs";

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

test("formats slow test files as a refactor signal in the workflow summary", () => {
  const testFiles = [
    {
      file: "packages/core/src/generate.test.ts",
      seconds: 39.5,
      testCases: [
        {
          file: "packages/core/src/generate.test.ts",
          name: "slower batch",
          seconds: 20,
        },
        {
          file: "packages/core/src/generate.test.ts",
          name: "second batch",
          seconds: 19.5,
        },
      ],
    },
  ];

  const summary = buildSlowTestFilesStepSummary({
    maxSeconds: 35,
    slowTestFiles: testFiles,
    testFiles,
  });

  assert.match(summary, /id: `ci\.slow-test-files\.refactor-signal`/);
  assert.match(summary, /This does not fail the workflow\./);
  assert.match(summary, /\| packages\/core\/src\/generate\.test\.ts \| 39\.50s \| 2 \| slower batch: 20\.00s \|/);
});
