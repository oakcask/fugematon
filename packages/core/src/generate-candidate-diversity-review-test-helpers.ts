import assert from "node:assert/strict";
import { REVIEW_LENGTH_TICKS } from "./constants.js";
import { cachedGenerateScore as generateScore } from "./generate-test-helpers.js";

export function assertCandidateDiversityReviewSeedsReady(seeds: readonly string[]): void {
  for (const seed of seeds) {
    const output = generateScore({
      seed,
      lengthTicks: REVIEW_LENGTH_TICKS,
      selectionModel: "section-local-planner",
    });
    const oracle = output.diagnostics.candidatePoolOracle;

    assert.equal(oracle.schemaVersion, 5);
    assert.equal(oracle.candidateDiversity.length, 7);
    assert.ok(oracle.candidateDiversity.every((facet) => facet.candidateCount >= facet.viableCandidateCount));
    assert.ok(oracle.candidateDiversity.every((facet) => facet.uniqueValueCount > 0));
    assert.ok(oracle.candidateDiversity.every((facet) => facet.values.length > 0));
    assert.ok(oracle.candidateDiversity.some((facet) => facet.viableUniqueValueCount > 1));
    assert.ok(oracle.blockerClassifications.length > 0);
    assert.ok(
      oracle.blockerClassifications.some(
        (blocker) =>
          blocker.blocker === "entry-harmony" ||
          blocker.blocker === "voice-pair-lockstep" ||
          blocker.blocker === "melody-leap-recovery",
      ),
    );
  }
}
