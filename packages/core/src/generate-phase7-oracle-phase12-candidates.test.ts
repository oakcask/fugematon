import assert from "node:assert/strict";
import test from "node:test";
import { PHASE_5_LENGTH_TICKS } from "./constants.js";
import { generateScore } from "./generate.js";

test("generateScore keeps phase-12 phrase family candidates traceable when selectable", () => {
  const reviewSeeds = ["angular-answer", "modal-dorian", "modal-answer", "modal-cadence", "dense-modal"] as const;

  for (const seed of reviewSeeds) {
    const output = generateScore({
      seed,
      lengthTicks: PHASE_5_LENGTH_TICKS,
      selectionModel: "section-local-planner",
    });
    const oracle = output.diagnostics.candidatePoolOracle;

    assert.equal(oracle.schemaVersion, 5);
    assert.ok(oracle.phase12PhraseFamilyCandidateCount > 0);
    assert.ok(oracle.candidateCount > oracle.phase12PhraseFamilyCandidateCount);

    for (const blocker of oracle.blockerClassifications) {
      assert.ok(blocker.representative.phase12PhraseFamilyCandidateCount > 0);
      assert.ok(blocker.representative.selectedCandidateIndex < blocker.representative.candidateCount);
    }
  }
});
