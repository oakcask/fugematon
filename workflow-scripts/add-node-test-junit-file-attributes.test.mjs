import assert from "node:assert/strict";
import test from "node:test";
import { normalizeNodeTestJUnitFileAttributes } from "./add-node-test-junit-file-attributes.mjs";

test("normalizes existing node --test package file attributes to source test files", () => {
  const xml = [
    '<testsuite name="node:test">',
    '  <testcase name="keeps metadata" time="1.23" classname="test" file="/workspace/project/packages/core/dist/generate.test.js"/>',
    "</testsuite>",
  ].join("\n");

  assert.match(normalizeNodeTestJUnitFileAttributes(xml), /file="packages\/core\/src\/generate\.test\.ts"/);
});

test("normalizes existing workflow script test file attributes to relative files", () => {
  const xml = [
    '<testsuite name="node:test">',
    '  <testcase name="normalizes reports" time="0.01" classname="test" file="/workspace/project/workflow-scripts/add-node-test-junit-file-attributes.test.mjs"/>',
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
