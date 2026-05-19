import assert from "node:assert/strict";
import test from "node:test";
import { PHASE_5_LENGTH_TICKS } from "./constants.js";
import type { CandidatePoolOracleBlocker } from "./events.js";
import { generateScore } from "./generate.js";
import { PHASE_13_FOCUSED_SEEDS, PHASE_13Q_FOCUSED_SEEDS } from "./generate-phase-review-test-helpers.js";
import { evaluatePhase7BGatePolicy } from "./review-gate.js";

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

test("generateScore keeps phase-13Q adoption seed batch A ready for generator-side quality work", () => {
  assertPhase13QAdoptionSeedsReady(PHASE_13Q_FOCUSED_SEEDS.slice(0, 6));
});

test("generateScore keeps phase-13Q adoption seed batch B ready for generator-side quality work", () => {
  assertPhase13QAdoptionSeedsReady(PHASE_13Q_FOCUSED_SEEDS.slice(6));
});

function assertPhase13QAdoptionSeedsReady(seeds: readonly string[]): void {
  const expectedBlockers: readonly CandidatePoolOracleBlocker[] = [
    "entry-harmony",
    "voice-pair-lockstep",
    "melody-leap-recovery",
  ];

  for (const seed of seeds) {
    const baseline = generateScore({
      seed,
      lengthTicks: PHASE_5_LENGTH_TICKS,
      selectionModel: "phase10-oracle-selection",
    });
    const variant = generateScore({
      seed,
      lengthTicks: PHASE_5_LENGTH_TICKS,
      selectionModel: "phase10-section-local-planner",
    });
    const repeated = generateScore({
      seed,
      lengthTicks: PHASE_5_LENGTH_TICKS,
      selectionModel: "phase10-section-local-planner",
    });
    const gate = evaluatePhase7BGatePolicy(seed, variant.diagnostics);
    const oracle = variant.diagnostics.candidatePoolOracle;
    const blockerNames = new Set(oracle.blockerClassifications.map((blocker) => blocker.blocker));
    const phase13QBlockers = oracle.blockerClassifications.filter((blocker) =>
      expectedBlockers.includes(blocker.blocker),
    );

    assert.deepEqual(repeated.events, variant.events);
    assert.deepEqual(repeated.diagnostics, variant.diagnostics);
    assert.equal(gate.phase8Ready, true);
    assert.equal(gate.hardConstraintPassed, true);
    assert.deepEqual(gate.hardFailures, []);
    assert.equal(oracle.schemaVersion, 5);
    assert.ok(
      oracle.candidateDiversity.some((facet) => facet.selectionHasViableAlternative) ||
        phase13QBlockers.some((blocker) => blocker.generatorNeededRate > 0),
    );
    assert.ok(expectedBlockers.some((blocker) => blockerNames.has(blocker)));
    assert.ok(
      variant.diagnostics.phase12Review.sectionStatePatterns.mostRepeatedPatternCount <=
        baseline.diagnostics.phase12Review.sectionStatePatterns.mostRepeatedPatternCount,
    );
    assert.ok(
      variant.diagnostics.phase12Review.sectionStatePatterns.uniquePatternCount >=
        baseline.diagnostics.phase12Review.sectionStatePatterns.uniquePatternCount,
    );
  }
}

test("generateScore links unresolved entry sentinels to selected entry context and deadlines", () => {
  const output = generateScore({
    seed: "modal-cadence",
    lengthTicks: PHASE_5_LENGTH_TICKS,
    selectionModel: "phase10-section-local-planner",
  });
  const unresolvedEntrySentinels = output.diagnostics.qualityVector.localSentinels.filter(
    (sentinel) => sentinel.kind === "unresolved-entry-severe-interval",
  );
  const unresolvedEntryLinks = output.diagnostics.phase13QReview.sentinelCandidateLinks.filter(
    (link) => link.sentinelKind === "unresolved-entry-severe-interval",
  );

  assert.ok(unresolvedEntrySentinels.length > 0);
  assert.equal(unresolvedEntryLinks.length, unresolvedEntrySentinels.length);
  assert.ok(unresolvedEntryLinks.every((link) => link.voice !== undefined));
  assert.ok(unresolvedEntryLinks.every((link) => link.entryForm !== undefined));
  assert.ok(unresolvedEntryLinks.every((link) => link.entryStartTick !== undefined));
  assert.ok(unresolvedEntryLinks.every((link) => link.resolutionDeadlineTicks !== undefined));
  assert.ok(
    unresolvedEntryLinks.every(
      (link) =>
        link.sectionStartTick <= link.sentinelStartTick &&
        link.sentinelStartTick < link.sectionStartTick + link.sectionDurationTicks,
    ),
  );
});

test("generateScore exposes phase-13Q quality-vector features in selected candidate evaluations", () => {
  const output = generateScore({
    seed: "modal-cadence",
    lengthTicks: PHASE_5_LENGTH_TICKS,
    selectionModel: "phase10-section-local-planner",
  });
  const selected = output.diagnostics.selectedCandidateEvaluations.at(-1);

  assert.ok(selected !== undefined);
  assert.equal(typeof selected.dimensions.texture.features.qualityVectorPitchClassUnisonDuration, "number");
  assert.equal(typeof selected.dimensions.texture.features.qualityVectorDurationBasedLockstep, "number");
  assert.equal(
    typeof selected.dimensions.harmony.features.qualityVectorUnresolvedEntrySevereIntervalDuration,
    "number",
  );
  assert.ok(Number.isFinite(selected.dimensions.texture.features.qualityVectorPitchClassUnisonDuration));
  assert.ok(Number.isFinite(selected.dimensions.texture.features.qualityVectorDurationBasedLockstep));
  assert.ok(Number.isFinite(selected.dimensions.harmony.features.qualityVectorUnresolvedEntrySevereIntervalDuration));
});
