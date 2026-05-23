import assert from "node:assert/strict";
import test from "node:test";
import { PHASE_5_DIAGNOSTICS_PROFILE, REPRESENTATIVE_REVIEW_SEEDS, REVIEW_LENGTH_TICKS } from "./constants.js";
import { generateScore } from "./generate.js";
import { scoreMinutes } from "./generate-test-helpers.js";

test("generateScore validates phase-5 quality gate seeds", () => {
  const signatures = new Set<string>();

  for (const { seed } of REPRESENTATIVE_REVIEW_SEEDS) {
    const output = generateScore({ seed, lengthTicks: REVIEW_LENGTH_TICKS, selectionModel: "baseline" });
    const totalMinutes = scoreMinutes(output.diagnostics.generatedUntilTick);
    const maxLeapRecoveryMisses = Math.ceil(totalMinutes * PHASE_5_DIAGNOSTICS_PROFILE.maxLeapRecoveryMissesPerMinute);

    assert.equal(output.diagnostics.rangeViolations, PHASE_5_DIAGNOSTICS_PROFILE.rangeViolations);
    assert.equal(output.diagnostics.voiceCrossings, PHASE_5_DIAGNOSTICS_PROFILE.voiceCrossings);
    assert.equal(output.diagnostics.subjectIdentityViolations, PHASE_5_DIAGNOSTICS_PROFILE.subjectIdentityViolations);
    assert.equal(output.diagnostics.answerPlanViolations, PHASE_5_DIAGNOSTICS_PROFILE.answerPlanViolations);
    assert.equal(output.diagnostics.keyMetadataMismatches, PHASE_5_DIAGNOSTICS_PROFILE.keyMetadataMismatches);
    assert.ok(output.diagnostics.counterSubjectCoverage >= PHASE_5_DIAGNOSTICS_PROFILE.minCounterSubjectCoverage);
    assert.ok(output.diagnostics.freeCounterpointCoverage >= PHASE_5_DIAGNOSTICS_PROFILE.minFreeCounterpointCoverage);
    assert.equal(output.diagnostics.fallbackPassageCount, PHASE_5_DIAGNOSTICS_PROFILE.fallbackPassageCount);
    assert.ok(output.diagnostics.melodicStagnationWarnings <= PHASE_5_DIAGNOSTICS_PROFILE.maxMelodicStagnationWarnings);
    assert.ok(output.diagnostics.leapRecoveryMisses <= maxLeapRecoveryMisses);
    assert.equal(
      output.diagnostics.unresolvedDissonanceCount,
      PHASE_5_DIAGNOSTICS_PROFILE.maxUnresolvedDissonanceCount,
    );
    assert.equal(output.diagnostics.strongBeatDissonanceCount, output.diagnostics.harmonicFunctionMismatches);
    assert.equal(output.diagnostics.cadenceTargetMisses, PHASE_5_DIAGNOSTICS_PROFILE.cadenceTargetMisses);
    assert.equal(
      output.diagnostics.leadingToneResolutionMisses,
      PHASE_5_DIAGNOSTICS_PROFILE.leadingToneResolutionMisses,
    );
    assert.equal(output.diagnostics.dominantResolutionMisses, PHASE_5_DIAGNOSTICS_PROFILE.dominantResolutionMisses);
    assert.equal(output.diagnostics.predominantDirectionMisses, PHASE_5_DIAGNOSTICS_PROFILE.predominantDirectionMisses);
    assert.ok(output.diagnostics.harmonicFunctionMismatches >= PHASE_5_DIAGNOSTICS_PROFILE.harmonicFunctionMismatches);
    assert.ok(output.diagnostics.controlledAmbiguityScore >= PHASE_5_DIAGNOSTICS_PROFILE.minControlledAmbiguityScore);
    assert.equal(
      output.diagnostics.unresolvedAmbiguityWarnings,
      PHASE_5_DIAGNOSTICS_PROFILE.maxUnresolvedAmbiguityWarnings,
    );
    assert.ok(output.diagnostics.styleModulationFit >= PHASE_5_DIAGNOSTICS_PROFILE.minStyleModulationFit);
    assert.equal(output.diagnostics.formRepetitionWarnings, PHASE_5_DIAGNOSTICS_PROFILE.maxFormRepetitionWarnings);
    assert.ok(output.diagnostics.episodeDirectionScore >= PHASE_5_DIAGNOSTICS_PROFILE.minEpisodeDirectionScore);
    assert.ok(output.diagnostics.strettoClarityScore >= PHASE_5_DIAGNOSTICS_PROFILE.minStrettoClarityScore);
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
