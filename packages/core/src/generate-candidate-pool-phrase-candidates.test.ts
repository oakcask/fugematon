import assert from "node:assert/strict";
import test from "node:test";
import { REVIEW_LENGTH_TICKS } from "./constants.js";
import { cachedGenerateScore as generateScore } from "./generate-test-helpers.js";

function assertPhraseFamilyCandidatesTraceable(reviewSeeds: readonly string[]) {
  for (const seed of reviewSeeds) {
    const output = generateScore({
      seed,
      lengthTicks: REVIEW_LENGTH_TICKS,
      selectionModel: "section-local-planner",
    });
    const oracle = output.diagnostics.candidatePoolOracle;

    assert.equal(oracle.schemaVersion, 5);
    assert.ok(oracle.phraseFamilyCandidateCount > 0);
    assert.ok(oracle.candidateCount > oracle.phraseFamilyCandidateCount);

    for (const blocker of oracle.blockerClassifications) {
      assert.ok(blocker.representative.phraseFamilyCandidateCount > 0);
      assert.ok(blocker.representative.selectedCandidateIndex < blocker.representative.candidateCount);
    }
  }
}

test("generateScore keeps phrase family candidates traceable when selectable", () => {
  assertPhraseFamilyCandidatesTraceable(["angular-answer", "modal-dorian", "modal-answer"]);
});
