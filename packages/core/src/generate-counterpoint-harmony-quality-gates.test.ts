import assert from "node:assert/strict";
import test from "node:test";
import {
  COUNTERPOINT_HARMONY_DIAGNOSTICS_PROFILE,
  REPRESENTATIVE_REVIEW_SEEDS,
  REVIEW_LENGTH_TICKS,
} from "./constants.js";
import { cachedGenerateScore as generateScore, scoreMinutes } from "./generate-test-helpers.js";

test("generateScore validates counterpoint-harmony quality gate seeds", () => {
  const signatures = new Set<string>();

  for (const { seed } of REPRESENTATIVE_REVIEW_SEEDS) {
    const output = generateScore({ seed, lengthTicks: REVIEW_LENGTH_TICKS, selectionModel: "baseline" });
    const totalMinutes = scoreMinutes(output.diagnostics.generatedUntilTick);
    const maxLeapRecoveryMisses = Math.ceil(
      totalMinutes * COUNTERPOINT_HARMONY_DIAGNOSTICS_PROFILE.maxLeapRecoveryMissesPerMinute,
    );

    assert.equal(output.diagnostics.rangeViolations, COUNTERPOINT_HARMONY_DIAGNOSTICS_PROFILE.rangeViolations);
    assert.equal(output.diagnostics.voiceCrossings, COUNTERPOINT_HARMONY_DIAGNOSTICS_PROFILE.voiceCrossings);
    assert.equal(
      output.diagnostics.subjectIdentityViolations,
      COUNTERPOINT_HARMONY_DIAGNOSTICS_PROFILE.subjectIdentityViolations,
    );
    assert.equal(
      output.diagnostics.answerPlanViolations,
      COUNTERPOINT_HARMONY_DIAGNOSTICS_PROFILE.answerPlanViolations,
    );
    assert.equal(
      output.diagnostics.keyMetadataMismatches,
      COUNTERPOINT_HARMONY_DIAGNOSTICS_PROFILE.keyMetadataMismatches,
    );
    assert.ok(
      output.diagnostics.counterSubjectCoverage >= COUNTERPOINT_HARMONY_DIAGNOSTICS_PROFILE.minCounterSubjectCoverage,
    );
    assert.ok(
      output.diagnostics.freeCounterpointCoverage >=
        COUNTERPOINT_HARMONY_DIAGNOSTICS_PROFILE.minFreeCounterpointCoverage,
    );
    assert.equal(
      output.diagnostics.fallbackPassageCount,
      COUNTERPOINT_HARMONY_DIAGNOSTICS_PROFILE.fallbackPassageCount,
    );
    assert.ok(
      output.diagnostics.melodicStagnationWarnings <=
        COUNTERPOINT_HARMONY_DIAGNOSTICS_PROFILE.maxMelodicStagnationWarnings,
    );
    assert.ok(output.diagnostics.leapRecoveryMisses <= maxLeapRecoveryMisses);
    assert.equal(
      output.diagnostics.unresolvedDissonanceCount,
      COUNTERPOINT_HARMONY_DIAGNOSTICS_PROFILE.maxUnresolvedDissonanceCount,
    );
    assert.equal(output.diagnostics.strongBeatDissonanceCount, output.diagnostics.harmonicFunctionMismatches);
    assert.equal(output.diagnostics.cadenceTargetMisses, COUNTERPOINT_HARMONY_DIAGNOSTICS_PROFILE.cadenceTargetMisses);
    assert.equal(
      output.diagnostics.leadingToneResolutionMisses,
      COUNTERPOINT_HARMONY_DIAGNOSTICS_PROFILE.leadingToneResolutionMisses,
    );
    assert.equal(
      output.diagnostics.dominantResolutionMisses,
      COUNTERPOINT_HARMONY_DIAGNOSTICS_PROFILE.dominantResolutionMisses,
    );
    assert.equal(
      output.diagnostics.predominantDirectionMisses,
      COUNTERPOINT_HARMONY_DIAGNOSTICS_PROFILE.predominantDirectionMisses,
    );
    assert.ok(
      output.diagnostics.harmonicFunctionMismatches >=
        COUNTERPOINT_HARMONY_DIAGNOSTICS_PROFILE.harmonicFunctionMismatches,
    );
    assert.ok(
      output.diagnostics.controlledAmbiguityScore >=
        COUNTERPOINT_HARMONY_DIAGNOSTICS_PROFILE.minControlledAmbiguityScore,
    );
    assert.equal(
      output.diagnostics.unresolvedAmbiguityWarnings,
      COUNTERPOINT_HARMONY_DIAGNOSTICS_PROFILE.maxUnresolvedAmbiguityWarnings,
    );
    assert.ok(output.diagnostics.styleModulationFit >= COUNTERPOINT_HARMONY_DIAGNOSTICS_PROFILE.minStyleModulationFit);
    assert.equal(
      output.diagnostics.formRepetitionWarnings,
      COUNTERPOINT_HARMONY_DIAGNOSTICS_PROFILE.maxFormRepetitionWarnings,
    );
    assert.ok(
      output.diagnostics.episodeDirectionScore >= COUNTERPOINT_HARMONY_DIAGNOSTICS_PROFILE.minEpisodeDirectionScore,
    );
    assert.ok(
      output.diagnostics.strettoClarityScore >= COUNTERPOINT_HARMONY_DIAGNOSTICS_PROFILE.minStrettoClarityScore,
    );
    assert.ok(output.diagnostics.cadenceTargetHits > 0);
    assert.ok(output.diagnostics.harmonicFunctionMatches > 0);
    assert.ok(output.diagnostics.sectionPlans.some((plan) => plan.state === "episode" && plan.targetKey));
    assert.ok(output.diagnostics.sectionPlans.some((plan) => plan.state === "subject-return" && plan.cadenceKind));

    signatures.add(
      output.diagnostics.sectionPlans
        .filter((plan) => plan.state !== "exposition")
        .slice(0, 6)
        .map((plan) => `${plan.state}:${plan.durationTicks}:${plan.targetKey.tonic}`)
        .join("|"),
    );
  }

  assert.ok(signatures.size > 1);
});
