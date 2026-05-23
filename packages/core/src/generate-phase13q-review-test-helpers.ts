import assert from "node:assert/strict";
import { REVIEW_LENGTH_TICKS } from "./constants.js";
import type { CandidatePoolOracleBlocker } from "./events.js";
import { generateScore } from "./generate.js";
import { evaluateReviewGatePolicy } from "./review-gate.js";

export function assertPhase13QAdoptionSeedsReady(seeds: readonly string[]): void {
  const expectedBlockers: readonly CandidatePoolOracleBlocker[] = [
    "entry-harmony",
    "voice-pair-lockstep",
    "melody-leap-recovery",
  ];

  for (const seed of seeds) {
    const baseline = generateScore({
      seed,
      lengthTicks: REVIEW_LENGTH_TICKS,
      selectionModel: "candidate-oracle-selection",
    });
    const variant = generateScore({
      seed,
      lengthTicks: REVIEW_LENGTH_TICKS,
      selectionModel: "section-local-planner",
    });
    const repeated = generateScore({
      seed,
      lengthTicks: REVIEW_LENGTH_TICKS,
      selectionModel: "section-local-planner",
    });
    const gate = evaluateReviewGatePolicy(seed, variant.diagnostics);
    const oracle = variant.diagnostics.candidatePoolOracle;
    const blockerNames = new Set(oracle.blockerClassifications.map((blocker) => blocker.blocker));
    const phase13QBlockers = oracle.blockerClassifications.filter((blocker) =>
      expectedBlockers.includes(blocker.blocker),
    );

    assert.deepEqual(repeated.events, variant.events);
    assert.deepEqual(repeated.diagnostics, variant.diagnostics);
    assert.equal(gate.adoptionReady, true);
    assert.equal(gate.hardConstraintPassed, true);
    assert.deepEqual(gate.hardFailures, []);
    assert.equal(oracle.schemaVersion, 5);
    assert.ok(
      oracle.candidateDiversity.some((facet) => facet.selectionHasViableAlternative) ||
        phase13QBlockers.some((blocker) => blocker.generatorNeededRate > 0),
    );
    assert.ok(expectedBlockers.some((blocker) => blockerNames.has(blocker)));
    assert.ok(
      variant.diagnostics.phraseRepetitionReview.sectionStatePatterns.mostRepeatedPatternCount <=
        baseline.diagnostics.phraseRepetitionReview.sectionStatePatterns.mostRepeatedPatternCount,
    );
    assert.ok(
      variant.diagnostics.phraseRepetitionReview.sectionStatePatterns.uniquePatternCount >=
        baseline.diagnostics.phraseRepetitionReview.sectionStatePatterns.uniquePatternCount,
    );
  }
}
