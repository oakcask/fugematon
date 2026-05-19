import assert from "node:assert/strict";
import test from "node:test";
import { PHASE_5_LENGTH_TICKS } from "./constants.js";
import { generateScore } from "./generate.js";
import { PHASE_13_FOCUSED_SEEDS } from "./generate-phase-review-test-helpers.js";

test("generateScore keeps phase-13Q focused seeds ready for candidate-diversity review", () => {
  for (const seed of PHASE_13_FOCUSED_SEEDS) {
    const output = generateScore({
      seed,
      lengthTicks: PHASE_5_LENGTH_TICKS,
      selectionModel: "phase10-section-local-planner",
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
});
