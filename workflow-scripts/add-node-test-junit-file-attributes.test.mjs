import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeNodeTestJUnitFileAttributes,
  normalizeNodeTestJUnitReport,
  wrapRootNodeTestCasesInTestSuite,
} from "./add-node-test-junit-file-attributes.mjs";

test("normalizes existing node --test package file attributes to source test files", () => {
  const xml = [
    '<testsuite name="node:test">',
    '  <testcase name="keeps metadata" time="1.23" classname="test" file="repo/packages/core/dist/generate.test.js"/>',
    "</testsuite>",
  ].join("\n");

  assert.match(normalizeNodeTestJUnitFileAttributes(xml), /file="packages\/core\/src\/generate\.test\.ts"/);
});

test("normalizes existing workflow script test file attributes to relative files", () => {
  const xml = [
    '<testsuite name="node:test">',
    '  <testcase name="normalizes reports" time="0.01" classname="test" file="repo/workflow-scripts/add-node-test-junit-file-attributes.test.mjs"/>',
    "</testsuite>",
  ].join("\n");

  assert.match(
    normalizeNodeTestJUnitFileAttributes(xml),
    /file="workflow-scripts\/add-node-test-junit-file-attributes\.test\.mjs"/,
  );
});

test("adds a file attribute when the testcase does not have one", () => {
  const xml = [
    '<testsuite name="node:test">',
    '  <testcase name="packages/core/dist/generate.test.js" time="1.23" classname="test"/>',
    "</testsuite>",
  ].join("\n");

  assert.match(normalizeNodeTestJUnitFileAttributes(xml), /file="packages\/core\/src\/generate\.test\.ts"/);
});

test("wraps node --test root testcases in a testsuite", () => {
  const xml = [
    '<?xml version="1.0" encoding="utf-8"?>',
    "<testsuites>",
    '  <testcase name="first" time="1.23" classname="test" file="packages/core/src/generate.test.ts"/>',
    '  <testcase name="second" time="0.01" classname="test" file="workflow-scripts/check.test.mjs"/>',
    "  <!-- tests 2 -->",
    "</testsuites>",
  ].join("\n");

  assert.equal(
    wrapRootNodeTestCasesInTestSuite(xml),
    [
      '<?xml version="1.0" encoding="utf-8"?>',
      "<testsuites>",
      '  <testsuite name="node:test">',
      '    <testcase name="first" time="1.23" classname="test" file="packages/core/src/generate.test.ts"/>',
      '    <testcase name="second" time="0.01" classname="test" file="workflow-scripts/check.test.mjs"/>',
      "    <!-- tests 2 -->",
      "  </testsuite>",
      "</testsuites>",
    ].join("\n"),
  );
});

test("keeps already wrapped junit reports unchanged", () => {
  const xml = [
    "<testsuites>",
    '  <testsuite name="node:test">',
    '    <testcase name="first" time="1.23" classname="test" file="packages/core/src/generate.test.ts"/>',
    "  </testsuite>",
    "</testsuites>",
  ].join("\n");

  assert.equal(wrapRootNodeTestCasesInTestSuite(xml), xml);
});

test("normalizes node --test reports for parallel-test-action", () => {
  const xml = [
    '<?xml version="1.0" encoding="utf-8"?>',
    "<testsuites>",
    '  <testcase name="first" time="1.23" classname="test" file="repo/packages/core/dist/generate.test.js"/>',
    "</testsuites>",
  ].join("\n");

  const normalized = normalizeNodeTestJUnitReport(xml);

  assert.match(normalized, /<testsuite name="node:test">/);
  assert.match(normalized, /file="packages\/core\/src\/generate\.test\.ts"/);
});
