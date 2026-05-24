import assert from "node:assert/strict";
import test from "node:test";
import { REPRESENTATIVE_REVIEW_SEEDS, REVIEW_LENGTH_TICKS, ROTATION_REVIEW_SEEDS } from "./constants.js";
import { generateScore } from "./generate.js";
import { evaluateContourMotionGate, evaluateMelodyTextureGate } from "./review-gate.js";

test("generateScore reduces stepwise fifth-climb subject pressure", () => {
  const seeds = [...REPRESENTATIVE_REVIEW_SEEDS, ...ROTATION_REVIEW_SEEDS];
  const exactStepwiseFifthClimbPattern = "0-1-2-3-4-3-2-1";
  const turnbackFifthClimbPattern = "0-1-2-3-4-3-1-2";
  let exactStepwiseFifthClimbCount = 0;
  let turnbackFifthClimbCount = 0;
  let turnbackFifthClimbSevereIntervalCount = 0;
  let turnbackFifthClimbUnresolvedSevereIntervalCount = 0;

  for (const { seed } of seeds) {
    const output = generateScore({ seed, lengthTicks: REVIEW_LENGTH_TICKS, selectionModel: "baseline" });
    const gate6 = evaluateMelodyTextureGate(seed, output.diagnostics);
    const gate7 = evaluateContourMotionGate(seed, output.diagnostics);
    const subjectPattern = output.diagnostics.subjectEntries[0]?.expectedDegreePattern.join("-");

    if (subjectPattern === exactStepwiseFifthClimbPattern) {
      exactStepwiseFifthClimbCount += 1;
    }
    if (subjectPattern === turnbackFifthClimbPattern) {
      turnbackFifthClimbCount += 1;
      turnbackFifthClimbSevereIntervalCount += output.diagnostics.severeEntryIntervalCount;
      turnbackFifthClimbUnresolvedSevereIntervalCount += output.diagnostics.unresolvedSevereEntryIntervalCount;
    }

    assert.deepEqual(gate6.failures, []);
    assert.deepEqual(gate7.failures, []);
    assert.equal(gate6.passed, true);
    assert.equal(gate7.passed, true);
  }

  assert.equal(exactStepwiseFifthClimbCount, 3);
  assert.equal(turnbackFifthClimbCount, 9);
  assert.ok(turnbackFifthClimbSevereIntervalCount <= 858);
  assert.ok(turnbackFifthClimbUnresolvedSevereIntervalCount <= 582);
});
