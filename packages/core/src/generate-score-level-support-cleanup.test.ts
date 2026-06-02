import assert from "node:assert/strict";
import test from "node:test";
import { TICKS_PER_QUARTER } from "./constants.js";
import { generateScore } from "./generate.js";

test("score-level support cleanup emits paired before and after trace evidence", () => {
  const diagnostics = generateScore({
    seed: "angular-answer",
    lengthTicks: TICKS_PER_QUARTER * 288,
  }).diagnostics;
  const candidateIds = new Set(diagnostics.generatorSearchTrace.candidates.map((candidate) => candidate.candidateId));

  for (const surface of [
    "functional-thinning-support",
    "post-entry-continuation-support",
    "long-rest-phrase-closure",
    "bass-answer-tail-texture-support",
  ] as const) {
    assert.ok(candidateIds.has(`score-${surface}-unrepaired-final-repair-evidence`));
    assert.ok(candidateIds.has(`score-${surface}-solver-repaired`));
  }
  assert.equal(hardConstraintFailures(diagnostics), 0);
});

function hardConstraintFailures(diagnostics: ReturnType<typeof generateScore>["diagnostics"]): number {
  return (
    diagnostics.rangeViolations +
    diagnostics.voiceCrossings +
    diagnostics.subjectIdentityViolations +
    diagnostics.answerPlanViolations +
    diagnostics.keyMetadataMismatches
  );
}
